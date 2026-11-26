import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { ProteinHeadsUpLine } from "../../src/ui/components/ProteinHeadsUpLine";
import { NutritionTargetsSettings } from "../../src/ui/screens/more/NutritionTargetsSettings";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";

/** GRAYSON-PROTEIN-HEADSUP-001: the BODY food-card line and its settings. VITE_WALKTHROUGH_SHOTS=<dir> saves shots. */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const checks = async (root: HTMLElement) => {
  for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
  await page.viewport(360, 900);
  for (const el of root.querySelectorAll<HTMLElement>("button, summary")) expect(Math.round(el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect((await axe.run(root, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
};

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 19, 17));
  const first = await startDay(new Date(2026, 10, 19, 16, 30).toISOString());
  await logBodyweight(first.id, 180);
  vi.setSystemTime(new Date(2026, 10, 20, 16, 25)); await endDay(first.id);
  for (const [i, g] of [98, 104, 170, 91].entries()) {
    const d = 20 + i;
    vi.setSystemTime(new Date(2026, 10, d, 17));
    const day = await startDay(new Date(2026, 10, d, 16, 30).toISOString());
    await logMeal(day.id, (await createSavedMeal({ name: `Meal ${d}`, calories: 1800, proteinG: g, carbsG: 100, fatG: 50 })).id, 1);
    vi.setSystemTime(new Date(2026, 10, d + 1, 16, 25)); await endDay(day.id);
  }
  vi.setSystemTime(new Date(2026, 10, 24, 18));
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-PROTEIN-HEADSUP-001", () => {
  it("one line on the food card; the days are one tap away; SHOW HIGH-PROTEIN MEALS opens the meal log; THAT'S FINE hides it with UNDO", async () => {
    const show = vi.fn();
    const screen = await render(<ProteinHeadsUpLine onShowMeals={show} />);
    const line = screen.getByText("Protein has been under 75% of your target on 3 of the last 4 days.");
    await expect.element(line).toBeVisible();
    await line.click();
    await expect.element(screen.getByText("Fri 98 g, Sat 104 g, Mon 91 g of 180 g")).toBeVisible();
    await checks(screen.container as HTMLElement);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/food-card-line-${w}.png`, element: screen.container as HTMLElement }); }
    await page.viewport(360, 900);
    await screen.getByRole("button", { name: "SHOW HIGH-PROTEIN MEALS" }).click();
    expect(show).toHaveBeenCalledTimes(1);
    await screen.getByRole("button", { name: "THAT'S FINE" }).click();
    await expect.element(screen.getByText("Hidden for a week.")).toBeVisible();
    expect((await getNutritionTargets()).proteinHeadsUp?.dismissedAt).toBeDefined();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByText("Protein has been under 75% of your target on 3 of the last 4 days.")).toBeVisible();
  });

  it("his settings: on by default, the percent and days, saved with UNDO", async () => {
    const screen = await render(<NutritionTargetsSettings />);
    const open = screen.getByRole("button", { name: "Open TARGETS", exact: true });
    await expect.element(open).toBeEnabled();
    await open.click();
    const box = screen.getByRole("checkbox", { name: /^Tell me when protein runs well under target/ });
    await expect.element(box).toBeChecked();
    await screen.getByRole("combobox", { name: /^Under/ }).selectOptions("80");
    await expect.element(screen.getByText("Protein heads-up: under 80% on 3 of the last 4 logged days.")).toBeVisible();
    expect((await getNutritionTargets()).proteinHeadsUp).toMatchObject({ on: true, underPercent: 80, days: 3, windowDays: 4 });
    await page.viewport(320, 900);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    await page.viewport(360, 900);
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-360.png`, element: document.querySelector("fieldset") as HTMLElement });
  });
});
