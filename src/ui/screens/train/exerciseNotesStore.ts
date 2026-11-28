import { updateCustomExercise } from "../../../application/exerciseLibraryCommands";
import { getCustomExercises } from "../../../application/exerciseLibraryQueries";
import type { CustomExercise } from "../../../domain/workout/customExercise";
import { TEMPLATE_TO_LIBRARY_ID } from "../../../domain/workout/exerciseHowTo";

/**
 * GRAYSON-TRAIN-NOTES-001 (Gavin, 2026-11-24): his own one-line note on any exercise ("Seat 4, handles at chest
 * height"), shown under its name in the live workout. A preference, not history: `beyond.exerciseNotes.v1` holds
 * `{ [noteKey]: { text, updatedAt } }`, validated on read, travelling with his settings as "Exercise notes".
 * A built-in A/B/C exercise and its library entry share one note (HOWTO-001's id map). An exercise he made himself
 * keeps its note in its own `notes` field, so it never has two.
 */
export const EXERCISE_NOTES_KEY = "beyond.exerciseNotes.v1";
export const EXERCISE_NOTE_MAX = 140;

interface StoredNote { text: string; updatedAt: string }

/** The one key a built-in exercise and its library entry share. */
export const noteKeyFor = (exerciseId: string): string => TEMPLATE_TO_LIBRARY_ID[exerciseId] ?? exerciseId;

const valid = (v: unknown): v is StoredNote => {
  const n = v as Partial<StoredNote> | null;
  return !!n && typeof n.text === "string" && n.text.trim() !== "" && n.text.length <= EXERCISE_NOTE_MAX && typeof n.updatedAt === "string";
};

function readAll(): Record<string, StoredNote> {
  let raw: unknown;
  try { raw = JSON.parse(localStorage.getItem(EXERCISE_NOTES_KEY) ?? "null"); } catch { return {}; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const notes: Record<string, StoredNote> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (valid(v)) notes[k] = v;
  return notes;
}

/** The note for a library or built-in exercise, or null. Anything bad in storage reads as no note. */
export function readExerciseNote(exerciseId: string): string | null {
  const all = readAll();
  // GRAYSON-HOME-STRETCH-001: Glute Bridge and Plank's home ids now share their library entry's note; one saved under
  // the home id before that still shows.
  return all[noteKeyFor(exerciseId)]?.text ?? all[exerciseId]?.text ?? null;
}

export function checkExerciseNote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length > EXERCISE_NOTE_MAX) throw new Error(`NOTE_TOO_LONG: keep it to ${EXERCISE_NOTE_MAX} characters.`);
  return trimmed;
}

/** Saves (or, when blank, clears) the shared note. */
export function writeExerciseNote(exerciseId: string, text: string, now: Date = new Date()): void {
  const trimmed = checkExerciseNote(text);
  const notes = readAll();
  if (trimmed) notes[noteKeyFor(exerciseId)] = { text: trimmed, updatedAt: now.toISOString() };
  else delete notes[noteKeyFor(exerciseId)];
  // An older note kept under the raw id gives way to the shared one, so a cleared note doesn't come back.
  if (noteKeyFor(exerciseId) !== exerciseId) delete notes[exerciseId];
  try { localStorage.setItem(EXERCISE_NOTES_KEY, JSON.stringify(notes)); } catch { /* storage blocked: unchanged */ }
}

export const clearExerciseNote = (exerciseId: string): void => writeExerciseNote(exerciseId, "");

/** The note for any exercise: his own exercise's `notes` field, otherwise the shared note. */
export function noteFor(exerciseId: string, customs: readonly CustomExercise[]): string | null {
  const own = customs.find((c) => c.id === exerciseId);
  if (own) return own.notes?.trim() || null;
  return readExerciseNote(exerciseId);
}

/** Saves a note wherever it lives: through updateCustomExercise for his own exercise, else the shared key. */
export async function saveNote(exerciseId: string, text: string, customs?: readonly CustomExercise[]): Promise<void> {
  const trimmed = checkExerciseNote(text);
  const own = (customs ?? await getCustomExercises()).find((c) => c.id === exerciseId);
  if (own) await updateCustomExercise(own.id, { notes: trimmed });
  else writeExerciseNote(exerciseId, trimmed);
}
