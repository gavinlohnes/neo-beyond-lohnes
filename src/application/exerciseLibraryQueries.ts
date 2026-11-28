import { db } from "../persistence/db";
import { parseCustomExercise } from "../persistence/exerciseValidation";
import type { CustomExercise } from "../domain/workout/customExercise";
import { fixedExerciseNames } from "../domain/workout/routineEdit";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import { isOpenExerciseId } from "../domain/workout/openLibrary";

/** Same shape as getSavedMeals (nutritionQueries.ts): excludes archived by default, newest first. */
export async function getCustomExercises(options: { includeArchived?: boolean } = {}): Promise<CustomExercise[]> {
  const raw = await db.customExercises.toArray();
  const parsed = raw.map(parseCustomExercise).filter((e): e is CustomExercise => e !== null);
  const filtered = options.includeArchived ? parsed : parsed.filter((e) => !e.archivedAt);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Drop 1.6a: display names for every exercise id that can appear in logged
 * history — built-in template exercises and the personal library (archived
 * included, since old logs still name them). Unknown ids are left out; the
 * caller falls back to the id.
 */
export async function getExerciseNames(): Promise<Record<string, string>> {
  const fixed = fixedExerciseNames();
  const names: Record<string, string> = {};
  for (const template of Object.values(WORKOUT_TEMPLATES)) for (const ex of template.exercises) names[ex.exerciseId] = ex.name;
  for (const ex of await getCustomExercises({ includeArchived: true })) names[ex.id] = ex.name;
  // GRAYSON-ROUTINE-EDIT-001: a bundled-library exercise can appear in history once a routine has held it (his own, or
  // an edit of A, B or C). Only those are named, so search still lists each lift once.
  // GRAYSON-WORKOUT-CHANGES-001: or once added or swapped into a live workout.
  const [templates, edits] = await Promise.all([db.customWorkoutTemplates.toArray(), db.events.where("type").anyOf(["ROUTINE_EDITED", "WORKOUT_PLAN_CHANGED"]).toArray()]);
  const used = [
    ...templates.flatMap((t) => (Array.isArray(t?.exercises) ? t.exercises : [])),
    ...edits.flatMap((e) => {
      const p = e.payload as { exercises?: unknown; previous?: { exercises?: unknown }; change?: { exercise?: unknown } } | undefined;
      return [p?.exercises, p?.previous?.exercises, p?.change?.exercise ? [p.change.exercise] : undefined].flatMap((list) => (Array.isArray(list) ? list : []));
    }),
  ];
  for (const ex of used) {
    const id = (ex as { exerciseId?: unknown } | null)?.exerciseId;
    if (typeof id === "string" && !(id in names) && fixed.has(id)) names[id] = fixed.get(id)!;
    // GRAYSON-OPEN-LIBRARY-001: an open exercise keeps the name its routine saved, whatever the bundled file says later.
    const name = (ex as { name?: unknown } | null)?.name;
    if (typeof id === "string" && !(id in names) && isOpenExerciseId(id) && typeof name === "string" && name.trim()) names[id] = name.trim();
  }
  return names;
}
