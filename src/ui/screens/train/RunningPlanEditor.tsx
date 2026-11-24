import { useEffect, useId, useRef, useState } from "react";
import {
  addRunningPlanEntry,
  editRunningPlanEntry,
  resetRunningPlan,
  resetRunningPlanEntry,
  setRunningCuePreference,
  setRunningPosition,
  setRunningWeekSettings,
  undoRunningPlanEdit,
  type RunningPlanEditResult,
} from "../../../application/runningCommands";
import { readRunningCuePreferences, type RunningCuePreference, type RunningHome } from "../../../application/runningQueries";
import {
  RUNNING_PLAN_SOURCE,
  RUNNING_RUNS_PER_WEEK_MAX,
  RUNNING_SEGMENT_MAX_SECONDS,
  RUNNING_SEGMENT_MIN_SECONDS,
  validateRunningSegments,
  type RunningPosition,
  type RunningSegment,
  type RunningSegmentKind,
} from "../../../domain/workout/runningPlan";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import {
  describeRunningLength,
  describeRunningPosition,
  formatRunningClock,
  RUNNING_KIND_NAME,
  RUNNING_SCREEN_ON,
} from "./trainCopy";

/**
 * GRAYSON-TRAIN-RUN-001: the plan list and his version of it. Every change here is an append-only event
 * (RUNNING_PLAN_EDITED with the full snapshot, RUNNING_PLAN_POSITION_SET); the NHS pattern is always one reset away,
 * and the newest edit (a reset included) can be undone.
 */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CUES: { key: RunningCuePreference; label: string }[] = [
  { key: "buzz", label: "Buzz at each change" },
  { key: "halfway", label: "Halfway cue" },
  { key: "keepAwake", label: "Keep the screen awake" },
];

