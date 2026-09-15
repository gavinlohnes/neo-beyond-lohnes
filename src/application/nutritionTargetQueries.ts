import { db } from "../persistence/db";
import { parseNutritionTargets } from "../persistence/nutritionTargetValidation";
import { deriveProteinTargetG, DEFAULT_NUTRITION_TARGETS } from "../engine/nutritionTargets";
import { getMostRecentBodyweight } from "./queries";
import type { NutritionTargets } from "../domain/common/types";

/**
 * NUTRITION-003: the settings row's I/O boundary. Reads the single stored
 * row, validates it, and falls back to DEFAULT_NUTRITION_TARGETS if none
 * exists yet (matters only for in-memory/test databases opened without
 * going through the v11 upgrade) or if the stored row is malformed (e.g.
 * a hand-edited or corrupted imported backup) — "unknown is better than
 * false precision" beats surfacing a broken settings row or throwing.
 * Never writes. Mirrors application/queries.ts's getSchedulePattern.
 */
export async function getNutritionTargets(): Promise<NutritionTargets> {
  const raw = await db.nutritionTargets.get("current");
  if (!raw) return DEFAULT_NUTRITION_TARGETS;
  return parseNutritionTargets(raw) ?? DEFAULT_NUTRITION_TARGETS;
}

/**
 * The one place the rest of the app asks "what's my protein target right
 * now" — combines the stored multiplier with the most recently logged
 * bodyweight (application/queries.ts's getMostRecentBodyweight, not
 * day-scoped). Returns undefined, never a guessed number, when no
 * bodyweight has ever been logged.
 */
export async function getEffectiveProteinTargetG(): Promise<number | undefined> {
  const targets = await getNutritionTargets();
  const bodyweightLbs = await getMostRecentBodyweight();
  if (bodyweightLbs === undefined) return undefined;
  return deriveProteinTargetG(targets.proteinMultiplierGPerLb, bodyweightLbs);
}
