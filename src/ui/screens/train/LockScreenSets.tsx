import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  applyParkedTaps, buildLockScreenPlan, readLockScreenPrefs, writeLockScreenPrefs, type LockScreenPrefs, type PlannedSet,
} from "../../../application/lockScreenSets";
import type { WorkoutSession } from "../../../domain/common/types";
import type { PerformedSet } from "../../../domain/workout/types";
import { requestCheckInNotificationPermission } from "../../../persistence/checkInReminder";

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001 (Gavin, 2026-11-24): the LOCK SCREEN switch on the live workout, and the glue to
 * BEYOND's service worker (public/lockscreen-sw.js). BEYOND sends the worker the plan on start, after every set and
 * rest change, and closes it on finish. Each time BEYOND comes back into view (or the worker says a tap landed), it
 * applies parked lock-screen taps through logSet / skipSet first.
 *
 * An object, so tests can watch `post` without a real service worker.
 */
export const lockScreenWorker = {
  post(message: unknown): void {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    void navigator.serviceWorker.ready.then((r) => r.active?.postMessage(message)).catch(() => {});
  },
};

const home = () => new URL(import.meta.env.BASE_URL ?? "./", window.location.origin).href;

export interface LockScreenSetsState {
  prefs: LockScreenPrefs;
  notice: string | null;
  setOn: (on: boolean) => Promise<void>;
  setShowSkip: (show: boolean) => void;
}

export function useLockScreenSets({ session, sets, planned, onApplied }: {
  session: WorkoutSession | null;
  sets: readonly PerformedSet[];
  planned: readonly PlannedSet[];
  onApplied: () => Promise<void> | void;
}): LockScreenSetsState {
  const [prefs, setPrefs] = useState(readLockScreenPrefs);
  const [notice, setNotice] = useState<string | null>(null);
  const appliedRef = useRef(onApplied);
  appliedRef.current = onApplied;
  const forceRef = useRef(false);

  // Parked taps first: on open, when BEYOND comes back into view, and when the worker says a tap landed.
  useEffect(() => {
    let running = false;
    const apply = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const { applied, dropped } = await applyParkedTaps();
        if (applied + dropped > 0) await appliedRef.current();
      } catch { /* the taps stay parked for the next try */ } finally { running = false; }
    };
    void apply();
    const onVisible = () => { void apply(); };
    const onMessage = (e: MessageEvent) => { if ((e.data as { type?: string } | null)?.type === "beyond-lockscreen-tap") void apply(); };
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => { document.removeEventListener("visibilitychange", onVisible); navigator.serviceWorker?.removeEventListener("message", onMessage); };
  }, []);

  // The plan, sent (gently debounced) whenever what the LOG button would save changes.
  const planKey = session && prefs.on
    ? JSON.stringify([session.id, session.activeRestEndsAt ?? null, prefs.showSkip, planned, sets.map((s) => [s.exerciseId, s.setNumber, s.setKind ?? ""])])
    : null;
  const latest = useRef({ session, sets, planned, prefs });
  latest.current = { session, sets, planned, prefs };
  useEffect(() => {
    if (planKey === null) return;
    const timer = setTimeout(() => {
      const { session: s, sets: recorded, planned: p, prefs: pr } = latest.current;
      if (!s) return;
      const plan = buildLockScreenPlan({ session: s, planned: p, recorded, home: home(), showSkip: pr.showSkip });
      lockScreenWorker.post({ type: "beyond-lockscreen", op: "show", plan, ...(forceRef.current ? { force: true } : {}) });
      forceRef.current = false;
    }, 300);
    return () => clearTimeout(timer);
  }, [planKey]);

  // Ends with the workout: finishing or stopping it (no live session any more) closes the notification.
  const hadSession = useRef(false);
  useEffect(() => {
    if (session) { hadSession.current = true; return; }
    if (hadSession.current && prefs.on) lockScreenWorker.post({ type: "beyond-lockscreen", op: "close" });
    hadSession.current = false;
  }, [session, prefs.on]);

  const setOn = useCallback(async (on: boolean) => {
    setNotice(null);
    if (on) {
      if (typeof Notification === "undefined") { setNotice("This browser can't show notifications, so the lock screen stays empty."); return; }
      // Asked once, the first time; the phone remembers his answer after that.
      const permission = Notification.permission === "default" ? await requestCheckInNotificationPermission() : Notification.permission;
      if (permission !== "granted") { setNotice("Notifications are off for BEYOND. Allow them in your phone's settings, then turn this on."); return; }
      forceRef.current = true;
    } else lockScreenWorker.post({ type: "beyond-lockscreen", op: "close" });
    setPrefs((p) => { const next = { ...p, on }; writeLockScreenPrefs(next); return next; });
  }, []);

  const setShowSkip = useCallback((showSkip: boolean) => {
    setPrefs((p) => { const next = { ...p, showSkip }; writeLockScreenPrefs(next); return next; });
  }, []);

  return { prefs, notice, setOn, setShowSkip };
}

export function LockScreenSwitch({ state }: { state: LockScreenSetsState }) {
  const id = useId();
  const { prefs, notice, setOn, setShowSkip } = state;
  return <fieldset className="lockscreen-sets" aria-labelledby={`${id}-legend`} data-lockscreen-switch>
    <legend id={`${id}-legend`} className="section-label">LOCK SCREEN</legend>
    <label className="lockscreen-sets__option"><input type="checkbox" role="switch" checked={prefs.on} onChange={(e) => void setOn(e.target.checked)} />
      Show the current set on your lock screen</label>
    {prefs.on && <label className="lockscreen-sets__option"><input type="checkbox" checked={prefs.showSkip} onChange={(e) => setShowSkip(e.target.checked)} />
      SKIP button too</label>}
    {prefs.on && <p className="meta">DONE logs the set as planned here. Open BEYOND to change a weight.</p>}
    {notice && <p className="meta" role="status">{notice}</p>}
  </fieldset>;
}
