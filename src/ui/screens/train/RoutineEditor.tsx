import { useEffect, useId, useRef, useState } from "react";
import { resetRoutine, saveRoutineEdit, undoRoutineEdit, type RoutineEditResult } from "../../../application/routineEditCommands";
import { createCustomTemplate } from "../../../application/customTemplateCommands";
import {
  filterRoutineExerciseChoices,
  getRoutineExerciseChoices,
  getRoutineViews,
  type RoutineExerciseChoice,
  type RoutineView,
} from "../../../application/routineEditQueries";
import {
  applyRoutineEdit,
  ROUTINE_REPS_MAX,
  ROUTINE_REPS_MIN,
  ROUTINE_REST_MAX_SECONDS,
  ROUTINE_REST_MIN_SECONDS,
  ROUTINE_SETS_MAX,
  ROUTINE_SETS_MIN,
  validateRoutineExercises,
  type RoutineEditOp,
} from "../../../domain/workout/routineEdit";
import type { ExercisePrescription } from "../../../domain/workout/types";
import { restSecondsFor } from "../../../application/restMemory";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import "./routineEditor.css";
import { HomeTwin, HomeTwinNudge } from "./HomeTwin";

/**
 * GRAYSON-ROUTINE-EDIT-001 (Gavin, 2026-11-25). One editor for every routine, A, B and C included, opened from TRAIN's
 * workout card (EDIT), TRAIN's ROUTINES list and MORE · Custom programs. SAVE, then UNDO; no confirm dialog. A, B and
 * C each have RESET TO ORIGINAL; his own routines go back to as first saved.
 */

type FieldChange = Extract<RoutineEditOp, { kind: "SET" }>["change"];
const REST_STEP = 15;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const formatRest = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const describeRoutine = (exercises: readonly ExercisePrescription[]) =>
  `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"} · ${exercises.reduce((t, ex) => t + ex.sets, 0)} sets`;

export interface RoutineSaved { text: string; eventId: string | null; templateId?: string | null }

