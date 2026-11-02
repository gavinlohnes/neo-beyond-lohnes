import type { SavedMeal } from "../domain/common/types";

export interface MealPlanDayInput { date: string; work: boolean }
export interface MealPlanTargets { calories?: number | undefined; proteinG?: number | undefined }
export interface MealPlanSlot { label: string; mealId: string | null; servings: number }
export interface MealPlanDay { date: string; work: boolean; slots: MealPlanSlot[] }
export interface MealPlan { days: MealPlanDay[]; message: string | null }
export const slotLabels = (work: boolean) => work ? ["After wake", "Pre-shift", "Mid-shift"] : ["Breakfast", "Lunch", "Dinner"];
export function mealPlanTotals(day: MealPlanDay, meals: readonly SavedMeal[]) {
  return day.slots.reduce((sum, slot) => {
    const meal = meals.find((m) => m.id === slot.mealId);
    return { calories: sum.calories + (meal?.calories ?? 0) * slot.servings, proteinG: sum.proteinG + (meal?.proteinG ?? 0) * slot.servings };
  }, { calories: 0, proteinG: 0 });
}

/** Draft only. A bounded deterministic rotation; portion sizes are half servings, up to three.
 * The repeat limit yields only after every available alternative has reached two placements
 * in the rolling three-day window. It never changes a saved meal or records food as eaten.
 */
export function draftMealPlan(meals: readonly SavedMeal[], targets: MealPlanTargets, window: readonly MealPlanDayInput[], count: 3 | 7): MealPlan {
  if (count !== 3 && count !== 7) throw new Error("Choose 3 or 7 days.");
  const library = meals.filter((m) => !m.archivedAt).slice().sort((a, b) => b.proteinG - a.proteinG || a.id.localeCompare(b.id));
  if (library.length < 3) return { days: [], message: "Save at least 3 meals to draft a plan. Use SAVE AS MEAL or SEARCH ALL FOODS." };
  if (window.length < count) throw new Error("The schedule window is incomplete.");
  const calories = targets.calories && targets.calories > 0 ? targets.calories : undefined;
  const protein = targets.proteinG && targets.proteinG > 0 ? targets.proteinG : undefined;
  const days: MealPlanDay[] = [];
  for (const dayInput of window.slice(0, count)) {
    const day: MealPlanDay = { ...dayInput, slots: [] };
    const recent = days.slice(-2).flatMap((d) => d.slots);
    for (const label of slotLabels(day.work)) {
      const placements = [...recent, ...day.slots];
      const uses = (id: string) => placements.filter((s) => s.mealId === id).length;
      const alternatives = library.filter((m) => uses(m.id) < 2);
      const candidates = alternatives.length ? alternatives : library;
      const total = mealPlanTotals(day, library);
      const slotsLeft = 3 - day.slots.length;
      // Rotate before considering a repeated meal; protein ordering breaks equivalent choices.
      const ordered = [...candidates].sort((a, b) => uses(a.id) - uses(b.id) || library.indexOf(a) - library.indexOf(b));
      const viable = ordered.filter((m) => !calories || m.calories * 0.5 <= calories * 1.1 - total.calories);
      const meal = viable[0];
      if (!meal) { day.slots.push({ label, mealId: null, servings: 1 }); continue; }
      let servings = 1;
      if (calories && meal.calories > 0) {
        const desired = (calories - total.calories) / slotsLeft;
        servings = Math.max(0.5, Math.min(3, Math.round(desired / meal.calories * 2) / 2));
        servings = Math.min(servings, Math.floor((calories * 1.1 - total.calories) / meal.calories * 2) / 2);
      } else if (protein && meal.proteinG > 0) {
        servings = Math.max(0.5, Math.min(3, Math.round((protein - total.proteinG) / slotsLeft / meal.proteinG * 2) / 2));
      }
      day.slots.push({ label, mealId: meal.id, servings });
    }
    days.push(day);
  }
  return { days, message: !calories && !protein ? "No calorie or protein target is set. Meals rotate with higher-protein choices first." : !calories ? "No calorie target is set. Portions aim at your protein target." : !protein ? "No protein target is available. Portions aim at your calorie target." : null };
}

/** SavedMeal currently has no ingredients or notes field. Do not invent a shopping ingredient. */
export function mealPlanGroceryText(days: readonly MealPlanDay[], meals: readonly SavedMeal[]): string {
  const counts = new Map<string, number>();
  for (const day of days) for (const slot of day.slots) if (slot.mealId) counts.set(slot.mealId, (counts.get(slot.mealId) ?? 0) + slot.servings);
  return `Grocery list · ${days[0]?.date ?? ""} to ${days.at(-1)?.date ?? ""}\nMeal names and servings; saved meals do not contain ingredient lists.\n` + [...counts].map(([id, count]) => `${meals.find((m) => m.id === id)?.name ?? "Saved meal"} × ${count}`).join("\n");
}
