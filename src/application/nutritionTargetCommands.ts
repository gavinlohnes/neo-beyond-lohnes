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
  const effectiveGoalWeight = parsed.goalWeightLbs ?? existing?.goalWeightLbs;
  const record: NutritionTargets = {
    id: "current",
    ...(effectiveCalorieTarget !== undefined ? { calorieTargetKcal: effectiveCalorieTarget } : {}),
    proteinMultiplierGPerLb: parsed.proteinMultiplierGPerLb ?? existing?.proteinMultiplierGPerLb ?? 1.0,
    ...(effectiveGoalWeight !== undefined ? { goalWeightLbs: effectiveGoalWeight } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.nutritionTargets.put(record);
  return record;
}

export interface NutritionTargetsSave {
  saved: NutritionTargets;
  /** Puts the targets back exactly as they were before this save. */
  undo: () => Promise<void>;
}

/**
 * HOTFIX (BODY logging trust, owner ruling 2026-10-03): the same save as
 * updateNutritionTargets, plus a short-lived UNDO. Targets are configuration
 * with no event trail, so undo restores the prior row itself — or removes
 * it when there was none, which reads back as the defaults again. Undo does
 * nothing once a later save has replaced this one.
 */
export async function saveNutritionTargets(input: NutritionTargetsInput): Promise<NutritionTargetsSave> {
  const previous = await db.nutritionTargets.get("current");
  const saved = await updateNutritionTargets(input);
  return {
    saved,
    undo: async () => {
      await db.transaction("rw", db.nutritionTargets, async () => {
        const current = await db.nutritionTargets.get("current");
        if (current?.updatedAt !== saved.updatedAt) return;
        if (previous) await db.nutritionTargets.put(previous);
        else await db.nutritionTargets.delete("current");
      });
    },
  };
}
