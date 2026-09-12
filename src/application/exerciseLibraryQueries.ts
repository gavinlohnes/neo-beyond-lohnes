import { db } from "../persistence/db";
import { parseCustomExercise } from "../persistence/exerciseValidation";
import type { CustomExercise } from "../domain/workout/customExercise";

/** Same shape as getSavedMeals (nutritionQueries.ts): excludes archived by default, newest first. */
export async function getCustomExercises(options: { includeArchived?: boolean } = {}): Promise<CustomExercise[]> {
  const raw = await db.customExercises.toArray();
  const parsed = raw.map(parseCustomExercise).filter((e): e is CustomExercise => e !== null);
  const filtered = options.includeArchived ? parsed : parsed.filter((e) => !e.archivedAt);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
