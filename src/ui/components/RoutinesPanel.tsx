import { useEffect, useRef, useState, useId } from "react";
import { createRoutine, getRoutines, matchSteps, modifyRoutine, setRoutineArchived } from "../../application/routineCommands";
import { ROUTINE_MOMENTS, ROUTINE_MOMENT_LABELS, type Routine, type RoutineMoment } from "../../domain/routines";
import { captureCommitFeedback } from "../feel/feedback";
import { useSessionDraft } from "../sessionDrafts";
import { describeError } from "../errorMessage";
import { askAlfred } from "./AlfredSheet";
import { RoutineMinutes } from "./RoutineMinutes";
import { RoutinePlayer } from "./RoutinePlayer";
import { validRoutineMinutes, withDraftMinutes } from "./routineDraft";
import { routineEstimate } from "../../application/routinePlayer";

/**
 * ROUTINES-001: MORE → ROUTINES. Write your own routines, one per moment or several; TODAY shows the
 * ones for the moment you're in. Nothing here tracks how often you did them.
 */
const lines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);

export function RoutinesPanel({ active }: { active: boolean }) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const uid = useId();
  const [readError, setReadError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [title, setTitle] = useState("");
  const [moment, setMoment] = useState<RoutineMoment>("BEFORE_SHIFT");
  const [steps, setSteps] = useState("");
  const [durationEdits, setDurationEdits] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<Routine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const createSteps = withDraftMinutes(lines(steps).map((text) => ({ text })), durationEdits);
  const createMinutesValid = validRoutineMinutes(createSteps);
  useSessionDraft("routine-create", title.length > 0 || steps.length > 0);

  async function load() {
    const mine = ++sequence.current;
    try { const next = await getRoutines(); if (mine === sequence.current) { setRoutines(next); setReadError(null); } }
    catch (cause) { if (mine === sequence.current) setReadError(describeError(cause, "Could not read routines.")); }
  }
  useEffect(() => { if (active) void load(); else setPlaying(null); }, [active]);

  async function run(fn: () => Promise<unknown>): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError(null);
    const acknowledge = captureCommitFeedback();
    try { await fn(); acknowledge("LIGHT"); await load(); return true; }
    catch (cause) { setError(describeError(cause, "That didn't save. Nothing changed.")); await load(); return false; }
    finally { setBusy(false); }
  }

  const shown = (routines ?? []).filter((r) => showArchived || r.status === "ACTIVE");
  return <section aria-labelledby={`${uid}-routines`} className="intent-field">
    <h2 id={`${uid}-routines`} className="tool-label">YOUR ROUTINES</h2>
    <p className="card-body">Write them in your own words. TODAY shows the ones for the moment you're in: before shift, on shift, after shift, or a day off. Tick steps if it helps; nothing counts what you skip.</p>
    <button type="button" className="btn-secondary" onClick={() => askAlfred("Help me write a routine for one part of my rotation (before shift, on shift, after shift or a day off). Ask what I already do, then offer it as a card I can save.")}>WRITE ONE WITH ALFRED</button>
    {readError && <div><p role="alert">{readError} Routines are unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void load()}>RETRY ROUTINES</button></div>}
    <div className="intent-filter" role="group" aria-label="Routine visibility">
      <button aria-pressed={!showArchived} className={`chip ${!showArchived ? "chip--selected" : ""}`} onClick={() => setShowArchived(false)}>IN USE</button>
      <button aria-pressed={showArchived} className={`chip ${showArchived ? "chip--selected" : ""}`} onClick={() => setShowArchived(true)}>ALL / PUT AWAY</button>
    </div>
    {routines && shown.length === 0 && <p className="empty-state">{showArchived ? "No routines yet." : "No routines in use."}</p>}
    {shown.map((r) => <RoutineEditor key={r.id} routine={r} busy={busy} run={run} onPlay={() => setPlaying(r)} />)}
    <details className="intent-create">
      <summary role="button">NEW ROUTINE</summary>
      <label className="field">Name<input className="input" value={title} maxLength={80} disabled={busy} placeholder="Pre-shift" onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="field">When<select className="input" value={moment} disabled={busy} onChange={(e) => setMoment(e.target.value as RoutineMoment)}>{ROUTINE_MOMENTS.map((m) => <option key={m} value={m}>{ROUTINE_MOMENT_LABELS[m]}</option>)}</select></label>
      <p className="meta">Food and bottle already have their own buttons in TODAY's prep, so there's no need to list them here.</p>
      <label className="field">Steps, one per line<textarea className="input" style={{ minHeight: 100 }} value={steps} disabled={busy} placeholder={"Nap 20 min\nShower\nLay out uniform"} onChange={(e) => setSteps(e.target.value)} /></label>
      <RoutineMinutes steps={lines(steps).map((text) => ({ text }))} edits={durationEdits} onChange={setDurationEdits} disabled={busy} />
      {!createMinutesValid && <p role="alert">Enter whole minutes from 1 to 240, or leave the estimate blank.</p>}
      <button type="button" className="btn-primary" disabled={busy || !title.trim() || lines(steps).length === 0 || !createMinutesValid}
        onClick={() => void run(() => createRoutine({ title, moment, steps: createSteps })).then((ok) => { if (ok) { setTitle(""); setSteps(""); setDurationEdits({}); } })}>SAVE ROUTINE</button>
    </details>
    {error && <p role="alert" className="meta meta--error">{error}</p>}
    {playing && <RoutinePlayer routines={[playing]} onClose={() => setPlaying(null)} />}
  </section>;
}

