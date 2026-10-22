/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** GARMIN-005 (owner approval 2026-10-22): eaten (logged) next to burned (Garmin), display only. */
const H = 3600_000, DAY = 24 * H;
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime(); // day 29 of 30 is in progress
const SHOTS = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_GARMIN005_SHOTS;

async function seed({ calories = true, exportedAt = now }: { calories?: boolean; exportedAt?: number } = {}) {
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now, { calories });
  await db.beyondDays.bulkAdd(days);
  activity.exportedAt = new Date(Math.max(exportedAt, Date.parse(activity.window.endTime))).toISOString();
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
  // Meals on the last ten days, each logged three hours into its day; one day left unlogged.
  const meal = await createSavedMeal({ name: "Rice bowl", calories: 650, proteinG: 40, carbsG: 70, fatG: 15 });
  for (let i = 20; i < 30; i++) {
    if (i === 25) continue;
    vi.setSystemTime(firstDay + i * DAY + 3 * H);
    await logMeal(days[i]!.id, meal.id, 2);
    if (i < 29) { vi.setSystemTime(firstDay + i * DAY + 9 * H); await logMeal(days[i]!.id, meal.id, 1); }
  }
  vi.setSystemTime(now);
}
const settle = async () => {
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const shot = async (name: string) => { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/${name}.png`, save: true }); } };

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); });
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

describe("GARMIN-005 — eaten vs burned", () => {
  for (const width of [320, 390]) it(`adds a CALORIES tile with eaten and burned so far, and opens the comparison without writing at ${width}px`, async () => {
    await page.viewport(width, 844);
    await seed();
    const screen = await render(<App />);
    const tile = screen.getByRole("button", { name: /^Calories eaten 1,300, burned [\d,]+ so far, open calories$/ });
    await expect.element(tile).toBeVisible();
    expect(document.querySelector(".cc-fuel--calories")).not.toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    if (width === 390) await shot("390-today");

    const before = await db.events.toArray();
    await tile.click();
    const sheet = screen.getByRole("dialog", { name: "CALORIES", exact: true });
    await expect.element(sheet.getByRole("img", { name: /^Today so far: eaten 1,300 kcal, burned [\d,]+ kcal\.$/ })).toBeVisible();
    await expect.element(sheet.getByText("Eaten (logged)", { exact: true })).toBeVisible();
    await expect.element(sheet.getByText(/^Garmin as of \d\d:\d\d\.$/)).toBeVisible();
    expect(sheet.element().textContent).not.toMatch(/left|remaining|deficit|surplus|net/i);
    if (width === 390) await shot("390-calories-today");
    await sheet.getByRole("button", { name: "4W", exact: true }).click();
    await expect.element(sheet.getByText(/^kcal a day on average · 8 logged days, 28 measured · today left out$/)).toBeVisible();
    await sheet.getByText("Show as table", { exact: true }).click();
    const unlogged = [...sheet.element().querySelectorAll("tbody tr")].find((row) => row.textContent?.includes("Not logged"));
    expect(unlogged).toBeTruthy();
    await settle();
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    if (width === 390) await shot("390-calories-4w");
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.poll(() => document.activeElement).toBe(tile.element());
    expect(await db.events.toArray()).toEqual(before);
  });

  it("shows no CALORIES tile when Garmin sent no calories (an older helper)", async () => {
    await page.viewport(390, 844);
    await seed({ calories: false });
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: /open steps$/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /open calories$/ }).elements()).toHaveLength(0);
  });

  it("says when the Garmin numbers are old", async () => {
    await page.viewport(390, 844);
    await seed();
    vi.setSystemTime(now + 14 * H);
    const screen = await render(<App />);
    await expect.element(screen.getByText(/^Garmin as of .+, \d\d:\d\d\. Send from the helper to update\.$/)).toBeVisible();
  });

  it("puts Garmin's figure beside the weight-trend estimate in Weekly", async () => {
    await page.viewport(390, 844);
    await seed();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("weekly");
    await screen.getByRole("button", { name: /^WEEKLY CHECK-IN / }).click();
    await expect.poll(() => document.querySelector("[data-garmin-burned]")?.textContent).toMatch(/^Garmin says about [\d,]+ kcal a day \(28 measured days\)\. Watch estimates can be off by 10–20%\.$/);
    if (SHOTS) { (document.querySelector("[data-garmin-burned]") as HTMLElement).scrollIntoView({ block: "center" }); await shot("390-weekly"); }
  });
});
