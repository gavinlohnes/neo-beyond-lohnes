import { useEffect, useId, useRef, useState } from "react";
import {
  addExerciseToSession,
  getAddChoices,
  getChangesToKeep,
  getOneOffRoutineDraft,
  getSwapSuggestions,
  saveSessionAsRoutine,
  keepWorkoutChanges,
  removeExerciseFromSession,
  swapExerciseInSession,
  type SwapOptions,
} from "../../../application/workoutChanges";
import { undoRoutineEdit } from "../../../application/routineEditCommands";
import { archiveCustomTemplate } from "../../../application/customTemplateCommands";
import type { RoutineExerciseChoice } from "../../../application/routineEditQueries";
import type { ExercisePrescription } from "../../../domain/workout/types";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import { ExercisePicker } from "./RoutineEditor";
import "./routineEditor.css";

/**
 * GRAYSON-WORKOUT-CHANGES-001 (Gavin, 2026-11-25): SWAP and ADD EXERCISE on the live workout, REMOVE FROM TODAY, and
 * the one question at the end. Every change here is today only until KEEP FOR NEXT TIME.
 */

/** What the picker hides: today's exercises, by id and by name (so a library twin doesn't show). */
const takenBy = (today: readonly ExercisePrescription[]) => new Set(today.flatMap((ex) => [ex.exerciseId, `name:${ex.name.trim().toLowerCase()}`]));
const describeLast = (last: { weight: number; reps: number } | null) => (last ? `Last: ${last.weight} lb × ${last.reps}` : "Not done yet");

/** SWAP: three same-muscle moves with his last numbers, SEARCH for any other, and REMOVE FROM TODAY. */
export function SwapSheet({ sessionId, exercise, today, onChanged, onClose }: {
  sessionId: string;
  exercise: ExercisePrescription;
  today: readonly ExercisePrescription[];
  onChanged: (focusExerciseId: string | null) => Promise<void> | void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<SwapOptions | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    headingRef.current?.focus();
    void getSwapSuggestions(sessionId, exercise.exerciseId).then(setOptions).catch((e) => setError(describeError(e, "Suggestions are unavailable.")));
  }, [sessionId, exercise.exerciseId]);

  const act = async (fn: () => Promise<unknown>, focus: string | null) => {
    setBusy(true); setError(null);
    try { await fn(); feedback("MEDIUM"); await onChanged(focus); onClose(); }
    catch (e) { setError(describeError(e, "That didn't change. Nothing changed.")); }
    finally { setBusy(false); }
  };
  const swapTo = (choice: { exerciseId: string; name: string; repRangeLow: number; repRangeHigh: number; incrementLbs: number }) =>
    void act(() => swapExerciseInSession(sessionId, exercise.exerciseId, choice), choice.exerciseId);

  if (searching) {
    return <ExercisePicker title={`Swap ${exercise.name} for…`} busy={busy} taken={takenBy(today)}
      onCancel={() => setSearching(false)} onPick={swapTo} />;
  }

  return <section className="card routine-picker train-swap" aria-labelledby={`${id}-title`} data-swap-sheet>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Swap {exercise.name}</h3>
    {options && <p className="meta">{options.muscleGroup ? `Same muscle: ${options.muscleGroup}. Ranked by the equipment you've used lately.` : "No muscle group on file for this one. SEARCH for any other."}</p>}
    {!options && !error && <p className="meta">Finding moves…</p>}
    <ul className="routine-picker__list">
      {options?.suggestions.map((s) => <li key={s.exerciseId}>
        <button type="button" className="routine-picker__choice" disabled={busy} onClick={() => swapTo(s)}>
          <span>{s.name}</span><span className="meta">{s.muscleGroup} · {s.equipment} · {describeLast(s.last)}</span>
        </button>
      </li>)}
    </ul>
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    <div className="routine-list__acts">
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => setSearching(true)}>SEARCH</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void act(() => removeExerciseFromSession(sessionId, exercise.exerciseId), null)}>REMOVE FROM TODAY</button>
      <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>CANCEL</button>
    </div>
  </section>;
}

