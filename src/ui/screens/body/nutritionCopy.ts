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

/**
 * POST-QA STABILIZATION: the repeat-meals button only says YESTERDAY when
 * the source really is the previous lived day; otherwise it names the date
 * it reached back to. `fromDate` is already formatted, e.g. "Sep 28".
 */
export function describeRepeatMealsButton(isPreviousLivedDay: boolean, fromDate: string, count: number): string {
  const meals = `${count} ${count === 1 ? "meal" : "meals"}`;
  return isPreviousLivedDay ? `SAME AS YESTERDAY (${meals})` : `REPEAT ${fromDate.toUpperCase()} MEALS (${meals})`;
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

// ---- DROP 1.5 (owner brief 2026-10-03): protein-only DELETE + "Same food?" ----

export const PROTEIN_DELETE_HINT = "Hold to delete.";

/** Correcting to 0 isn't a deletion; point at the one control that is. */
export const PROTEIN_CORRECT_TO_ZERO = "0 g can't be saved as a correction. To remove this entry, hold DELETE.";

/** Shown after DELETE, with the day's protein as every screen now shows it. */
export function describeProteinDeleted(grams: number, dayTotalG: number): string {
  return `Deleted ${grams} g. Protein today: ${dayTotalG} g.`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function describeDuplicateMealQuestion(meal: { name: string }, earlier: { at: string }): string {
  return `Same meal? ${meal.name} already logged at ${clock(earlier.at)}.`;
}

export function describeDuplicateMealRemoved(name: string, dayTotalG: number): string {
  return `Removed the second ${name}. Protein today: ${dayTotalG} g.`;
}

function listNames(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** SAME AS YESTERDAY repeats: "Same meals? Dinner (02:14) and Shake (02:15) were already logged." */
export function describeRepeatDuplicatesQuestion(pairs: readonly { justLogged: { name: string }; earlier: { at: string } }[]): string {
  if (pairs.length === 1) return describeDuplicateMealQuestion(pairs[0]!.justLogged, pairs[0]!.earlier);
  return `Same meals? ${listNames(pairs.map((p) => `${p.justLogged.name} (${clock(p.earlier.at)})`))} were already logged.`;
}

export function describeRepeatDuplicatesRemoved(names: readonly string[], dayTotalG: number): string {
  if (names.length === 1) return describeDuplicateMealRemoved(names[0]!, dayTotalG);
  return `Removed the repeated ${listNames(names)}. Protein today: ${dayTotalG} g.`;
}

/** "Same food? 49 g protein at 20:43 and Dinner (50 g protein) at 20:43." */
export function describeSameFoodQuestion(protein: { grams: number; at: string }, meal: { name: string; proteinG: number; at: string }): string {
  return `Same food? ${protein.grams} g protein at ${clock(protein.at)} and ${meal.name} (${meal.proteinG} g protein) at ${clock(meal.at)}.`;
}

/** REMOVE ONE keeps the meal (it carries calories and macros) and deletes the protein-only entry. */
export function describeSameFoodRemoveOne(proteinGrams: number): string {
  return `REMOVE ONE deletes the ${proteinGrams} g protein-only entry; the meal stays.`;
}
