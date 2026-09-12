import { db } from "../persistence/db";
import { newId } from "./commands";
import type { CustomExercise } from "../domain/workout/customExercise";
import {
  customExerciseInputSchema,
  customExerciseModifyInputSchema,
  type CustomExerciseInput,
  type CustomExerciseModifyInput,
} from "../persistence/exerciseValidation";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library, High-Risk Drop). A
 * CustomExercise is a small, directly-mutable reusable definition — same
 * treatment as SavedMeal (application/nutritionCommands.ts): no
 * DomainEvent trail for its own create/edit/archive lifecycle, since
 * nothing about "what exercises exist" is itself meaningful historical
 * fact. Deliberately does not touch WORKOUT_TEMPLATES, PerformedSet, or
 * any Engine file — this Drop's scope is the personal library only.
 */
function notFound(id: string): Error {
  return new Error(`CUSTOM_EXERCISE_NOT_FOUND: no custom exercise with id ${id}.`);
}

export async function createCustomExercise(input: CustomExerciseInput): Promise<CustomExercise> {
  const parsed = customExerciseInputSchema.parse(input);
  const exercise: CustomExercise = {
    id: newId(),
    name: parsed.name,
    muscleGroup: parsed.muscleGroup,
    equipment: parsed.equipment,
    repRangeLow: parsed.repRangeLow,
    repRangeHigh: parsed.repRangeHigh,
    ...(parsed.notes ? { notes: parsed.notes } : {}),
    ...(parsed.libraryExerciseId ? { libraryExerciseId: parsed.libraryExerciseId } : {}),
    createdAt: new Date().toISOString(),
  };
  await db.customExercises.add(exercise);
  return exercise;
}

export async function updateCustomExercise(id: string, changes: CustomExerciseModifyInput): Promise<CustomExercise> {
  const parsed = customExerciseModifyInputSchema.parse(changes);
  const existing = await db.customExercises.get(id);
  if (!existing) throw notFound(id);
  const updated: CustomExercise = {
    ...existing,
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.muscleGroup !== undefined ? { muscleGroup: parsed.muscleGroup } : {}),
    ...(parsed.equipment !== undefined ? { equipment: parsed.equipment } : {}),
    ...(parsed.repRangeLow !== undefined ? { repRangeLow: parsed.repRangeLow } : {}),
    ...(parsed.repRangeHigh !== undefined ? { repRangeHigh: parsed.repRangeHigh } : {}),
    ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
  };
  await db.customExercises.put(updated);
  return updated;
}

/**
 * One-way "no longer offered" flag, not a delete — matching
 * archiveSavedMeal/archiveMission's precedent. Idempotent.
 */
export async function archiveCustomExercise(id: string): Promise<void> {
  const existing = await db.customExercises.get(id);
  if (!existing) throw notFound(id);
  if (existing.archivedAt) return;
  await db.customExercises.update(id, { archivedAt: new Date().toISOString() });
}
