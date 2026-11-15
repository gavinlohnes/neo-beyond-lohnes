import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay, logWater } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { getDayLogEntries } from "../../src/application/logEntries";
import { db } from "../../src/persistence/db";
import { openLogTarget } from "./helpers/logSheet";

/**
 * TIMELINE-EDIT-001 (Gavin, 2026-11-15: "I also can't edit what time I ate my meals… make edits and corrections";
 * "Approved."): a meal or water entry opens from TODAY's timeline list or the food diary, and its time, amount or
 * presence can be fixed there, through the existing append-only corrections.
 */
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

async function seed() {
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0));
  const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 14, 19, 15));
  await logManualMeal(day.id, { name: "Butter Chicken and Rice", calories: 560, proteinG: 46, carbsG: 60, fatG: 18 });
  await logWater(day.id, 16);
  vi.setSystemTime(new Date(2026, 10, 14, 19, 26));
  return day;
}
const sheet = () => page.getByRole("dialog", { name: "BUTTER CHICKEN AND RICE", exact: true });

describe("TIMELINE-EDIT-001", () => {
  it("from TODAY's timeline: moves the meal to 23:00, corrects it, and removes it, with the timeline following", async () => {
    const day = await seed();
    await page.viewport(412, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Butter Chicken and Rice at 19:15", exact: true }).click();
    await expect.element(sheet()).toBeVisible();
    await expect.element(sheet().getByText("560 kcal · 46 g protein · 60 g carbs · 18 g fat", { exact: true })).toBeVisible();

    // Gavin's case: the time he ate it.
    await sheet().getByRole("button", { name: /^Change the time of Butter Chicken and Rice/ }).click();
    await sheet().getByRole("textbox", { name: "New time for Butter Chicken and Rice" }).fill("23:00").catch(async () => {
      const input = sheet().getByLabelText("New time for Butter Chicken and Rice").element() as HTMLInputElement;
      input.value = "23:00"; input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await sheet().getByRole("button", { name: "SAVE TIME", exact: true }).click();
    await expect.element(sheet().getByText("Time changed. The original stays in HISTORY.", { exact: true })).toBeVisible();
    await expect.poll(async () => new Date((await getDayLogEntries(day.id)).find((e) => e.kind === "MEAL")!.at).getHours()).toBe(23);

    await sheet().getByRole("button", { name: "EDIT AMOUNT", exact: true }).click();
    await sheet().getByRole("spinbutton", { name: "Calories (kcal)", exact: true }).fill("600");
    await sheet().getByRole("button", { name: "SAVE AMOUNT", exact: true }).click();
    await expect.element(sheet().getByText("600 kcal · 46 g protein · 60 g carbs · 18 g fat", { exact: true })).toBeVisible();
    await page.viewport(320, 900);
    const box = sheet().element().querySelector<HTMLElement>(".log-entry")!;
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    for (const el of box.querySelectorAll<HTMLElement>("p, button, label")) expect(parseFloat(getComputedStyle(el).fontSize), el.textContent!).toBeGreaterThanOrEqual(16);
    expect((await axe.run(sheet().element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);

    await sheet().getByRole("button", { name: "REMOVE", exact: true }).click();
    await expect.element(sheet().getByText(/^Remove Butter Chicken and Rice \(600 kcal/)).toBeVisible();
    await sheet().getByRole("button", { name: "REMOVE", exact: true }).click();
    await expect.element(page.getByText("Removed. It stays in HISTORY as removed.", { exact: true })).toBeVisible();
    expect((await getDayLogEntries(day.id)).map((e) => e.kind)).toEqual(["WATER"]);
    const types = (await db.events.where("beyondDayId").equals(day.id).toArray()).map((e) => e.type);
    for (const t of ["MEAL_LOGGED", "LOG_RETIMED", "MEAL_LOG_CORRECTED", "MEAL_LOG_VOIDED"]) expect(types).toContain(t);
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    // The timeline follows: no meal mark is left.
    await expect.poll(() => document.querySelector("[data-day-map-summary]")?.textContent ?? "").not.toContain("Butter Chicken");
  });

  it("from the food diary: a row opens the same fixes; KEEP IT removes nothing", async () => {
    const day = await seed();
    await page.viewport(412, 900);
    const screen = await render(<App />);
    await openLogTarget(screen, "MEAL");
    await screen.getByText(/^TODAY'S FOOD/).click();
    await screen.getByRole("button", { name: "Edit Butter Chicken and Rice at 19:15", exact: true }).click();
    await expect.element(sheet()).toBeVisible();
    await sheet().getByRole("button", { name: "REMOVE", exact: true }).click();
    await sheet().getByRole("button", { name: "KEEP IT", exact: true }).click();
    expect((await getDayLogEntries(day.id)).map((e) => e.kind)).toEqual(["MEAL", "WATER"]);
    await sheet().getByRole("button", { name: "EDIT AMOUNT", exact: true }).click();
    await sheet().getByRole("spinbutton", { name: "Protein (g)", exact: true }).fill("-3");
    await sheet().getByRole("button", { name: "SAVE AMOUNT", exact: true }).click();
    await expect.element(sheet().getByRole("alert")).toHaveTextContent("Enter numbers of 0 or more.");
    expect((await getDayLogEntries(day.id))[0]!.proteinG).toBe(46);
  });
});
