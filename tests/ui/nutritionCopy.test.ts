import { describe, expect, it } from "vitest";
import { describeMacros, describeMealLogged, MEALS_TODAY_EMPTY, SAVED_MEALS_EMPTY } from "../../src/ui/screens/body/nutritionCopy";

describe("NUTRITION-001 — nutritionCopy", () => {
  it("describeMacros formats all four fields in a stable, readable order", () => {
    expect(describeMacros(600, 45, 60, 15)).toBe("600 cal · 45g protein · 60g carbs · 15g fat");
  });

  it("describeMealLogged names the meal, matching the app's existing 'X logged.' pattern", () => {
    expect(describeMealLogged("Chicken & Rice Bowl")).toBe("Chicken & Rice Bowl logged.");
  });

  it("empty-state copy is calm, not an error, and distinguishes presets from today's log", () => {
    for (const text of [SAVED_MEALS_EMPTY, MEALS_TODAY_EMPTY]) {
      expect(text.toLowerCase()).not.toMatch(/error|missing|fail|warning/);
    }
    expect(SAVED_MEALS_EMPTY).not.toBe(MEALS_TODAY_EMPTY);
  });
});
