import { db } from "../persistence/db";
import { parseCustomExercise } from "../persistence/exerciseValidation";
import type { CustomExercise } from "../domain/workout/customExercise";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";

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
  const names: Record<string, string> = {};
  for (const template of Object.values(WORKOUT_TEMPLATES)) {
    for (const ex of template.exercises) names[ex.exerciseId] = ex.name;
  }
  for (const ex of await getCustomExercises({ includeArchived: true })) names[ex.id] = ex.name;
  return names;
}
