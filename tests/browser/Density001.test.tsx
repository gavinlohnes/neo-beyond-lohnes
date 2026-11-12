import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { logBodyweight, startDay } from "../../src/application/commands";

/** DENSITY-001: with a protein target and nothing logged, TODAY's tile reads "—" / NOT LOGGED, never "—/162g". */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(() => { cleanup(); });

it("shows an unlogged protein tile in words, like water, weight and sleep", async () => {
  const day = await startDay();
  await logBodyweight(day.id, 180);
  const screen = await render(<TodayScreen />);
  const tile = screen.getByRole("button", { name: /^Protein 0 \/ \d+ g/ });
  await expect.element(tile).toBeVisible();
  await expect.element(tile).toHaveTextContent("PROTEIN—NOT LOGGED");
});

it("review of #487: a logged 0-kcal meal is a meal, so DATA never says no meals were logged", async () => {
  const { BodyScreen } = await import("../../src/ui/screens/body/BodyScreen");
  const { updateNutritionTargets } = await import("../../src/application/nutritionTargetCommands");
  const { createSavedMeal, logMeal } = await import("../../src/application/nutritionCommands");
  await updateNutritionTargets({ calorieTargetKcal: 2200 });
  const day = await startDay();
  const meal = await createSavedMeal({ name: "Black coffee", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  await logMeal(day.id, meal.id);
  const screen = await render(<BodyScreen />);
  await expect.element(screen.getByText("0 / 2200 kcal · 2200 remaining", { exact: true }).first()).toBeVisible();
  expect(screen.getByText(/No meals logged yet/).elements()).toHaveLength(0);
});
