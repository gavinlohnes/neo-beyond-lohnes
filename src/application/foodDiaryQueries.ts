import { getMealEntries } from "./nutritionQueries";
import { getProteinEntries } from "./queries";
import { getEffectiveProteinTargetG } from "./nutritionTargetQueries";

/**
 * FOOD-001 (owner go 2026-10-30, "make it closer to MyFitnessPal"): the day's food diary, MyFitnessPal's
 * "Goal − Food = Remaining" turned protein first (owner ruling: protein left is the headline) and
 * listed by the time it was eaten (MacroFactor's timeline, owner ruling) rather than meal slots.
 * Read only: meals and protein-only logs as they stand after corrections and deletions.
 */
export interface FoodDiaryEntry { at: string; name: string; proteinG: number; calories: number | null }
export interface FoodDiary { entries: FoodDiaryEntry[]; proteinG: number; calories: number; proteinTargetG: number | undefined }

export async function getFoodDiary(beyondDayId: string): Promise<FoodDiary> {
  const [meals, protein, proteinTargetG] = await Promise.all([getMealEntries(beyondDayId), getProteinEntries(beyondDayId), getEffectiveProteinTargetG()]);
  const entries: FoodDiaryEntry[] = [
    ...meals.map((m) => ({ at: m.at, name: m.name, proteinG: m.effectiveProteinG, calories: m.effectiveCalories })),
    ...protein.map((p) => ({ at: p.at, name: "Protein", proteinG: p.effectiveGrams, calories: null })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return {
    entries,
    proteinG: entries.reduce((sum, e) => sum + e.proteinG, 0),
    calories: entries.reduce((sum, e) => sum + (e.calories ?? 0), 0),
    proteinTargetG,
  };
}
