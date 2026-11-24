import { useEffect, useRef, useState } from "react";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../../application/keyMomentAlerts";
import type { KeyMomentAlertSettings, KeyMomentKind } from "../../../domain/common/types";
import { describeError } from "../../errorMessage";

/**
 * BRIDGE-NOTIFY-001 (Gavin, 2026-11-15; BEYOND-4.0 decision 5): each key-moment kind easy to turn off, and quiet
 * hours. Saved as soon as it's changed; the phone gets them with the plan at the next SYNC GARMIN. Each change applies to
 * the latest settings (not the last render) and saves run one after another, so quick taps never drop a change.
 * FOLLOWUPS-001 (review note N4): each change is a "set" (this kind off, quiet hours on), applied when its save runs to
 * what is actually stored. A failed save is dropped on its own: changes queued after it still save, without it, and
 * the screen goes back to what is stored plus those changes.
 */
const KINDS: { kind: KeyMomentKind; label: string; when: string }[] = [
  { kind: "BEFORE_SHIFT", label: "Before the shift", when: "30 minutes before it starts" },
  { kind: "SHIFT_DONE", label: "Shift's done", when: "At its end; the last of a run says days off start" },
  { kind: "TASK_DUE", label: "Task due", when: "16:00 on its day" },
  { kind: "WAKE", label: "Up for the shift", when: "3 hours before it starts" },
  // GRAYSON-WINDOW-ALERT-001: only fires once the Eating Window is on.
  { kind: "WINDOW_OPEN", label: "Eating window opens", when: "When your eating window opens, if the Eating Window is on. Lowest priority: on a day with three other alerts, this one waits." },
];
const DEFAULT_QUIET = { quietFrom: "08:00", quietTo: "14:00" };
type Update = (current: KeyMomentAlertSettings) => KeyMomentAlertSettings;

export function KeyMomentAlerts() {
  const [settings, setSettings] = useState<KeyMomentAlertSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const latest = useRef<KeyMomentAlertSettings | null>(null);
  const saved = useRef<KeyMomentAlertSettings | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef<Update[]>([]);
  useEffect(() => {
    let live = true;
    void getKeyMomentAlerts().then((s) => { if (live) { latest.current = s; saved.current = s; setSettings(s); } });
    return () => { live = false; };
  }, []);
  if (!settings) return null;

  function change(update: Update) {
    if (!latest.current) return;
    pending.current.push(update);
    latest.current = update(latest.current);
    setSettings(latest.current);
    saving.current = saving.current.then(async () => {
      if (!saved.current) return;
      try {
        // On what is stored, not on the screen's optimistic value: a failed earlier change is not carried along.
        saved.current = await setKeyMomentAlerts(update(saved.current));
        setStatus("Saved. Your phone gets it at the next SYNC GARMIN.");
        pending.current = pending.current.filter((u) => u !== update);
      } catch (e) {
        pending.current = pending.current.filter((u) => u !== update);
        // Back to what is stored, with the changes still queued on top of it.
        latest.current = pending.current.reduce((s, u) => u(s), saved.current);
        setSettings(latest.current);
        setStatus(describeError(e, "Could not save."));
      }
    });
  }
  const setKind = (kind: KeyMomentKind, on: boolean): Update => (s) =>
    on ? { ...s, off: s.off.filter((k) => k !== kind) } : s.off.includes(kind) ? s : { ...s, off: [...s.off, kind] };
  const quietOn = settings.quietFrom !== null && settings.quietTo !== null;

  return (
    <section aria-label="Key-moment alerts" style={{ marginTop: 24 }}>
      <p className="section-label">Key-moment alerts</p>
      <p className="meta" style={{ marginBottom: 8 }}>
        Health Bridge notifications, at most 3 a day. When a day has more, the earlier kinds in this list win.
        Nothing sounds during a shift of your standing rotation (swaps, overtime and corrected shift times aren't
        counted yet).
      </p>
      {KINDS.map(({ kind, label, when }) => {
        const on = !settings.off.includes(kind);
        return (
          <div className="card" key={kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h2 className="card-title">{label}</h2>
              <p className="meta">{when}</p>
            </div>
            <button
              type="button"
              className={`chip ${on ? "chip--selected" : ""}`}
              aria-pressed={on}
              aria-label={`${label} alert`}
              onClick={() => { if (latest.current) change(setKind(kind, latest.current.off.includes(kind))); }}
            >
              {on ? "ON" : "OFF"}
            </button>
          </div>
        );
      })}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 className="card-title">Quiet hours</h2>
            <p className="meta">No alerts in this window, every day.</p>
          </div>
          <button
            type="button"
            className={`chip ${quietOn ? "chip--selected" : ""}`}
            aria-pressed={quietOn}
            aria-label="Quiet hours"
            onClick={() => {
              const cur = latest.current;
              if (!cur) return;
              const turnOff = cur.quietFrom !== null && cur.quietTo !== null;
              change((s) => (turnOff ? { ...s, quietFrom: null, quietTo: null } : { ...s, ...DEFAULT_QUIET }));
            }}
          >
            {quietOn ? "ON" : "OFF"}
          </button>
        </div>
        {quietOn && (
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="meta">From</span>
              <input className="input" type="time" value={settings.quietFrom ?? ""} onChange={(e) => { const v = e.target.value; if (v) change((s) => ({ ...s, quietFrom: v })); }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="meta">Until</span>
              <input className="input" type="time" value={settings.quietTo ?? ""} onChange={(e) => { const v = e.target.value; if (v) change((s) => ({ ...s, quietTo: v })); }} />
            </label>
          </div>
        )}
      </div>
      {status && <p className="meta" role="status">{status}</p>}
    </section>
  );
}
