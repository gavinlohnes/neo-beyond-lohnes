import { z } from "zod";
import type { SavedMeal } from "../domain/common/types";

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop): same shared-schema pattern
 * as intentValidation.ts/schedulePatternValidation.ts — an *Input schema
 * validates a command's caller-supplied fields (throws via .parse(), a
 * mistake here is the user's own live edit); the full record schema
 * validates what comes back out of Dexie on every read (safeParse, never
 * throws — an invalid row is simply excluded from query results, never
 * crashes or destructively deletes anything).
 *
 * No calorie/macro target or "healthy range" is enforced here — only
 * that values are real, non-negative numbers. BEYOND records facts; it
 * does not judge whether 3000 calories or 1g of protein is a good idea.
 */

const savedMealInputFields = {
  name: z.string().trim().min(1, "Meal name is required"),
  calories: z.number().min(0, "Calories must be zero or more"),
  proteinG: z.number().min(0, "Protein must be zero or more"),
  carbsG: z.number().min(0, "Carbs must be zero or more"),
  fatG: z.number().min(0, "Fat must be zero or more"),
};

/** Input to createSavedMeal. id/createdAt/archivedAt are assigned by the command, not the caller. */
export const savedMealInputSchema = z.object(savedMealInputFields);
export type SavedMealInput = z.infer<typeof savedMealInputSchema>;

/** Input to updateSavedMeal — same fields, all optional, at least one required. */
export const savedMealModifyInputSchema = z
  .object({
    name: savedMealInputFields.name.optional(),
    calories: savedMealInputFields.calories.optional(),
    proteinG: savedMealInputFields.proteinG.optional(),
    carbsG: savedMealInputFields.carbsG.optional(),
    fatG: savedMealInputFields.fatG.optional(),
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field must change");
export type SavedMealModifyInput = z.infer<typeof savedMealModifyInputSchema>;

export const savedMealSchema = z.object({
  id: z.string().min(1),
  name: savedMealInputFields.name,
  calories: savedMealInputFields.calories,
  proteinG: savedMealInputFields.proteinG,
  carbsG: savedMealInputFields.carbsG,
  fatG: savedMealInputFields.fatG,
  createdAt: z.string(),
  archivedAt: z.string().optional(),
});

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseSavedMeal(raw: unknown): SavedMeal | null {
  const result = savedMealSchema.safeParse(raw);
  return result.success ? (result.data as SavedMeal) : null;
}
