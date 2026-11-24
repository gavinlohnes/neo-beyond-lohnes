import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  advanceRunningPlan,
  correctRunningSession,
  endRunningSession,
  pauseRunningSession,
  resumeRunningSession,
  startRunningSession,
  undoRunningAdvance,
  voidRunningSession,
  type RunningAdvanceResult,
} from "../../../application/runningCommands";
import {
  getRunningHome,
  readRunningCuePreferences,
  runningElapsedSeconds,
  type RunningHistoryEntry,
  type RunningHome,
} from "../../../application/runningQueries";
import { ensureActiveDay } from "../../../application/commands";
import type { RunningEndReason, RunningSession } from "../../../domain/common/types";
import { currentSegment, describeRunningSegment, runningCueTimeline } from "../../../domain/workout/runningCues";
import { runningTotalSeconds } from "../../../domain/workout/runningPlan";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import { formatDate } from "../../formatDate";
import { RunningPlanEditor } from "./RunningPlanEditor";
import {
  describeRunningLength,
  describeRunningPosition,
  describeRunningWeek,
  formatRunningClock,
  RUNNING_FIRST_TIME,
  RUNNING_FOUNDATION_DONE,
  RUNNING_HISTORY_EMPTY,
  RUNNING_KIND_NAME,
  RUNNING_PAIN_LINE,
  RUNNING_SCREEN_ON,
  RUNNING_SEGMENT_LABEL,
  RUNNING_STATUS_LABEL,
} from "./trainCopy";
import "./running.css";

/**
 * GRAYSON-TRAIN-RUN-001 (Gavin, 2026-11-24): TRAIN's running card, the live run and the finish sheet.
 *
 * Timing lives in the domain: this screen only asks runningElapsedSeconds() (absolute timestamps) and
 * currentSegment()/runningCueTimeline() what to show, so a reload or a backgrounded tab always lands on the right
 * interval. The 250 ms tick only repaints. Nothing here advances the plan without his tap.
 */

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/** Keeps the screen awake while `on`, re-acquiring after the tab comes back (Gym mode's pattern). */
function useScreenAwake(on: boolean) {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!on || !nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let live = true;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      void nav.wakeLock!.request("screen").then((s) => {
        if (!live) { void s.release(); return; }
        void sentinel?.release().catch(() => {});
        sentinel = s;
      }).catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => { live = false; document.removeEventListener("visibilitychange", acquire); void sentinel?.release().catch(() => {}); };
  }, [on]);
}

interface FinishState { session: RunningSession; advanced: RunningAdvanceResult | null }

