import type { NutritionTargets } from "../domain/common/types";

/**
 * NUTRITION-003 (Calorie + Protein Targets). Seeded by the Dexie v11
 * migration (persistence/db.ts) — mirrors DEFAULT_SCHEDULE_PATTERN's own
 * placement/role in engine/scheduledContext.ts. 1.0 g/lb is the common
 * rounded protein-per-bodyweight heuristic used by RP and most coaches
 * for a cut (the owner's own chosen default, adjustable toward 0.8).
 * No calorieTargetKcal by default — that number is only ever set
 * directly by the operator, never guessed.
 */
export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  id: "current",
  proteinMultiplierGPerLb: 1.0,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

/**
 * Pure derivation, no I/O — the application layer resolves the current
 * multiplier and the most recently logged bodyweight, then calls this.
 * Rounded to the nearest gram; a fractional protein target is false
 * precision no scale/food label can back.
 */
export function deriveProteinTargetG(proteinMultiplierGPerLb: number, bodyweightLbs: number): number {
  return Math.round(proteinMultiplierGPerLb * bodyweightLbs);
}
