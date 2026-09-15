import { db } from "../persistence/db";
import {
  nutritionTargetsInputSchema,
  type NutritionTargetsInput,
} from "../persistence/nutritionTargetValidation";
import type { NutritionTargets } from "../domain/common/types";

/**
 * NUTRITION-003 (Calorie + Protein Targets, High-Risk Drop, direct owner
 * ruling). The only writer of the nutritionTargets "current" row. This is
 * configuration, not domain history — same treatment as
 * updateSchedulePattern: no per-edit DomainEvent, since "what target is
 * the operator currently aiming for" isn't itself a historical fact the
 * way a logged meal is. Explicit rejection on malformed input (unlike the
 * read path's silent DEFAULT_NUTRITION_TARGETS fallback) because this is
 * the operator's own live edit, not a possibly-corrupted imported file —
 * a mistake here should surface immediately, not silently substitute a
 * different target.
 */
export async function updateNutritionTargets(input: NutritionTargetsInput): Promise<NutritionTargets> {
  const parsed = nutritionTargetsInputSchema.parse(input);
  const existing = await db.nutritionTargets.get("current");
  const now = new Date().toISOString();
  const effectiveCalorieTarget = parsed.calorieTargetKcal ?? existing?.calorieTargetKcal;
  const record: NutritionTargets = {
    id: "current",
    ...(effectiveCalorieTarget !== undefined ? { calorieTargetKcal: effectiveCalorieTarget } : {}),
    proteinMultiplierGPerLb: parsed.proteinMultiplierGPerLb ?? existing?.proteinMultiplierGPerLb ?? 1.0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.nutritionTargets.put(record);
  return record;
}