export function RunningPanel({ active, liftActive, onRunningChange }: {
  active: boolean;
  /** A lift workout is ACTIVE: no run can start (the command refuses too). */
  liftActive: boolean;
  /** True while a run is live or its finish sheet is open, so TRAIN can step its lift content aside. */
  onRunningChange: (running: boolean) => void;
}) {
  const [home, setHome] = useState<RunningHome | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finish, setFinish] = useState<FinishState | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const planButtonRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const refresh = useCallback(async () => {
    try { setHome(await getRunningHome()); setReadError(null); }
    catch (e) { setReadError(describeError(e, "Running couldn't be read. Nothing changed.")); }
  }, []);
  useEffect(() => { if (active) void refresh(); }, [active, refresh]);
  const running = Boolean(home?.active) || finish !== null;
  useEffect(() => { onRunningChange(running); }, [running, onRunningChange]);

  const act = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    setBusy(true); setError(null);
    try { return await fn(); }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); return undefined; }
    finally { setBusy(false); }
  };

  const end = async (reason: RunningEndReason) => {
    const session = home?.active;
    if (!session) return;
    const ended = await act(() => endRunningSession(session.id, reason));
    if (ended) { setFinish({ session: ended, advanced: null }); await refresh(); }
  };

  if (!active && !home) return null;
  if (readError) return <section className="card running-card" aria-label="Running"><p className="meta" role="alert">{readError}</p>
    <button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY</button></section>;
  if (!home) return <p className="meta" role="status">Reading your runs…</p>;

  if (finish) {
    return <RunningFinishSheet finish={finish} home={home} busy={busy} error={error}
      onMoveOn={async () => {
        const advanced = await act(() => advanceRunningPlan(finish.session.id));
        if (advanced) { feedback("MEDIUM"); setFinish({ ...finish, advanced }); await refresh(); }
      }}
      onUndo={async () => {
        if (!finish.advanced) return;
        const back = await act(() => undoRunningAdvance(finish.advanced!.eventId));
        if (back) { setFinish({ ...finish, advanced: null }); await refresh(); }
      }}
      onClose={() => { setFinish(null); setError(null); }} />;
  }

  if (home.active) return <RunningLive session={home.active} busy={busy} error={error}
    onPause={async () => { if (await act(() => pauseRunningSession(home.active!.id))) await refresh(); }}
    onResume={async () => { if (await act(() => resumeRunningSession(home.active!.id))) await refresh(); }}
    onEnd={end} />;

  if (planOpen) return <RunningPlanEditor home={home} onChanged={refresh} startDisabled={liftActive}
    onStart={async (position) => {
      const started = await act(async () => startRunningSession((await ensureActiveDay()).id, position));
      if (started) { feedback("MEDIUM"); setPlanOpen(false); await refresh(); }
      return Boolean(started);
    }}
    startError={error}
    onClose={() => { setPlanOpen(false); setError(null); requestAnimationFrame(() => planButtonRef.current?.focus()); }} />;

  const first = home.history.length === 0;
  return <section className="card running-card" aria-labelledby={headingId} data-running-card>
    <h3 id={headingId} className="section-label">RUNNING</h3>
    {home.done || !home.next
      ? <p className="card-body">{RUNNING_FOUNDATION_DONE}</p>
      : <p className="card-title running-card__next">Next run · {describeRunningPosition(home.next.position)} · {describeRunningLength(home.next.totalSeconds)}</p>}
    <p className="meta">{describeRunningWeek(home.week)}</p>
    {first && <p className="meta">{RUNNING_FIRST_TIME}</p>}
    {liftActive && <p className="meta">Finish or stop your workout to start a run.</p>}
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="running-card__acts">
      {home.next && !home.done && <button type="button" className="btn-primary" disabled={busy || liftActive} onClick={async () => {
        const started = await act(async () => startRunningSession((await ensureActiveDay()).id));
        if (started) { feedback("MEDIUM"); await refresh(); }
      }}>START RUN</button>}
      <button ref={planButtonRef} type="button" className="btn-secondary" onClick={() => setPlanOpen(true)}>PLAN</button>
    </div>
  </section>;
}

function RunningLive({ session, busy, error, onPause, onResume, onEnd }: {
  session: RunningSession; busy: boolean; error: string | null;
  onPause: () => void; onResume: () => void; onEnd: (reason: RunningEndReason) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [prefs] = useState(readRunningCuePreferences);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useScreenAwake(prefs.keepAwake);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const total = runningTotalSeconds(session.segments);
  const elapsed = runningElapsedSeconds(session, now);
  const position = currentSegment(session.segments, elapsed);
  const cues = runningCueTimeline(session.segments).filter((c) => prefs.halfway || c.cue !== "HALFWAY");
  const cueIndex = cues.reduce((found, c, i) => (c.atSecond <= elapsed ? i : found), -1);
  // The cue already passed when this screen opened (a reload mid-run) never buzzes again.
  const seenCue = useRef(cueIndex);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (cueIndex <= seenCue.current) return;
    seenCue.current = cueIndex;
    const cue = cues[cueIndex];
    if (!cue) return;
    setAnnounce(cue.text);
    if (prefs.buzz && cue.cue !== "FINISH") feedback("HEAVY");
  }, [cueIndex, cues, prefs.buzz]);

  // Reaching the end finishes the run (once).
  const endedRef = useRef(false);
  useEffect(() => {
    if (position === null && !endedRef.current) { endedRef.current = true; onEnd("FINISHED"); }
  }, [position, onEnd]);

  const next = position ? session.segments[position.index + 1] : undefined;
  const halfwayAt = runningCueTimeline(session.segments).find((c) => c.cue === "HALFWAY")?.atSecond;
  const paused = Boolean(session.pausedAt);

  return <section className="card running-live" aria-labelledby="running-live-title" data-running-live data-kind={position?.segment.kind ?? "DONE"}>
    <p className="meta running-live__where">{describeRunningPosition(session)} · {describeRunningLength(total)}</p>
    <h3 id="running-live-title" className="running-live__kind">{paused ? "PAUSED" : position ? RUNNING_SEGMENT_LABEL[position.segment.kind] : "DONE"}</h3>
    {position && <p className="running-live__left" aria-label={`${formatRunningClock(position.remaining)} left in this ${RUNNING_KIND_NAME[position.segment.kind].toLowerCase()}`}>{formatRunningClock(position.remaining)}</p>}
    <p className="running-live__total">{formatRunningClock(total - Math.min(total, elapsed))} left overall
      {prefs.halfway && halfwayAt !== undefined && elapsed >= halfwayAt && <span> · past halfway</span>}</p>
    {next && <p className="meta">Next: {describeRunningSegment(next)}</p>}
    <ol className="running-strip" aria-label="Intervals">
      {session.segments.map((s, i) => <li key={i} className={`running-strip__seg running-strip__seg--${s.kind.toLowerCase()}`}
        style={{ flexGrow: s.seconds }} aria-current={position?.index === i ? "step" : undefined}
        data-done={position ? i < position.index : true}>
        <span className="visually-hidden">{describeRunningSegment(s)}</span>
      </li>)}
    </ol>
    <p className="visually-hidden" aria-live="polite" role="status">{announce}</p>
    <p className="meta">{RUNNING_SCREEN_ON}</p>
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="running-live__acts">
      {paused
        ? <button type="button" className="btn-primary" disabled={busy} onClick={onResume}>RESUME</button>
        : <button type="button" className="btn-primary" disabled={busy} onClick={onPause}>PAUSE</button>}
      {confirmEnd
        ? <div className="running-live__confirm" role="group" aria-label="End the run early">
            <p className="meta">End now? It's saved as partial and you can repeat it.</p>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => onEnd("STOPPED")}>END RUN</button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmEnd(false)}>KEEP GOING</button>
          </div>
        : <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmEnd(true)}>END</button>}
      <button type="button" className="train-delta__pain running-live__pain" disabled={busy} onClick={() => onEnd("PAIN")}>PAIN OR SOMETHING WRONG</button>
    </div>
  </section>;
}

