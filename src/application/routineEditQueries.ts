import { getCustomExercises } from "./exerciseLibraryQueries";
import { getCustomTemplates, getRoutineEditEntries } from "./customTemplateQueries";
import { getTrainingProgramme } from "./trainingProgramme";
import { EXERCISE_LIBRARY } from "../domain/workout/exerciseLibrary";
import { deriveIncrementLbs, WORKOUT_TEMPLATE_ORDER, type ExercisePrescription } from "../domain/workout/types";
import { builtInRoutineAt, originalBuiltInExercises, routineEditState, sameRoutine, type RoutineEditEntry } from "../domain/workout/routineEdit";

/** GRAYSON-ROUTINE-EDIT-001: every routine the editor can open, A, B and C first. Reads only. */
export interface RoutineView {
  templateId: string;
  /** "Workout A", or his routine's own name. */
  label: string;
  builtIn: boolean;
  /** His own routine's name (A, B and C have none). */
  name?: string;
  exercises: ExercisePrescription[];
  /** A, B or C differs from the original; his own differs from as first saved. */
  edited: boolean;
  /** The newest change (the one UNDO takes back), if any. */
  latestEditEventId: string | null;
  /** A member (or SHORT / HOME link) of the active A → B → C sequence. */
  inProgramme: boolean;
}

function viewOf(templateId: string, entries: readonly RoutineEditEntry[], custom?: { name: string; exercises: ExercisePrescription[] }, inProgramme = false): RoutineView {
  const { latest, firstSaved } = routineEditState(templateId, entries);
  if (!custom) {
    const exercises = builtInRoutineAt(templateId, entries).exercises;
    return { templateId, label: `Workout ${templateId}`, builtIn: true, exercises, inProgramme,
      edited: JSON.stringify(exercises) !== JSON.stringify(originalBuiltInExercises(templateId)), latestEditEventId: latest?.eventId ?? null };
  }
  return { templateId, label: custom.name, name: custom.name, builtIn: false, exercises: custom.exercises, inProgramme,
    edited: firstSaved !== null && !sameRoutine(firstSaved, custom), latestEditEventId: latest?.eventId ?? null };
}

export async function getRoutineViews(): Promise<RoutineView[]> {
  const [entries, custom, programme] = await Promise.all([getRoutineEditEntries(), getCustomTemplates(), getTrainingProgramme().catch(() => ({ programme: null }))]);
  const linked = new Set(programme.programme?.mode === "SEQUENCE"
    ? programme.programme.members.flatMap((m) => [m.templateId, m.home?.templateId, m.short?.templateId].filter((id): id is string => !!id)) : []);
  return [
    ...WORKOUT_TEMPLATE_ORDER.map((id) => viewOf(id, entries)),
    ...custom.map((t) => viewOf(t.id, entries, { name: t.name, exercises: t.exercises }, linked.has(t.id))),
  ];
}

export async function getRoutineView(templateId: string): Promise<RoutineView | null> {
  return (await getRoutineViews()).find((view) => view.templateId === templateId) ?? null;
}

/** One thing ADD EXERCISE or SWAP can put in a routine. */
export interface RoutineExerciseChoice {
  exerciseId: string;
  name: string;
  detail: string;
  repRangeLow: number;
  repRangeHigh: number;
  incrementLbs: number;
  mine: boolean;
}

/**
 * His own exercises first, then A, B and C's own movements (their ids, so a lift swapped out and back keeps its
 * history), then the bundled library. A library entry he already saved, or one with the same name as an entry above,
 * isn't listed twice.
 */
export async function getRoutineExerciseChoices(): Promise<RoutineExerciseChoice[]> {
  const mine = await getCustomExercises();
  const seeded = new Set(mine.flatMap((ex) => (ex.libraryExerciseId ? [ex.libraryExerciseId] : [])));
  const choices: RoutineExerciseChoice[] = mine.map((ex) => ({ exerciseId: ex.id, name: ex.name, detail: `${ex.muscleGroup} · ${ex.equipment} · yours`,
    repRangeLow: ex.repRangeLow, repRangeHigh: ex.repRangeHigh, incrementLbs: deriveIncrementLbs(ex.equipment, ex.muscleGroup), mine: true }));
  const named = new Set(choices.map((c) => c.name.trim().toLowerCase()));
  const seen = new Set<string>();
  for (const id of WORKOUT_TEMPLATE_ORDER) {
    for (const ex of originalBuiltInExercises(id) ?? []) {
      if (seen.has(ex.exerciseId) || named.has(ex.name.toLowerCase())) continue;
      seen.add(ex.exerciseId);
      choices.push({ exerciseId: ex.exerciseId, name: ex.name, detail: `In Workout ${id}`, repRangeLow: ex.repRangeLow, repRangeHigh: ex.repRangeHigh, incrementLbs: ex.incrementLbs, mine: false });
    }
  }
  for (const c of choices) named.add(c.name.trim().toLowerCase());
  for (const ex of EXERCISE_LIBRARY) {
    if (seeded.has(ex.id) || named.has(ex.name.toLowerCase())) continue;
    choices.push({ exerciseId: ex.id, name: ex.name, detail: `${ex.muscleGroup} · ${ex.equipment}`, repRangeLow: ex.repRangeLow,
      repRangeHigh: ex.repRangeHigh, incrementLbs: deriveIncrementLbs(ex.equipment, ex.muscleGroup), mine: false });
  }
  return choices;
}

/** Case-insensitive on name and detail; an empty query lists everything. */
export function filterRoutineExerciseChoices(choices: readonly RoutineExerciseChoice[], query: string): RoutineExerciseChoice[] {
  const q = query.trim().toLowerCase();
  return q ? choices.filter((c) => c.name.toLowerCase().includes(q) || c.detail.toLowerCase().includes(q)) : [...choices];
}
