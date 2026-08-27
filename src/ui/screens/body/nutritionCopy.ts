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

export function describeMealLogged(name: string): string {
  return `${name} logged.`;
}

/** Calm, anticipatory — no saved meal presets created yet is an expected starting state, not an error. */
export const SAVED_MEALS_EMPTY =
  "No saved meals yet — add one below, then log it in one tap whenever you eat it again.";

/** Distinct from SAVED_MEALS_EMPTY: presets can exist with nothing logged today yet. */
export const MEALS_TODAY_EMPTY = "No meals logged today yet.";
