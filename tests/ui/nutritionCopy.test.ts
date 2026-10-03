import { describe, expect, it } from "vitest";
import {
  describeMacros,
  describeMealLogged,
  describeMealsRelogged,
  MEALS_TODAY_EMPTY,
  SAVED_MEALS_EMPTY,
} from "../../src/ui/screens/body/nutritionCopy";

describe("NUTRITION-001 — nutritionCopy", () => {
  it("describeMacros formats all four fields in a stable, readable order", () => {
    expect(describeMacros(600, 45, 60, 15)).toBe("600 cal · 45g protein · 60g carbs · 15g fat");
  });

  it("describeMealLogged names the meal with the calories and protein it just counted", () => {
    expect(describeMealLogged("Dinner", 650, 45)).toBe("Dinner logged · 650 kcal · 45g");
  });

  it("describeMealsRelogged totals a SAME AS YESTERDAY batch", () => {
    expect(describeMealsRelogged(1, "Oct 2", 650, 45)).toBe("1 meal from Oct 2 logged · 650 kcal · 45g");
    expect(describeMealsRelogged(3, "Oct 2", 1800, 140)).toBe("3 meals from Oct 2 logged · 1800 kcal · 140g");
  });

  it("empty-state copy is calm, not an error, and distinguishes presets from today's log", () => {
    for (const text of [SAVED_MEALS_EMPTY, MEALS_TODAY_EMPTY]) {
      expect(text.toLowerCase()).not.toMatch(/error|missing|fail|warning/);
    }
    expect(SAVED_MEALS_EMPTY).not.toBe(MEALS_TODAY_EMPTY);
  });
});