function RunningFinishSheet({ finish, home, busy, error, onMoveOn, onUndo, onClose }: {
  finish: FinishState; home: RunningHome; busy: boolean; error: string | null;
  onMoveOn: () => void; onUndo: () => void; onClose: () => void;
}) {
  const { session, advanced } = finish;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [advanced]);
  const total = runningTotalSeconds(session.segments);
  const where = describeRunningPosition(session);
  const completed = session.status === "COMPLETED";
  const nextInPlan = home.plan.plan.weeks[session.week - 1]?.[session.run]
    ? { week: session.week, run: session.run + 1 }
    : home.plan.plan.weeks[session.week] ? { week: session.week + 1, run: 1 } : null;

  return <section className="card running-finish" aria-labelledby="running-finish-title" data-running-finish>
    <h3 id="running-finish-title" ref={headingRef} tabIndex={-1} className="card-title">
      {advanced ? (advanced.done ? RUNNING_FOUNDATION_DONE : `Next: ${describeRunningPosition(advanced.to)}.`)
        : completed ? `${where} done.` : `${where} stopped at ${describeRunningLength(session.completedSeconds)} of ${describeRunningLength(total)}.`}
    </h3>
    {session.endReason === "PAIN" && !advanced && <p className="train-delta__line">{RUNNING_PAIN_LINE}</p>}
    {!completed && !advanced && <p className="meta">A partial run doesn't move the plan on. Repeat it when you're ready.</p>}
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="running-finish__acts">
      {advanced
        ? <>
            <button type="button" className="btn-secondary" disabled={busy} onClick={onUndo}>UNDO</button>
            <button type="button" className="btn-primary" onClick={onClose}>DONE</button>
          </>
        : <>
            {completed && <button type="button" className="btn-primary" disabled={busy} onClick={onMoveOn}>
              {nextInPlan ? `MOVE ON TO ${describeRunningPosition(nextInPlan).toUpperCase()}` : "FINISH THE FOUNDATION"}</button>}
            <button type="button" className={completed ? "btn-secondary" : "btn-primary"} disabled={busy} onClick={onClose}>REPEAT THIS RUN</button>
          </>}
    </div>
  </section>;
}

// ---- History ---------------------------------------------------------------------------------------------------

