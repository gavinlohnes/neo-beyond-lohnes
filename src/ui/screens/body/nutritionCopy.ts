/**
 * NUTRITION-001 (Meal Memory, High-Risk Drop): pure copy/formatting
 * helpers, kept separate from BodyScreen so they're unit tested without a
 * DOM — same convention as bodyScreenCopy.ts. None of this changes what's
 * stored; it only formats already-computed values for display.
 */

/** Compact macro readout, shared by the saved-meal list, today's logged entries, and the add/edit form preview. */
export function describeMacros(calories: number, proteinG: number, carbsG: number, fatG: number): string {
  return `${calories} cal · ${proteinG}g protein · ${carbsG}g carbs · ${fatG}g fat`;
}

/** HOTFIX (owner ruling 2026-10-03): "Dinner logged · 650 kcal · 45g" — what was just counted, at a glance. */
export function describeMealLogged(name: string, calories: number, proteinG: number): string {
  return `${name} logged · ${calories} kcal · ${proteinG}g`;
}

/** Same line for SAME AS YESTERDAY, totalled across every meal it logged. */
export function describeMealsRelogged(count: number, fromDate: string, calories: number, proteinG: number): string {
  return `${count} ${count === 1 ? "meal" : "meals"} from ${fromDate} logged · ${calories} kcal · ${proteinG}g`;
}

export const MEAL_DELETE_HINT = "Hold to delete.";

/** Calm, anticipatory — no saved meal presets created yet is an expected starting state, not an error. */
export const SAVED_MEALS_EMPTY =
  "No saved meals yet — add one below, then log it in one tap whenever you eat it again.";

/** Distinct from SAVED_MEALS_EMPTY: presets can exist with nothing logged today yet. */
export const MEALS_TODAY_EMPTY = "No meals logged today yet.";

/**
 * NUTRITION-003 (Calorie + Protein Targets): "remaining" once under
 * target, "over by X" once past it — never a bare negative number, which
 * reads as a bug rather than a real, honest state a deficit can actually
 * be in on a given day.
 */
export function describeCalorieProgress(loggedKcal: number, targetKcal: number | undefined): string {
  if (targetKcal === undefined) return `${loggedKcal} kcal logged today — no target set.`;
  const remaining = targetKcal - loggedKcal;
  return remaining >= 0
    ? `${loggedKcal} / ${targetKcal} kcal · ${remaining} remaining`
    : `${loggedKcal} / ${targetKcal} kcal · over by ${Math.abs(remaining)}`;
}

export function describeProteinProgress(loggedG: number, targetG: number | undefined): string {
  if (targetG === undefined) return `${loggedG}g protein logged today — log a bodyweight to see your target.`;
  const remaining = targetG - loggedG;
  return remaining >= 0
    ? `${loggedG} / ${targetG}g protein · ${remaining}g to go`
    : `${loggedG} / ${targetG}g protein · target met, +${Math.abs(remaining)}g over`;
}