/** ADD EXERCISE: the three done most recently, then the whole list, his own first. */
export function AddExerciseSheet({ sessionId, today, onChanged, onClose }: {
  sessionId: string;
  today: readonly ExercisePrescription[];
  onChanged: (focusExerciseId: string | null) => Promise<void> | void;
  onClose: () => void;
}) {
  const [recent, setRecent] = useState<RoutineExerciseChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getAddChoices(sessionId).then(({ recent: r }) => setRecent(r))
      .catch((e) => setError(describeError(e, "The exercise list is unavailable.")));
  }, [sessionId]);
  const add = async (choice: RoutineExerciseChoice) => {
    setBusy(true); setError(null);
    try { await addExerciseToSession(sessionId, choice); feedback("MEDIUM"); await onChanged(choice.exerciseId); onClose(); }
    catch (e) { setError(describeError(e, "That didn't add. Nothing changed.")); }
    finally { setBusy(false); }
  };
  return <>
    <ExercisePicker title="Add an exercise to this workout" busy={busy} recent={recent} taken={takenBy(today)} onCancel={onClose} onPick={(c) => void add(c)} />
    {error && <p className="meta meta--error" role="alert">{error}</p>}
  </>;
}

/** The finish summary's one line when anything changed: KEEP FOR NEXT TIME or JUST TODAY, then UNDO after KEEP. */
export function KeepChangesLine({ sessionId, routineLabel }: { sessionId: string; routineLabel: string }) {
  const [state, setState] = useState<"ASK" | "KEPT" | "TODAY" | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getChangesToKeep(sessionId).then((changes) => setState(changes ? "ASK" : null)).catch(() => setState(null)); }, [sessionId]);
  if (!state) return null;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); } finally { setBusy(false); }
  };
  return <div className="train-keep-changes" role="group" aria-label="Changes to this workout" data-keep-changes>
    {state === "ASK" && <>
      <p className="card-body" style={{ margin: 0 }}>You changed this workout.</p>
      <div className="routine-list__acts">
        <button type="button" className="btn-secondary" disabled={busy}
          onClick={() => void run(async () => { const result = await keepWorkoutChanges(sessionId); feedback("MEDIUM"); setKept(result.eventId); setState("KEPT"); })}>KEEP FOR NEXT TIME</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setState("TODAY")}>JUST TODAY</button>
      </div>
    </>}
    {state === "KEPT" && <p className="routine-saved" role="status">{routineLabel} will start this way next time.{" "}
      {kept && <button type="button" className="btn-secondary routine-inline" disabled={busy}
        onClick={() => void run(async () => { await undoRoutineEdit(kept); setKept(null); setState("ASK"); })}>UNDO</button>}</p>}
    {state === "TODAY" && <p className="meta" role="status">Just today. {routineLabel} stays as it was.</p>}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
  </div>;
}

/**
 * GRAYSON-ONE-OFF-001: SAVE AS ROUTINE on a one-off's finish summary. Two taps (SAVE AS ROUTINE, SAVE) with the default
 * name; UNDO archives the new routine. It isn't added to his programme.
 */
export function SaveAsRoutineLine({ sessionId }: { sessionId: string }) {
  const [draftName, setDraftName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<"IDLE" | "NAMING" | "SAVED">("IDLE");
  const [saved, setSaved] = useState<{ templateId: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => { void getOneOffRoutineDraft(sessionId).then((d) => { setDraftName(d?.name ?? null); setName(d?.name ?? ""); }).catch(() => setDraftName(null)); }, [sessionId]);
  useEffect(() => { if (state === "NAMING") nameRef.current?.focus(); }, [state]);
  if (!draftName) return null;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); } finally { setBusy(false); }
  };
  return <div className="train-keep-changes" role="group" aria-label="Save this workout as a routine" data-save-routine>
    {state === "IDLE" && <button type="button" className="btn-secondary" disabled={busy} onClick={() => setState("NAMING")}>SAVE AS ROUTINE</button>}
    {state === "NAMING" && <>
      <label className="routine-field" htmlFor={`${id}-name`}>Routine name</label>
      <input id={`${id}-name`} ref={nameRef} type="text" className="input" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
      <div className="routine-list__acts">
        <button type="button" className="btn-secondary" disabled={busy}
          onClick={() => void run(async () => { const result = await saveSessionAsRoutine(sessionId, name); feedback("MEDIUM"); setSaved({ templateId: result.templateId, name: name.trim() || draftName }); setState("SAVED"); })}>SAVE</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setState("IDLE")}>CANCEL</button>
      </div>
    </>}
    {state === "SAVED" && saved && <p className="routine-saved" role="status">{saved.name} is in your routines.{" "}
      <button type="button" className="btn-secondary routine-inline" disabled={busy}
        onClick={() => void run(async () => { await archiveCustomTemplate(saved.templateId); setSaved(null); setState("IDLE"); })}>UNDO</button></p>}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
  </div>;
}