export function RunningPlanEditor({ home, onChanged, onClose, onStart, startDisabled, startError }: {
  home: RunningHome;
  onChanged: () => Promise<void>;
  onClose: () => void;
  onStart: (position: RunningPosition) => Promise<boolean>;
  startDisabled: boolean;
  startError: string | null;
}) {
  const [editing, setEditing] = useState<RunningPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ text: string; eventId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cues, setCues] = useState(readRunningCuePreferences);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string | null>(null);
  const id = useId();
  useEffect(() => { if (!editing) { if (returnFocus.current) document.getElementById(returnFocus.current)?.focus(); else headingRef.current?.focus(); returnFocus.current = null; } }, [editing]);

  const perform = async (fn: () => Promise<unknown>, done?: (result: unknown) => void): Promise<boolean> => {
    setBusy(true); setError(null);
    try { const result = await fn(); feedback("MEDIUM"); await onChanged(); done?.(result); return true; }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); return false; }
    finally { setBusy(false); }
  };
  const planEdit = (text: string, fn: () => Promise<RunningPlanEditResult>) =>
    perform(fn, (result) => setSaved({ text, eventId: (result as RunningPlanEditResult).eventId }));

  if (editing) {
    const segments = home.plan.plan.weeks[editing.week - 1]?.[editing.run - 1];
    if (segments) return <RunningSegmentEditor position={editing} initial={segments} added={editing.run > 3} error={error} busy={busy}
      onCancel={() => { setError(null); setEditing(null); }}
      onSave={(next) => planEdit(`${describeRunningPosition(editing)} saved.`, () => editRunningPlanEntry(editing, next))}
      onReset={() => planEdit(`${describeRunningPosition(editing)} is back to the plan.`, () => resetRunningPlanEntry(editing))}
      onDone={() => setEditing(null)} />;
  }

  const settings = home.plan.plan;
  return <section className="card running-plan" aria-labelledby={`${id}-title`} data-running-plan>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Running plan{home.plan.edited ? " · your version" : ""}</h3>
    <p className="meta"><a href={RUNNING_PLAN_SOURCE.url} target="_blank" rel="noreferrer">{RUNNING_PLAN_SOURCE.text}</a></p>
    {saved && <p className="running-saved" role="status">{saved.text}{" "}
      <button type="button" className="btn-secondary running-inline" disabled={busy}
        onClick={() => perform(() => undoRunningPlanEdit(saved.eventId), () => setSaved(null))}>UNDO</button></p>}
    {(error ?? startError) && <p className="meta" role="alert">{error ?? startError}</p>}

    <ol className="running-weeks">
      {home.list.map((runs, w) => <li key={w} className="running-week">
        {/* Simple first: only the week with his next run (or the one he's editing) starts open. */}
        <details open={runs.some((r) => r.next) || openWeeks.has(w + 1) || undefined}
          onToggle={(e) => { const open = (e.currentTarget as HTMLDetailsElement).open; setOpenWeeks((all) => { const next = new Set(all); if (open) next.add(w + 1); else next.delete(w + 1); return next; }); }}>
        <summary className="running-week__summary">Week {w + 1} · {runs.length} runs{runs.filter((r) => r.done).length > 0 ? ` · ${runs.filter((r) => r.done).length} done` : ""}</summary>
        <ul className="running-runs">
          {runs.map((entry) => {
            const rowId = `running-plan-${entry.week}-${entry.run}`;
            return <li key={entry.run} className="running-run" data-next={entry.next || undefined}>
              <p className="running-run__title" id={rowId} tabIndex={-1}>
                Run {entry.run} · {describeRunningLength(entry.totalSeconds)}
                {entry.next && <strong> · next</strong>}{entry.done && <span> · done</span>}{entry.added && <span> · added</span>}
              </p>
              <div className="running-run__acts">
                <button type="button" className="btn-secondary running-inline" disabled={busy || startDisabled}
                  aria-label={`Start week ${entry.week}, run ${entry.run}`} onClick={() => void onStart(entry)}>START</button>
                {!entry.next && <button type="button" className="btn-secondary running-inline" disabled={busy}
                  aria-label={`Make week ${entry.week}, run ${entry.run} my next run`}
                  onClick={() => perform(() => setRunningPosition(entry), () => setSaved(null))}>MAKE NEXT</button>}
                <button type="button" className="btn-secondary running-inline" disabled={busy}
                  aria-label={`Edit week ${entry.week}, run ${entry.run}`} onClick={() => { returnFocus.current = rowId; setSaved(null); setEditing(entry); }}>EDIT</button>
              </div>
            </li>;
          })}
        </ul>
        <button type="button" className="btn-secondary running-inline" disabled={busy || runs.length >= 7}
          onClick={() => planEdit(`Run ${runs.length + 1} added to week ${w + 1}.`, () => addRunningPlanEntry(w + 1))}>ADD A RUN TO WEEK {w + 1}</button>
        </details>
      </li>)}
    </ol>

    <fieldset className="running-settings">
      <legend className="section-label">Your week</legend>
      <label className="running-field">Runs a week
        <select value={settings.runsPerWeek} disabled={busy}
          onChange={(e) => planEdit("Runs a week saved.", () => setRunningWeekSettings({ ...settings, runsPerWeek: Number(e.target.value) }))}>
          {Array.from({ length: RUNNING_RUNS_PER_WEEK_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select></label>
      <label className="running-option"><input type="checkbox" checked={settings.showOptional} disabled={busy}
        onChange={(e) => planEdit("Saved.", () => setRunningWeekSettings({ ...settings, showOptional: e.target.checked }))} />Show one more as optional</label>
      <label className="running-field">Week starts on
        <select value={settings.weekStartsOn} disabled={busy}
          onChange={(e) => planEdit("Week start saved.", () => setRunningWeekSettings({ ...settings, weekStartsOn: Number(e.target.value) }))}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select></label>
    </fieldset>

    <fieldset className="running-settings" data-running-cues>
      <legend className="section-label">Cues</legend>
      {CUES.map((c) => <label key={c.key} className="running-option"><input type="checkbox" checked={cues[c.key]}
        onChange={(e) => { setRunningCuePreference(c.key, e.target.checked); setCues(readRunningCuePreferences()); }} />{c.label}</label>)}
      <p className="meta">{RUNNING_SCREEN_ON}</p>
    </fieldset>

    <div className="running-plan__acts">
      {confirmReset
        ? <div role="group" aria-label="Reset the whole plan">
            <p className="meta">Every run goes back to the NHS pattern. Your runs a week stay. You can undo it.</p>
            <button type="button" className="btn-secondary" disabled={busy}
              onClick={() => { setConfirmReset(false); void planEdit("The whole plan is back to the NHS pattern.", resetRunningPlan); }}>RESET THE WHOLE PLAN</button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmReset(false)}>KEEP MY VERSION</button>
          </div>
        : home.plan.edited && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmReset(true)}>RESET THE WHOLE PLAN…</button>}
      <button type="button" className="btn-secondary" onClick={onClose}>BACK</button>
    </div>
  </section>;
}