function RoutineEditor({ routine, busy, run, onPlay }: { routine: Routine; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<boolean>; onPlay: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(routine.title);
  const [moment, setMoment] = useState<RoutineMoment>(routine.moment);
  const [steps, setSteps] = useState(routine.steps.map((s) => s.text).join("\n"));
  const [durationEdits, setDurationEdits] = useState<Record<string, string>>({});
  const draftSteps = matchSteps(routine, lines(steps));
  const minutesValid = validRoutineMinutes(withDraftMinutes(draftSteps, durationEdits));
  const dirty = editing && (title !== routine.title || moment !== routine.moment || steps !== routine.steps.map((s) => s.text).join("\n") || JSON.stringify(withDraftMinutes(draftSteps, durationEdits)) !== JSON.stringify(routine.steps));
  useSessionDraft(`routine-edit-${routine.id}`, dirty);
  const reset = () => { setTitle(routine.title); setMoment(routine.moment); setSteps(routine.steps.map((s) => s.text).join("\n")); setDurationEdits({}); };

  async function save() {
    if (await run(() => modifyRoutine(routine.id, { title, moment, steps: withDraftMinutes(draftSteps, durationEdits) }, routine.updatedAt))) setEditing(false);
  }

  return <article className={`intent-detail${routine.status === "ARCHIVED" ? " intent-detail--historical" : ""}`} aria-label={routine.title}>
    {!editing ? <>
      <p className="intent-detail__identity"><span>{ROUTINE_MOMENT_LABELS[routine.moment].toUpperCase()}</span>{routine.status === "ARCHIVED" && <span className="intent-state" data-status="ARCHIVED">PUT AWAY</span>}</p>
      <h3 className="card-title">{routine.title}</h3>
      {routineEstimate(routine.steps) && <p className="meta">{routineEstimate(routine.steps)}</p>}
      <ol>{routine.steps.map((s) => <li key={s.id}>{s.text}{s.minutes !== undefined && <span className="meta"> · about {s.minutes} min</span>}</li>)}</ol>
      <div className="intent-actions">
        {routine.status === "ACTIVE" && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { reset(); setEditing(true); }}>EDIT</button>}
        {routine.status === "ACTIVE" && <button type="button" className="btn-secondary" disabled={busy} onClick={onPlay}>PLAY</button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => setRoutineArchived(routine.id, routine.status === "ACTIVE"))}>{routine.status === "ACTIVE" ? "PUT AWAY" : "BRING BACK"}</button>
      </div>
    </> : <>
      <label className="field">Name<input className="input" value={title} maxLength={80} disabled={busy} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="field">When<select className="input" value={moment} disabled={busy} onChange={(e) => setMoment(e.target.value as RoutineMoment)}>{ROUTINE_MOMENTS.map((m) => <option key={m} value={m}>{ROUTINE_MOMENT_LABELS[m]}</option>)}</select></label>
      <label className="field">Steps, one per line<textarea className="input" style={{ minHeight: 100 }} value={steps} disabled={busy} onChange={(e) => setSteps(e.target.value)} /></label>
      <RoutineMinutes steps={draftSteps} edits={durationEdits} onChange={setDurationEdits} disabled={busy} />
      {!minutesValid && <p role="alert">Enter whole minutes from 1 to 240, or leave the estimate blank.</p>}
      <div className="intent-actions">
        <button type="button" className="btn-primary" disabled={busy || !title.trim() || lines(steps).length === 0 || !minutesValid} onClick={() => void save()}>SAVE</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>CANCEL</button>
      </div>
    </>}
  </article>;
}
