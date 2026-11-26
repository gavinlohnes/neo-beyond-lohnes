import { db } from "../persistence/db";
import { parseCustomWorkoutTemplate, parseRoutineEditedPayload } from "../persistence/workoutTemplateValidation";
import { builtInRoutineAt, customRoutineAt, isBuiltInRoutine, routineEditEntries, type RoutineEditEntry } from "../domain/workout/routineEdit";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import {
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

/** GRAYSON-ROUTINE-EDIT-001: every usable ROUTINE_EDITED, in causal order. */
export async function getRoutineEditEntries(): Promise<RoutineEditEntry[]> {
  return routineEditEntries(await db.events.where("type").equals("ROUTINE_EDITED").toArray(), parseRoutineEditedPayload);
}

/** A point in the event log: a workout's start (its WORKOUT_STARTED seq, else its start time). */
export interface RoutinePoint { seq?: number | undefined; at: string }

/** Where a workout started, so its routine is read as it was then: an edit saved mid-workout applies from the next. */
export async function getSessionRoutinePoint(session: { id: string; startedAt: string }): Promise<RoutinePoint> {
  const started = (await db.events.where("type").equals("WORKOUT_STARTED").toArray())
    .find((event) => (event.payload as { sessionId?: unknown } | undefined)?.sessionId === session.id);
  return { seq: started?.seq, at: started?.recordedAt ?? session.startedAt };
}

/**
 * TRAIN-CREATE-002: the one seam that lets the rest of the app treat a custom template's id like a built-in one.
 * GRAYSON-ROUTINE-EDIT-001: A, B and C resolve to his latest edit (ROUTINE_EDITED), else the code's version; with
 * `asOf`, to the routine as it was at that point (a workout's start). Returns undefined for an unknown or archived id;
 * callers already treat "no exercises" as valid (RECOVERY's own [] case).
 */
export async function resolveTemplateDefinition(templateId: WorkoutTemplateId, asOf?: RoutinePoint): Promise<WorkoutTemplateDefinition | undefined> {
  if (isBuiltInRoutine(templateId)) {
    return { id: templateId, exercises: builtInRoutineAt(templateId, await getRoutineEditEntries(), asOf).exercises };
  }
  const raw = await db.customWorkoutTemplates.get(templateId);
  if (!raw) return undefined;
  const parsed = parseCustomWorkoutTemplate(raw);
  if (!parsed || parsed.archivedAt) return undefined;
  const exercises = asOf
    ? customRoutineAt(templateId, { name: parsed.name, exercises: parsed.exercises }, await getRoutineEditEntries(), asOf).exercises
    : parsed.exercises;
  return { id: parsed.id, exercises };
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
  asOf?: RoutinePoint,
): Promise<ExercisePrescription[]> {
  const definition = await resolveTemplateDefinition(templateId, asOf);
  if (!definition) return [];
  return sessionType === "REDUCED" ? reducedExercises(definition.exercises) : definition.exercises;
}

/** REDUCED = the first two exercises, two working sets each (Decision Register), for any routine. */
export const reducedExercises = (exercises: readonly ExercisePrescription[]): ExercisePrescription[] =>
  exercises.slice(0, 2).map((ex) => ({ ...ex, sets: 2 }));

export async function resolvePrescription(
  templateId: WorkoutTemplateId,
  sessionType: "STANDARD" | "REDUCED",
  exerciseId: string,
): Promise<ExercisePrescription | undefined> {
  const exercises = await resolveTemplateExercises(templateId, sessionType);
  return exercises.find((ex) => ex.exerciseId === exerciseId);
}
