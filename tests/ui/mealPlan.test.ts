import { expect, it } from "vitest";
import { draftMealPlan, mealPlanGroceryText, mealPlanTotals } from "../../src/application/mealPlan";
import type { SavedMeal } from "../../src/domain/common/types";
const meals: SavedMeal[] = Array.from({ length: 5 }, (_, i) => ({ id: String(i), name: `Meal ${i}`, calories: 500, proteinG: 50 - i, carbsG: 30, fatG: 10, createdAt: "2026-11-01" }));
const window = Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-${String(i + 2).padStart(2, "0")}`, work: i % 2 === 0 }));
it("is deterministic, rotates higher protein first and honours the calorie target", () => {
  const plan = draftMealPlan(meals, { calories: 2000, proteinG: 160 }, window, 3);
  expect(plan).toEqual(draftMealPlan([...meals].reverse(), { calories: 2000, proteinG: 160 }, window, 3));
  expect(plan.days[0]!.slots[0]!.mealId).toBe("0");
  for (const day of plan.days) { expect(mealPlanTotals(day, meals).calories).toBe(2000); expect(mealPlanTotals(day, meals).proteinG).toBeGreaterThanOrEqual(160); }
  expect(plan.days[0]!.slots.map((s) => s.label)).toEqual(["After wake", "Pre-shift", "Mid-shift"]);
  expect(plan.days[1]!.slots.map((s) => s.label)).toEqual(["Breakfast", "Lunch", "Dinner"]);
});
it("does not repeat a meal more than twice across three days when alternatives exist", () => {
  const plan = draftMealPlan(meals, {}, window, 7);
  for (let i = 0; i <= 4; i++) for (const meal of meals) expect(plan.days.slice(i, i + 3).flatMap((d) => d.slots).filter((s) => s.mealId === meal.id).length).toBeLessThanOrEqual(2);
});
it("states no targets and calmly explains an insufficient library", () => {
  expect(draftMealPlan(meals, {}, window, 3).message).toContain("No calorie or protein target");
  expect(draftMealPlan(meals.slice(0, 2), {}, window, 3)).toMatchObject({ days: [], message: expect.stringContaining("Save at least 3 meals") });
  expect(draftMealPlan(meals.map((m) => ({ ...m, archivedAt: "2026-11-01" })), {}, window, 3).days).toEqual([]);
});
it("leaves impossible calorie slots empty instead of passing the target by more than 10%", () => {
  const plan = draftMealPlan(meals, { calories: 100 }, window, 3);
  expect(plan.days.every((d) => mealPlanTotals(d, meals).calories <= 110)).toBe(true);
});
it("grocery text reflects only occupied slots and serving counts, without inventing ingredients", () => {
  const plan = draftMealPlan(meals, {}, window, 3);
  plan.days[0]!.slots[0]!.mealId = null;
  const text = mealPlanGroceryText(plan.days, meals);
  expect(text).toContain("Meal names and servings");
  expect(text).toContain("Meal 1 ×");
  expect(text).not.toContain("undefined");
});
