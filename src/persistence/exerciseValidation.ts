import { z } from "zod";
import type { CustomExercise } from "../domain/workout/customExercise";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library): same shared-schema
 * pattern as nutritionValidation.ts — an *Input schema validates a
 * command's caller-supplied fields (throws via .parse(), a mistake here
 * is the user's own live edit); the full record schema validates what
 * comes back out of Dexie on every read (safeParse, never throws — an
 * invalid row is simply excluded from query results, never crashes or
 * destructively deletes anything).
 */

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Glutes", "Arms", "Core", "Full Body"] as const;

const customExerciseInputFields = {
  name: z.string().trim().min(1, "Exercise name is required"),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.string().trim().min(1, "Equipment is required"),
  repRangeLow: z.number().int().min(1, "Rep range low must be at least 1"),
  repRangeHigh: z.number().int().min(1, "Rep range high must be at least 1"),
  notes: z.string().trim().optional(),
  libraryExerciseId: z.string().optional(),
};

/** Input to createCustomExercise. id/createdAt/archivedAt are assigned by the command, not the caller. */
export const customExerciseInputSchema = z
  .object(customExerciseInputFields)
  .refine((v) => v.repRangeHigh >= v.repRangeLow, "Rep range high must be at or above rep range low");
export type CustomExerciseInput = z.infer<typeof customExerciseInputSchema>;

/** Input to updateCustomExercise — same fields, all optional, at least one required. libraryExerciseId is provenance, not editable. */
export const customExerciseModifyInputSchema = z
  .object({
    name: customExerciseInputFields.name.optional(),
    muscleGroup: customExerciseInputFields.muscleGroup.optional(),
    equipment: customExerciseInputFields.equipment.optional(),
    repRangeLow: customExerciseInputFields.repRangeLow.optional(),
    repRangeHigh: customExerciseInputFields.repRangeHigh.optional(),
    notes: customExerciseInputFields.notes,
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field must change");
export type CustomExerciseModifyInput = z.infer<typeof customExerciseModifyInputSchema>;

export const customExerciseSchema = z
  .object({
    id: z.string().min(1),
    name: customExerciseInputFields.name,
    muscleGroup: customExerciseInputFields.muscleGroup,
    equipment: customExerciseInputFields.equipment,
    repRangeLow: customExerciseInputFields.repRangeLow,
    repRangeHigh: customExerciseInputFields.repRangeHigh,
    notes: z.string().optional(),
    libraryExerciseId: z.string().optional(),
    createdAt: z.string(),
    archivedAt: z.string().optional(),
  })
  .refine((v) => v.repRangeHigh >= v.repRangeLow);

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseCustomExercise(raw: unknown): CustomExercise | null {
  const result = customExerciseSchema.safeParse(raw);
  return result.success ? (result.data as CustomExercise) : null;
}