/** The ROUTINES list, with the editor one tap from each row. */
export function RoutinesPanel({ initialTemplateId, workoutActive, onChanged, onClose }: {
  initialTemplateId?: string | null;
  workoutActive: boolean;
  onChanged: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [routines, setRoutines] = useState<RoutineView[] | null>(null);
  const [editing, setEditing] = useState<string | "NEW" | null>(initialTemplateId ?? null);
  const [saved, setSaved] = useState<RoutineSaved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string | null>(null);
  const id = useId();

  const reload = async () => { setRoutines(await getRoutineViews()); };
  useEffect(() => { void reload().catch((e) => setError(describeError(e, "Routines are unavailable. Please retry."))); }, []);
  useEffect(() => {
    if (editing) return;
    if (returnFocus.current) document.getElementById(returnFocus.current)?.focus(); else headingRef.current?.focus();
    returnFocus.current = null;
  }, [editing]);

  const afterChange = async (text: string, result: RoutineEditResult | null, templateId: string | null = null) => {
    feedback("MEDIUM");
    setSaved({ text, eventId: result?.eventId ?? null, templateId: result ? templateId : null });
    await reload();
    await onChanged();
  };
  const undo = async (eventId: string) => {
    setBusy(true); setError(null);
    try { await undoRoutineEdit(eventId); feedback("MEDIUM"); setSaved({ text: "Undone. The routine is back as it was.", eventId: null }); await reload(); await onChanged(); }
    catch (e) { setError(describeError(e, "That didn't undo. Nothing changed.")); }
    finally { setBusy(false); }
  };

  const open = routines && editing ? (editing === "NEW" ? null : routines.find((r) => r.templateId === editing) ?? null) : null;
  if (routines && editing && (editing === "NEW" || open)) {
    return <RoutineEditor routine={open} workoutActive={workoutActive}
      onCancel={() => setEditing(null)}
      onDone={async (text, result) => { const savedId = open?.templateId ?? null; setEditing(null); await afterChange(text, result, savedId); }} />;
  }

  return <section className="card routine-list" aria-labelledby={`${id}-title`} data-routine-list>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">Routines</h3>
    <p className="meta">Edit any routine, A, B and C included. A workout you've started keeps its exercises; a change applies from the next one.</p>
    {saved && <p className="routine-saved" role="status">{saved.text}{" "}
      {saved.eventId && <button type="button" className="btn-secondary routine-inline" disabled={busy} onClick={() => void undo(saved.eventId!)}>UNDO</button>}</p>}
    {/* GRAYSON-HOME-STRETCH-001 slice C: a routine with a home twin offers UPDATE TWIN after a change. */}
    {saved?.templateId && <HomeTwinNudge templateId={saved.templateId} busy={busy} />}
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    {!routines ? <p className="meta">Reading routines…</p> : <ul className="routine-list__rows">
      {routines.map((r) => {
        const rowId = `routine-row-${r.templateId}`;
        return <li key={r.templateId} className="routine-list__row">
          <div>
            <p className="routine-list__name">{r.label}{r.edited && <span className="meta"> · edited</span>}{r.inProgramme && <span className="meta"> · in your programme</span>}</p>
            <p className="meta">{describeRoutine(r.exercises)}: {r.exercises.map((ex) => ex.name).join(", ")}</p>
          </div>
          <button id={rowId} type="button" className="btn-secondary routine-inline" disabled={busy} aria-label={`Edit ${r.label}`}
            onClick={() => { returnFocus.current = rowId; setSaved(null); setEditing(r.templateId); }}>EDIT</button>
        </li>;
      })}
    </ul>}
    <div className="routine-list__acts">
      <button type="button" className="btn-secondary" disabled={busy || !routines} onClick={() => { setSaved(null); setEditing("NEW"); }}>NEW ROUTINE</button>
      <button type="button" className="btn-secondary" onClick={onClose}>BACK</button>
    </div>
  </section>;
}

/** The editor for one routine (`routine` null: a new routine of his own). */
export function RoutineEditor({ routine, workoutActive, onCancel, onDone }: {
  routine: RoutineView | null;
  workoutActive: boolean;
  onCancel: () => void;
  onDone: (text: string, result: RoutineEditResult | null) => Promise<void> | void;
}) {
  const [exercises, setExercises] = useState<ExercisePrescription[]>(() => structuredClone(routine?.exercises ?? []));
  const [name, setName] = useState(routine?.name ?? "");
  const [picker, setPicker] = useState<{ swapIndex: number | null } | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const id = useId();
  const builtIn = routine?.builtIn ?? false;
  const title = routine ? `Edit ${routine.label}` : "New routine";

  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const apply = (op: RoutineEditOp, focusAfter?: string) => {
    try { setExercises((all) => applyRoutineEdit(all, op)); setProblem(null); if (focusAfter) pendingFocus.current = focusAfter; }
    catch (e) { setProblem(describeError(e, "That change didn't work.")); }
  };
  const rowKey = (ex: ExercisePrescription) => `${id}-${ex.exerciseId}`.replace(/[^A-Za-z0-9_-]/g, "_");

  const run = async (fn: () => Promise<RoutineEditResult | null>, text: string) => {
    setBusy(true); setProblem(null);
    try { const result = await fn(); await onDone(text, result); }
    catch (e) { setProblem(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };
  const save = () => {
    const invalid = validateRoutineExercises(exercises) ?? (!builtIn && !name.trim() ? "A routine needs a name." : null);
    if (invalid) { setProblem(invalid); return; }
    if (!routine) return void run(async () => { await createCustomTemplate({ name: name.trim(), exercises }); return null; }, `${name.trim()} saved.`);
    void run(() => saveRoutineEdit(routine.templateId, { exercises, ...(builtIn ? {} : { name: name.trim() }) }), `${builtIn ? routine.label : name.trim()} saved.`);
  };

  if (picker) {
    const swapping = picker.swapIndex !== null ? exercises[picker.swapIndex] : undefined;
    return <ExercisePicker title={swapping ? `Swap ${swapping.name} for…` : "Add an exercise"} taken={new Set(exercises.flatMap((ex) => [ex.exerciseId, `name:${ex.name.trim().toLowerCase()}`]))}
      onCancel={() => { pendingFocus.current = picker.swapIndex !== null ? `${rowKey(exercises[picker.swapIndex]!)}-menu` : `${id}-add`; setPicker(null); }}
      onPick={(choice) => {
        const pick = { exerciseId: choice.exerciseId, name: choice.name, repRangeLow: choice.repRangeLow, repRangeHigh: choice.repRangeHigh, incrementLbs: choice.incrementLbs };
        setPicker(null);
        // Focus returns to the exercise just placed (review of #730), not the page.
        const placed = `${rowKey({ ...pick, sets: 0 })}-menu`;
        if (picker.swapIndex !== null) apply({ kind: "SWAP", index: picker.swapIndex, with: pick }, placed);
        else apply({ kind: "ADD", exercise: pick }, placed);
      }} />;
  }

  return <section className="card routine-editor" aria-labelledby={`${id}-title`} data-routine-editor>
    <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">{title}</h3>
    {workoutActive && <p className="meta">Your workout in progress keeps its exercises. This applies from the next one.</p>}
    {routine?.inProgramme && <p className="meta">In your programme: saving keeps the programme in step.</p>}
    {!builtIn && <label className="routine-field routine-field--name">Name
      <input type="text" className="input" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} /></label>}

    {exercises.length === 0 && <p className="empty-state">No exercises yet. ADD EXERCISE to start.</p>}
    <ol className="routine-rows">
      {exercises.map((ex, i) => {
        const key = rowKey(ex);
        const rest = ex.restSeconds;
        // "Usual" steps from his remembered rest for this exercise (review of #730), not a fixed default.
        const base = rest ?? restSecondsFor(ex.exerciseId);
        const step = (change: FieldChange) => apply({ kind: "SET", index: i, change });
        return <li key={ex.exerciseId} className="routine-row" data-routine-row={ex.exerciseId}>
          <div className="routine-row__head">
            <span className="routine-row__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <p className="routine-row__name" id={`${key}-name`}>{ex.name}</p>
            <div className="routine-row__move" role="group" aria-label={`Move ${ex.name}`}>
              <button type="button" id={`${key}-up`} className="btn-secondary routine-step" disabled={busy || i === 0} aria-label={`Move ${ex.name} up`}
                onClick={() => apply({ kind: "MOVE", index: i, by: -1 }, i - 1 === 0 ? `${key}-down` : `${key}-up`)}>↑</button>
              <button type="button" id={`${key}-down`} className="btn-secondary routine-step" disabled={busy || i === exercises.length - 1} aria-label={`Move ${ex.name} down`}
                onClick={() => apply({ kind: "MOVE", index: i, by: 1 }, i + 1 === exercises.length - 1 ? `${key}-up` : `${key}-down`)}>↓</button>
              <button type="button" id={`${key}-menu`} className="btn-secondary routine-step" disabled={busy} aria-expanded={menuFor === i}
                aria-controls={`${key}-actions`} aria-label={`More for ${ex.name}`} onClick={() => setMenuFor((open) => (open === i ? null : i))}>⋯</button>
            </div>
          </div>
          {menuFor === i && <div id={`${key}-actions`} className="routine-row__actions" role="group" aria-label={`${ex.name} actions`}>
            <button type="button" className="btn-secondary routine-inline" disabled={busy || i === 0} onClick={() => { setMenuFor(null); apply({ kind: "MOVE", index: i, by: -1 }); }}>MOVE UP</button>
            <button type="button" className="btn-secondary routine-inline" disabled={busy || i === exercises.length - 1} onClick={() => { setMenuFor(null); apply({ kind: "MOVE", index: i, by: 1 }); }}>MOVE DOWN</button>
            <button type="button" className="btn-secondary routine-inline" disabled={busy} onClick={() => { setMenuFor(null); setPicker({ swapIndex: i }); }}>SWAP</button>
            <button type="button" className="btn-secondary routine-inline" disabled={busy} onClick={() => { setMenuFor(null); apply({ kind: "REMOVE", index: i }); }}>REMOVE</button>
          </div>}
          <div className="routine-row__fields">
            <Stepper label="Sets" value={String(ex.sets)} name={ex.name} disabled={busy}
              onLess={ex.sets > ROUTINE_SETS_MIN ? () => step({ sets: ex.sets - 1 }) : undefined}
              onMore={ex.sets < ROUTINE_SETS_MAX ? () => step({ sets: ex.sets + 1 }) : undefined} />
            <Stepper label="Reps from" value={String(ex.repRangeLow)} name={ex.name} disabled={busy}
              onLess={ex.repRangeLow > ROUTINE_REPS_MIN ? () => step({ repRangeLow: ex.repRangeLow - 1 }) : undefined}
              onMore={ex.repRangeLow < ex.repRangeHigh ? () => step({ repRangeLow: ex.repRangeLow + 1 }) : undefined} />
            <Stepper label="Reps to" value={String(ex.repRangeHigh)} name={ex.name} disabled={busy}
              onLess={ex.repRangeHigh > ex.repRangeLow ? () => step({ repRangeHigh: ex.repRangeHigh - 1 }) : undefined}
              onMore={ex.repRangeHigh < ROUTINE_REPS_MAX ? () => step({ repRangeHigh: ex.repRangeHigh + 1 }) : undefined} />
            <Stepper label="Rest" value={rest === undefined ? "Usual" : formatRest(rest)} name={ex.name} disabled={busy} unit="15 seconds"
              onLess={base > ROUTINE_REST_MIN_SECONDS ? () => step({ restSeconds: clamp(base - REST_STEP, ROUTINE_REST_MIN_SECONDS, ROUTINE_REST_MAX_SECONDS) }) : undefined}
              onMore={base < ROUTINE_REST_MAX_SECONDS ? () => step({ restSeconds: clamp(base + REST_STEP, ROUTINE_REST_MIN_SECONDS, ROUTINE_REST_MAX_SECONDS) }) : undefined} />
          </div>
          <div className="routine-row__extras">
            {rest !== undefined && <button type="button" className="btn-secondary routine-inline" disabled={busy} onClick={() => step({ restSeconds: undefined })}
              aria-label={`${ex.name}: use my usual rest`}>USE MY USUAL REST</button>}
            {i < exercises.length - 1 && <label className="routine-option"><input type="checkbox" checked={ex.supersetWithNext === true} disabled={busy}
              onChange={(e) => step({ supersetWithNext: e.target.checked })} /> Superset with next</label>}
          </div>
        </li>;
      })}
    </ol>
    <button type="button" id={`${id}-add`} className="btn-secondary" disabled={busy} onClick={() => setPicker({ swapIndex: null })}>ADD EXERCISE</button>
    {problem && <p className="meta meta--error" role="alert">{problem}</p>}
    <div className="routine-editor__acts">
      <button type="button" className="btn-primary" disabled={busy} onClick={save}>SAVE</button>
      {routine?.edited && <button type="button" className="btn-secondary" disabled={busy}
        onClick={() => void run(() => resetRoutine(routine.templateId), builtIn ? `${routine.label} is back to the original.` : `${routine.label} is back to as you first saved it.`)}>
        {builtIn ? "RESET TO ORIGINAL" : "RESET TO AS FIRST SAVED"}</button>}
      <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>CANCEL</button>
    </div>
    {/* GRAYSON-HOME-STRETCH-001 slice C: the routine's home twin (its own file). */}
    {routine && <HomeTwin templateId={routine.templateId} busy={busy} />}
  </section>;
}

function Stepper({ label, value, name, disabled, unit, onLess, onMore }: {
  label: string; value: string; name: string; disabled: boolean; unit?: string; onLess: (() => void) | undefined; onMore: (() => void) | undefined;
}) {
  const by = unit ? ` by ${unit}` : "";
  return <div className="routine-stepper" role="group" aria-label={`${name}: ${label.toLowerCase()}`}>
    <span className="routine-stepper__label">{label}</span>
    <button type="button" className="btn-secondary routine-step" disabled={disabled || !onLess} aria-label={`${name}: ${label.toLowerCase()} down${by}`} onClick={onLess}>−</button>
    <span className="routine-stepper__value" aria-live="polite">{value}</span>
    <button type="button" className="btn-secondary routine-step" disabled={disabled || !onMore} aria-label={`${name}: ${label.toLowerCase()} up${by}`} onClick={onMore}>+</button>
  </div>;
}

/** ADD EXERCISE and SWAP: his own exercises first, then the bundled library. */
export function ExercisePicker({ title, taken, onPick, onCancel, recent, busy = false }: {
  title: string; taken: ReadonlySet<string>; onPick: (choice: RoutineExerciseChoice) => void; onCancel: () => void;
  /** GRAYSON-WORKOUT-CHANGES-001: the three he did most recently, above the search. */
  recent?: readonly RoutineExerciseChoice[]; busy?: boolean;
}) {
  const [choices, setChoices] = useState<RoutineExerciseChoice[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => { searchRef.current?.focus(); void getRoutineExerciseChoices().then(setChoices).catch((e) => setError(describeError(e, "The exercise list is unavailable."))); }, []);
  const shown = choices ? filterRoutineExerciseChoices(choices, query).filter((c) => !taken.has(c.exerciseId) && !taken.has(`name:${c.name.trim().toLowerCase()}`)) : [];

  return <section className="card routine-picker" aria-labelledby={`${id}-title`} data-routine-picker>
    <h3 id={`${id}-title`} className="card-title">{title}</h3>
    {recent && recent.length > 0 && <div role="group" aria-label="Done recently">
      <p className="section-label">Done recently</p>
      <ul className="routine-picker__list">{recent.map((c) => <li key={c.exerciseId}>
        <button type="button" className="routine-picker__choice" disabled={busy} onClick={() => onPick(c)}>
          <span>{c.name}</span><span className="meta">{c.detail} · {c.repRangeLow}–{c.repRangeHigh}</span>
        </button></li>)}</ul>
    </div>}
    <label className="routine-field">Search
      <input ref={searchRef} type="search" className="input" value={query} placeholder="Name, muscle or equipment" onChange={(e) => setQuery(e.target.value)} /></label>
    {error && <p className="meta meta--error" role="alert">{error}</p>}
    {choices && shown.length === 0 && <p className="empty-state">Nothing matches “{query.trim()}”.</p>}
    <ul className="routine-picker__list">
      {shown.map((c) => <li key={c.exerciseId}>
        <button type="button" className="routine-picker__choice" disabled={busy} onClick={() => onPick(c)}>
          <span>{c.name}</span><span className="meta">{c.detail} · {c.repRangeLow}–{c.repRangeHigh}</span>
        </button>
      </li>)}
    </ul>
    <button type="button" className="btn-secondary" onClick={onCancel}>CANCEL</button>
  </section>;
}
