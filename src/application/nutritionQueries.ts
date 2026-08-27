import { db } from "../persistence/db";
import { parseSavedMeal } from "../persistence/nutritionValidation";
import type { DomainEvent, MealLogCorrectedPayload, MealLoggedPayload, SavedMeal } from "../domain/common/types";

/**
 * Same deterministic same-instant tie-break as application/queries.ts's
 * byTimeThenSeq — duplicated locally (4 lines) rather than imported from
 * there, since queries.ts is about to import getTotalMealProteinGrams
 * from this file for getMinimumDayStatus; importing byTimeThenSeq back
 * from queries.ts would create a two-file import cycle that doesn't
 * exist anywhere else in the codebase. Keep in sync by inspection if
 * queries.ts's version ever changes.
 */
function byTimeThenSeq(timeA: string, seqA: number | undefined, timeB: string, seqB: number | undefined): number {
  const byTime = timeA.localeCompare(timeB);
  if (byTime !== 0) return byTime;
  return (seqA ?? 0) - (seqB ?? 0);
}

/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop). Active (non-archived)
 * saved-meal presets, most-recently-created first — invalid rows are
 * excluded rather than crashing the whole list (parseSavedMeal never
 * throws), same defensive-read convention as intentQueries.ts's Mission/
 * Obligation reads.
 */
export async function getSavedMeals(options: { includeArchived?: boolean } = {}): Promise<SavedMeal[]> {
  const raw = await db.savedMeals.toArray();
  const parsed = raw.map(parseSavedMeal).filter((m): m is SavedMeal => m !== null);
  const filtered = options.includeArchived ? parsed : parsed.filter((m) => !m.archivedAt);
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * DERIVED, not stored — reconstructs effective meal-log truth from the
 * raw event stream, same hydration-style correction-chain pattern as
 * getHydrationEntries/getProteinEntries: MEAL_LOGGED starts a chain,
 * MEAL_LOG_CORRECTED events supersede the macro values without erasing
 * the original fact. Written independently of walkCorrectionChain
 * (queries.ts) rather than reusing it, since that helper resolves a
 * single numeric field and a meal snapshot has four — a real second
 * value shape, not an excuse to touch the existing single-value helper.
 */
export interface NutritionEntry {
  rootEventId: string;
  headEventId: string;
  savedMealId: string;
  name: string;
  originalCalories: number;
  originalProteinG: number;
  originalCarbsG: number;
  originalFatG: number;
  effectiveCalories: number;
  effectiveProteinG: number;
  effectiveCarbsG: number;
  effectiveFatG: number;
  correctionCount: number;
  recordedAt: string;
}

export async function getMealEntries(beyondDayId: string): Promise<NutritionEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter((e): e is DomainEvent<MealLoggedPayload> => e.type === "MEAL_LOGGED");
  const corrections = events.filter(
    (e): e is DomainEvent<MealLogCorrectedPayload> => e.type === "MEAL_LOG_CORRECTED",
  );

  return logged
    .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
    .map((root): NutritionEntry => {
      let headId = root.id;
      let headCalories = root.payload.calories;
      let headProteinG = root.payload.proteinG;
      let headCarbsG = root.payload.carbsG;
      let headFatG = root.payload.fatG;
      let count = 0;
      let next = corrections.find((c) => c.payload.supersedesEventId === headId);
      while (next) {
        headId = next.id;
        headCalories = next.payload.calories;
        headProteinG = next.payload.proteinG;
        headCarbsG = next.payload.carbsG;
        headFatG = next.payload.fatG;
        count += 1;
        next = corrections.find((c) => c.payload.supersedesEventId === headId);
      }
      return {
        rootEventId: root.id,
        headEventId: headId,
        savedMealId: root.payload.savedMealId,
        name: root.payload.name,
        originalCalories: root.payload.calories,
        originalProteinG: root.payload.proteinG,
        originalCarbsG: root.payload.carbsG,
        originalFatG: root.payload.fatG,
        effectiveCalories: headCalories,
        effectiveProteinG: headProteinG,
        effectiveCarbsG: headCarbsG,
        effectiveFatG: headFatG,
        correctionCount: count,
        recordedAt: root.recordedAt,
      };
    });
}

/**
 * NUTRITION-001: effective meal protein counts toward the existing
 * Minimum Day protein requirement alongside protein-only logs (see
 * application/queries.ts's getMinimumDayStatus, which sums this together
 * with getTotalProteinGrams) — never on its own as a separate,
 * competing total.
 */
export async function getTotalMealProteinGrams(beyondDayId: string): Promise<number> {
  const entries = await getMealEntries(beyondDayId);
  return entries.reduce((sum, e) => sum + e.effectiveProteinG, 0);
}
