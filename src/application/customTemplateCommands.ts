import { db } from "../persistence/db";
import { newId } from "./commands";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import {
  customWorkoutTemplateInputSchema,
  customWorkoutTemplateModifyInputSchema,
  type CustomWorkoutTemplateInput,
  type CustomWorkoutTemplateModifyInput,
} from "../persistence/workoutTemplateValidation";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates, High-Risk Drop). A
 * CustomWorkoutTemplate is a small, directly-mutable reusable record —
 * same treatment as CustomExercise/SavedMeal: no DomainEvent trail for
 * its own create/edit/archive lifecycle. What IS real historical fact —
 * a workout actually performed against this template — is produced only
 * by the existing trainCommands.ts (startWorkout/logSet/completeWorkout),
 * unchanged by this Drop: those commands already store templateId as a
 * plain string and never re-read this record, so editing/archiving a
 * template afterward never rewrites a past workout session's history.
 */
function notFound(id: string): Error {
  return new Error(`CUSTOM_TEMPLATE_NOT_FOUND: no custom workout template with id ${id}.`);
}

export async function createCustomTemplate(input: CustomWorkoutTemplateInput): Promise<CustomWorkoutTemplate> {
  const parsed = customWorkoutTemplateInputSchema.parse(input);
  const template: CustomWorkoutTemplate = {
    id: newId(),
    name: parsed.name,
    exercises: parsed.exercises,
    createdAt: new Date().toISOString(),
  };
  await db.customWorkoutTemplates.add(template);
  return template;
}

export async function updateCustomTemplate(
  id: string,
  changes: CustomWorkoutTemplateModifyInput,
): Promise<CustomWorkoutTemplate> {
  const parsed = customWorkoutTemplateModifyInputSchema.parse(changes);
  const existing = await db.customWorkoutTemplates.get(id);
  if (!existing) throw notFound(id);
  const updated: CustomWorkoutTemplate = {
    ...existing,
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.exercises !== undefined ? { exercises: parsed.exercises } : {}),
  };
  await db.customWorkoutTemplates.put(updated);
  return updated;
}

/**
 * One-way "no longer offered" flag, not a delete — matching
 * archiveCustomExercise/archiveSavedMeal's precedent. Idempotent. A
 * workout session already logged against this template keeps its stored
 * templateId untouched and keeps working exactly as before — only
 * removed from the active picker list.
 */
export async function archiveCustomTemplate(id: string): Promise<void> {
  const existing = await db.customWorkoutTemplates.get(id);
  if (!existing) throw notFound(id);
  if (existing.archivedAt) return;
  await db.customWorkoutTemplates.update(id, { archivedAt: new Date().toISOString() });
}
