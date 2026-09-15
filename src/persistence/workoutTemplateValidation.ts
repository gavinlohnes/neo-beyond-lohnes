import { z } from "zod";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates): same shared-schema pattern
 * as exerciseValidation.ts — an *Input schema validates a command's
 * caller-supplied fields (throws via .parse(), a mistake here is the
 * user's own live edit); the full record schema validates what comes
 * back out of Dexie on every read (safeParse, never throws — an invalid
 * row is simply excluded from query results, never crashes or
 * destructively deletes anything).
 */

const exerciseSlotFields = {
  exerciseId: z.string().min(1),
  name: z.string().trim().min(1),
  sets: z.number().int().min(1),
  repRangeLow: z.number().int().min(1),
  repRangeHigh: z.number().int().min(1),
  incrementLbs: z.number().min(0),
};

const exerciseSlotSchema = z
  .object(exerciseSlotFields)
  .refine((v) => v.repRangeHigh >= v.repRangeLow, "Rep range high must be at or above rep range low");

const customWorkoutTemplateInputFields = {
  name: z.string().trim().min(1, "Template name is required"),
  exercises: z.array(exerciseSlotSchema).min(1, "At least one exercise is required"),
};

/** Input to createCustomTemplate. id/createdAt/archivedAt are assigned by the command, not the caller. */
export const customWorkoutTemplateInputSchema = z.object(customWorkoutTemplateInputFields);
export type CustomWorkoutTemplateInput = z.infer<typeof customWorkoutTemplateInputSchema>;

/** Input to updateCustomTemplate — same fields, all optional, at least one required. */
export const customWorkoutTemplateModifyInputSchema = z
  .object({
    name: customWorkoutTemplateInputFields.name.optional(),
    exercises: customWorkoutTemplateInputFields.exercises.optional(),
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field must change");
export type CustomWorkoutTemplateModifyInput = z.infer<typeof customWorkoutTemplateModifyInputSchema>;

export const customWorkoutTemplateSchema = z.object({
  id: z.string().min(1),
  name: customWorkoutTemplateInputFields.name,
  exercises: customWorkoutTemplateInputFields.exercises,
  createdAt: z.string(),
  archivedAt: z.string().optional(),
});

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseCustomWorkoutTemplate(raw: unknown): CustomWorkoutTemplate | null {
  const result = customWorkoutTemplateSchema.safeParse(raw);
  return result.success ? (result.data as CustomWorkoutTemplate) : null;
}
