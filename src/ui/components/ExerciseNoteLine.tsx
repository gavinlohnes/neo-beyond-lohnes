import type React from "react";
import { useEffect, useId, useRef, useState } from "react";
import { getCustomExercises } from "../../application/exerciseLibraryQueries";
import type { CustomExercise } from "../../domain/workout/customExercise";
import { EXERCISE_NOTE_MAX, noteFor, saveNote } from "../screens/train/exerciseNotesStore";
import { describeError } from "../errorMessage";
import "./exerciseNote.css";

/**
 * GRAYSON-TRAIN-NOTES-001: his one-line note on an exercise. `useExerciseNote` reads it (his own exercise's `notes`, or
 * the shared note); `ExerciseNoteButton` is the NOTE control beside HOW TO; `ExerciseNoteLine` is the muted line
 * "Your note: …" (nothing at all when there's no note) and, while editing, the inline editor. Editing never leaves the
 * workout or touches rest.
 */
export interface ExerciseNote {
  note: string | null;
  editing: boolean;
  setEditing: (on: boolean) => void;
  save: (text: string) => Promise<void>;
}

export function useExerciseNote(exerciseId: string, customs?: readonly CustomExercise[]): ExerciseNote {
  const [loaded, setLoaded] = useState<readonly CustomExercise[] | null>(customs ?? null);
  const [note, setNote] = useState<string | null>(() => (customs ? noteFor(exerciseId, customs) : null));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (customs) { setLoaded(customs); setNote(noteFor(exerciseId, customs)); return; }
    let live = true;
    void getCustomExercises().then((c) => { if (live) { setLoaded(c); setNote(noteFor(exerciseId, c)); } }, () => { if (live) { setLoaded([]); setNote(noteFor(exerciseId, [])); } });
    return () => { live = false; };
  }, [exerciseId, customs]);
  const save = async (text: string) => {
    await saveNote(exerciseId, text, loaded ?? undefined);
    const fresh = loaded?.some((c) => c.id === exerciseId) ? await getCustomExercises() : loaded ?? [];
    setLoaded(fresh);
    setNote(noteFor(exerciseId, fresh));
  };
  return { note, editing, setEditing, save };
}

export function ExerciseNoteButton({ name, state, id }: { name: string; state: ExerciseNote; id?: string }) {
  return <button id={id} type="button" className="btn-secondary exercise-note-open" aria-label={`Note for ${name}`} aria-expanded={state.editing}
    onClick={() => state.setEditing(!state.editing)}>NOTE</button>;
}

export function ExerciseNoteLine({ name, state, returnFocusTo }: { name: string; state: ExerciseNote; returnFocusTo?: string }) {
  const { note, editing, setEditing, save } = state;
  const [text, setText] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => { if (editing) { setText(note ?? ""); setError(null); requestAnimationFrame(() => inputRef.current?.focus()); } }, [editing, note]);
  const close = () => { setEditing(false); if (returnFocusTo) requestAnimationFrame(() => document.getElementById(returnFocusTo)?.focus()); };
  const commit = async (value: string) => {
    setBusy(true); setError(null);
    try { await save(value); close(); } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); } finally { setBusy(false); }
  };
  return <>
    {note && !editing && <p className="exercise-note" data-exercise-note>Your note: {note}</p>}
    {editing && <div className="exercise-note-edit" role="group" aria-label={`Note for ${name}`}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}>
      <label htmlFor={`${id}-text`} className="exercise-note-edit__label">Your note on {name}</label>
      <input ref={inputRef} id={`${id}-text`} type="text" maxLength={EXERCISE_NOTE_MAX} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void commit(text); }} placeholder="Seat 4, handles at chest height" />
      <p className="exercise-note-edit__count" aria-live="off">{text.length} of {EXERCISE_NOTE_MAX}</p>
      {error && <p className="exercise-note-edit__count" role="alert">{error}</p>}
      <div className="exercise-note-edit__acts">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void commit(text)}>SAVE</button>
        {note && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void commit("")}>CLEAR</button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={close}>CANCEL</button>
      </div>
    </div>}
  </>;
}

/**
 * The live workout's note: the line straight under the exercise name, then the row with whatever sits beside NOTE
 * (HOW TO). The note follows the planned exercise, so a swapped-in machine still shows it.
 */
export function ExerciseNoteBlock({ exerciseId, name, beside }: { exerciseId: string; name: string; beside?: React.ReactNode }) {
  const state = useExerciseNote(exerciseId);
  const buttonId = `exercise-note-${useId().replace(/:/g, "")}`;
  return <>
    <ExerciseNoteLine name={name} state={state} returnFocusTo={buttonId} />
    <div className="exercise-note-row">{beside}<ExerciseNoteButton id={buttonId} name={name} state={state} /></div>
  </>;
}