/** TRAIN history's running list: read-only rows, each with its own correct sheet. */
export function RunningHistory({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<RunningHistoryEntry[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setEntries((await getRunningHome()).history); setReadError(null); }
    catch (e) { setReadError(describeError(e, "Your runs couldn't be read. Nothing changed.")); }
  }, []);
  useEffect(() => { if (active) void refresh(); }, [active, refresh]);

  return <section aria-labelledby="running-history-heading" className="running-history">
    <h3 id="running-history-heading" className="section-label">Runs</h3>
    {readError ? <p className="meta" role="alert">{readError}</p>
      : entries === null ? <p className="meta">Loading…</p>
      : entries.length === 0 ? <p className="empty-state">{RUNNING_HISTORY_EMPTY}</p>
      : <ul className="record-cards">
          {entries.map((entry) => <li key={entry.id} className="card record-card">
            {openId === entry.id
              ? <RunningCorrectSheet entry={entry} onDone={async () => { setOpenId(null); await refresh(); requestAnimationFrame(() => document.getElementById(`running-row-${entry.id}`)?.focus()); }} />
              : <button id={`running-row-${entry.id}`} type="button" className="record-card__open" onClick={() => setOpenId(entry.id)}
                  aria-label={`${describeRunningPosition(entry)}, ${formatRunningDay(entry.dayDate)}. ${describeRunningFacts(entry)}. Correct this run`}>
                  <span className="record-card__head">
                    <span className="card-title">Run · {describeRunningPosition(entry)}</span>
                    <span className="record-card__date meta">{formatRunningDay(entry.dayDate)}</span>
                  </span>
                  <span className="card-body" style={{ display: "block", marginTop: 4 }}>{describeRunningFacts(entry)}</span>
                </button>}
          </li>)}
        </ul>}
  </section>;
}

/** A local YYYY-MM-DD day as "Mon, Nov 16" (never parsed as UTC). */
function formatRunningDay(dayDate: string): string {
  const [y, m, d] = dayDate.split("-").map(Number) as [number, number, number];
  return formatDate(new Date(y, m - 1, d), "en-US", { weekday: "short", month: "short", day: "numeric" });
}

function describeRunningFacts(entry: RunningHistoryEntry): string {
  const parts: string[] = [RUNNING_STATUS_LABEL[entry.status], `${Math.round(entry.completedSeconds / 60)} min`];
  if (entry.endReason === "PAIN" && !entry.corrected) parts.push("stopped for pain");
  if (entry.corrected) parts.push("corrected");
  return parts.join(" · ");
}

function RunningCorrectSheet({ entry, onDone }: { entry: RunningHistoryEntry; onDone: () => void }) {
  const [status, setStatus] = useState<"COMPLETED" | "PARTIAL">(entry.status === "COMPLETED" ? "COMPLETED" : "PARTIAL");
  const [minutes, setMinutes] = useState(String(Math.round(entry.completedSeconds / 60)));
  const [dayDate, setDayDate] = useState(entry.dayDate);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);

  const save = async () => {
    const m = Number(minutes);
    if (minutes.trim() === "" || !Number.isInteger(m) || m < 0) { setError("Enter whole minutes from 0."); return; }
    setBusy(true); setError(null);
    try {
      await correctRunningSession(entry.id, {
        ...(status !== entry.status ? { status } : {}),
        ...(m !== Math.round(entry.completedSeconds / 60) ? { completedSeconds: m * 60 } : {}),
        ...(dayDate !== entry.dayDate ? { dayDate } : {}),
      });
      feedback("MEDIUM");
      onDone();
    } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };

  return <div className="running-correct" role="group" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Correct {describeRunningPosition(entry)}</h4>
    {entry.corrected && <p className="meta">Recorded as {RUNNING_STATUS_LABEL[entry.recorded.status].toLowerCase()}, {Math.round(entry.recorded.completedSeconds / 60)} min, {formatRunningDay(entry.recorded.dayDate)}.</p>}
    <fieldset className="running-correct__status">
      <legend className="meta">How it went</legend>
      {(["COMPLETED", "PARTIAL"] as const).map((s) => <label key={s} className="running-option">
        <input type="radio" name={`${id}-status`} checked={status === s} onChange={() => setStatus(s)} />{RUNNING_STATUS_LABEL[s]}
      </label>)}
    </fieldset>
    <label className="running-field">Minutes <input type="number" inputMode="numeric" min={0} step={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
    <label className="running-field">Day <input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} /></label>
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="running-correct__acts">
      <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>SAVE</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onDone}>CANCEL</button>
      {confirmRemove
        ? <button type="button" className="btn-secondary running-correct__remove" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await voidRunningSession(entry.id); onDone(); }
            catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); setBusy(false); }
          }}>REMOVE THIS RUN FOR GOOD</button>
        : <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRemove(true)}>REMOVE…</button>}
    </div>
  </div>;
}