const KINDS: RunningSegmentKind[] = ["WARMUP", "RUN", "WALK", "COOLDOWN"];
const clamp = (s: number) => Math.min(RUNNING_SEGMENT_MAX_SECONDS, Math.max(RUNNING_SEGMENT_MIN_SECONDS, s));

function RunningSegmentEditor({ position, initial, added, error, busy, onSave, onReset, onCancel, onDone }: {
  position: RunningPosition; initial: RunningSegment[]; added: boolean; error: string | null; busy: boolean;
  onSave: (segments: RunningSegment[]) => Promise<boolean>; onReset: () => Promise<boolean>; onCancel: () => void; onDone: () => void;
}) {
  const [segments, setSegments] = useState<RunningSegment[]>(() => initial.map((s) => ({ ...s })));
  const [problem, setProblem] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);
  const update = (i: number, change: Partial<RunningSegment>) => setSegments((all) => all.map((s, j) => (j === i ? { ...s, ...change } : s)));
  const total = segments.reduce((t, s) => t + s.seconds, 0);

  return <section className="card running-editor" aria-labelledby={`${id}-title`} data-running-editor>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Edit {describeRunningPosition(position)} · {describeRunningLength(total)}</h3>
    <ol className="running-segments">
      {segments.map((s, i) => <li key={i} className="running-segment">
        <label className="running-field">Interval {i + 1}
          <select value={s.kind} onChange={(e) => update(i, { kind: e.target.value as RunningSegmentKind })}>
            {KINDS.map((k) => <option key={k} value={k}>{RUNNING_KIND_NAME[k]}</option>)}
          </select></label>
        <span className="running-segment__time" aria-live="polite">{formatRunningClock(s.seconds)}</span>
        <button type="button" className="btn-secondary running-step running-segment__remove" aria-label={`Remove interval ${i + 1}`} disabled={segments.length <= 1}
          onClick={() => setSegments((all) => all.filter((_, j) => j !== i))}>REMOVE</button>
        <div className="running-segment__steps" role="group" aria-label={`Length of interval ${i + 1}`}>
          <button type="button" className="btn-secondary running-step" aria-label={`Interval ${i + 1}: 1 minute shorter`} onClick={() => update(i, { seconds: clamp(s.seconds - 60) })}>−1 MIN</button>
          <button type="button" className="btn-secondary running-step" aria-label={`Interval ${i + 1}: 5 seconds shorter`} onClick={() => update(i, { seconds: clamp(s.seconds - 5) })}>−5 S</button>
          <button type="button" className="btn-secondary running-step" aria-label={`Interval ${i + 1}: 5 seconds longer`} onClick={() => update(i, { seconds: clamp(s.seconds + 5) })}>+5 S</button>
          <button type="button" className="btn-secondary running-step" aria-label={`Interval ${i + 1}: 1 minute longer`} onClick={() => update(i, { seconds: clamp(s.seconds + 60) })}>+1 MIN</button>
        </div>
      </li>)}
    </ol>
    <button type="button" className="btn-secondary" onClick={() => setSegments((all) => {
      const cooldown = all.at(-1)?.kind === "COOLDOWN" ? all.length - 1 : all.length;
      return [...all.slice(0, cooldown), { kind: "RUN", seconds: 60 }, ...all.slice(cooldown)];
    })}>ADD AN INTERVAL</button>
    {(problem ?? error) && <p className="meta" role="alert">{problem ?? error}</p>}
    <div className="running-editor__acts">
      <button type="button" className="btn-primary" disabled={busy} onClick={async () => {
        const invalid = validateRunningSegments(segments);
        if (invalid) { setProblem(invalid); return; }
        setProblem(null);
        if (await onSave(segments)) onDone();
      }}>SAVE MY VERSION</button>
      {!added && <button type="button" className="btn-secondary" disabled={busy} onClick={async () => { if (await onReset()) onDone(); }}>RESET THIS RUN</button>}
      <button type="button" className="btn-secondary" onClick={onCancel}>CANCEL</button>
    </div>
  </section>;
}
