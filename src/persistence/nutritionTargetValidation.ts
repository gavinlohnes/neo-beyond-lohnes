import { z } from "zod";
import type { NutritionTargets } from "../domain/common/types";

/**
 * NUTRITION-003 (Calorie + Protein Targets, High-Risk Drop): same
 * shared-schema pattern as schedulePatternValidation.ts — the read path
 * (nutritionTargetQueries.ts) falls back to DEFAULT_NUTRITION_TARGETS on
 * failure ("unknown is better than false precision"); the write path
 * (nutritionTargetCommands.ts) rejects malformed input outright, since
 * that's the operator's own live edit, not an imported file.
 *
 * calorieTargetKcal is optional in the stored record — "no calorie
 * target set yet" is a valid, meaningful state, not zero. The update
 * input follows the same partial-update convention as every other
 * *ModifyInput in this codebase: an omitted field means "leave
 * unchanged," not "clear" — there is no clear-to-unset path in this
 * Drop's scope once a target has been set. proteinMultiplierGPerLb is
 * bounded to a sane
 * range so a typo can't silently produce a nonsense target; the bound is
 * generous enough to include every real-world protein-per-bodyweight
 * heuristic in use, not just the owner's own chosen 0.8-1.0 g/lb range.
 */
const nutritionTargetFields = {
  calorieTargetKcal: z.number().positive().optional(),
  proteinMultiplierGPerLb: z.number().min(0.1).max(3),
};

/** Input to updateNutritionTargets — id/createdAt/updatedAt are assigned by the command, not the caller. At least one field must be present. */
export const nutritionTargetsInputSchema = z
  .object({
    calorieTargetKcal: nutritionTargetFields.calorieTargetKcal,
    proteinMultiplierGPerLb: nutritionTargetFields.proteinMultiplierGPerLb.optional(),
  })
  .refine((v) => v.calorieTargetKcal !== undefined || v.proteinMultiplierGPerLb !== undefined, "At least one field must change");
export type NutritionTargetsInput = z.infer<typeof nutritionTargetsInputSchema>;

export const nutritionTargetsSchema = z.object({
  id: z.string(),
  calorieTargetKcal: nutritionTargetFields.calorieTargetKcal,
  proteinMultiplierGPerLb: nutritionTargetFields.proteinMultiplierGPerLb,
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Never throws. Returns null on any validation failure so callers can decide the fallback. */
export function parseNutritionTargets(raw: unknown): NutritionTargets | null {
  const result = nutritionTargetsSchema.safeParse(raw);
  return result.success ? (result.data as NutritionTargets) : null;
}
