import { db } from "../persistence/db";
import { parseCustomWorkoutTemplate } from "../persistence/workoutTemplateValidation";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import {
  WORKOUT_TEMPLATES,
  type ExercisePrescription,
  type WorkoutTemplateDefinition,
  type WorkoutTemplateId,
} from "../domain/workout/types";

/** Same shape as getCustomExercises/getSavedMeals: excludes archived by default, newest first. */
export async function getCustomTemplates(options: { includeArchived?: boolean } = {}): Promise<CustomWorkoutTemplate[]> {
  const raw = await db.customWorkoutTemplates.toArray();
  const parsed = raw.map(parseCustomWorkoutTemplate).filter((t): t is CustomWorkoutTemplate => t !== null);
  const filtered = options.includeArchived ? parsed : parsed.filter((t) => !t.archivedAt);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * TRAIN-CREATE-002: the one seam that lets the rest of the app treat a
 * custom template's id like a built-in one, without ever touching
 * WORKOUT_TEMPLATES' own fixed dictionary (domain/workout/types.ts's
 * getPrescription/getReducedExercises remain scoped to the built-in
 * three, unchanged). Checks the locked built-in dictionary first — same
 * three templates, same content — and only falls back to the operator's
 * own custom templates for anything else. Returns undefined for an
 * unknown or archived id; callers already treat "no exercises" as valid
 * (RECOVERY's own [] case).
 */
export async function resolveTemplateDefinition(templateId: WorkoutTemplateId): Promise<WorkoutTemplateDefinition | undefined> {
  const builtIn = WORKOUT_TEMPLATES[templateId];
  if (builtIn) return builtIn;
  const raw = await db.customWorkoutTemplates.get(templateId);
  if (!raw) return undefined;
  const parsed = parseCustomWorkoutTemplate(raw);
  if (!parsed || parsed.archivedAt) return undefined;
  return { id: parsed.id, exercises: parsed.exercises };
}

/**
 * Same REDUCED rule as domain/workout/types.ts's getReducedExercises
 * ("first two exercises, two working sets each") — reused generically
 * for a custom template too, rather than inventing a second rule. A
 * custom template with fewer than two exercises simply yields fewer.
 */
export async function resolveTemplateExercises(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
): Promise<ExercisePrescription[]> {
  const definition = await resolveTemplateDefinition(templateId);
  if (!definition) return [];
  return sessionType === "REDUCED" ? definition.exercises.slice(0, 2).map((ex) => ({ ...ex, sets: 2 })) : definition.exercises;
}

export async function resolvePrescription(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): Promise<ExercisePrescription | undefined> {
  const exercises = await resolveTemplateExercises(templateId, sessionType);
  return exercises.find((ex) => ex.exerciseId === exerciseId);
}
