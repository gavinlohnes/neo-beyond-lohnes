import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logWater, startDay } from "../../src/application/commands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { openLogTarget } from "./helpers/logSheet";
import { todaySettled } from "./helpers/todaySettled";

/** GRAYSON C4.6: his own water target beside the total on TODAY and in the water sheet; nothing without one. */
afterEach(async () => { await cleanup(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: TODAY's WATER reads 48 / 100 oz and the water sheet says what's left`, async () => {
    await page.viewport(width, 800);
    const day = await startDay();
    await updateNutritionTargets({ waterTargetOz: 100 });
    await logWater(day.id, 48);
    const screen = await render(<App />); await todaySettled();
    await expect.element(screen.getByRole("button", { name: /^Water 48 of 100 oz/ })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await openLogTarget(screen, "WATER");
    const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
    await expect.element(sheet.getByText("48 of 100 oz today · 52 to go.")).toBeVisible();
    expect((await axe.run(sheet.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
}

it("TARGET MET once reached; and with no target, TODAY and the sheet say nothing about one", async () => {
  await page.viewport(360, 800);
  const day = await startDay();
  await updateNutritionTargets({ waterTargetOz: 64 });
  await logWater(day.id, 64);
  let screen = await render(<App />); await todaySettled();
  await expect.element(screen.getByText("TARGET MET", { exact: true })).toBeVisible();
  await cleanup();
  await updateNutritionTargets({ waterTargetOz: null });
  screen = await render(<App />); await todaySettled();
  await expect.element(screen.getByRole("button", { name: /^Water 64 oz/ })).toBeVisible();
  await openLogTarget(screen, "WATER");
  await expect.element(screen.getByRole("dialog", { name: "WATER", exact: true })).toBeVisible();
  expect(document.querySelector("[data-water-target]")).toBeNull();
});
