import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein } from "../../src/application/commands";
import { createSavedMeal, logManualMeal, logMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";
import { seedLivedMonth, MONTH_FIRST_DAY, MONTH_NOW } from "./helpers/livedMonth";

/**
 * FOOD-SOURCES-001 (Gavin, 2026-11-15): WHERE IT CAME FROM on the calories page and in BODY's protein history. Your
 * main sources over the range's finished lived days, from your own logs; a row opens its days; in BODY a day opens its
 * records. Read only, no judgement. Synthetic data only (BODY-DASH-001's month).
 */
const H = 3_600_000, DAY = 24 * H;
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const JUDGEMENT = /bad|unhealthy|cut|avoid|too much|junk|should/i;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

/** On the last ten finished days: a rice bowl each day, a shake on even days, toast typed by hand twice, a quick protein log. */
async function seedMeals() {
  await seedLivedMonth();
  const days = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const bowl = await createSavedMeal({ name: "Rice bowl", calories: 650, proteinG: 40, carbsG: 70, fatG: 15 });
  const shake = await createSavedMeal({ name: "Protein shake", calories: 300, proteinG: 50, carbsG: 10, fatG: 5 });
  for (let i = 19; i < 29; i++) {
    vi.setSystemTime(MONTH_FIRST_DAY + i * DAY + 2 * H); await logMeal(days[i]!.id, bowl.id);
    if (i % 2 === 0) { vi.setSystemTime(MONTH_FIRST_DAY + i * DAY + 4 * H); await logMeal(days[i]!.id, shake.id); }
    if (i === 25 || i === 27) { vi.setSystemTime(MONTH_FIRST_DAY + i * DAY + 6 * H); await logManualMeal(days[i]!.id, { name: "Toast", calories: 200, proteinG: 8, carbsG: 30, fatG: 4 }); }
    if (i === 28) { vi.setSystemTime(MONTH_FIRST_DAY + i * DAY + 7 * H); await logProtein(days[i]!.id, 25); }
  }
  vi.setSystemTime(MONTH_NOW);
}
const box = () => document.querySelector<HTMLElement>("[data-food-sources]");
const text = () => box()?.textContent ?? "";

describe("FOOD-SOURCES-001", () => {
  it("the calories page lists where the last 7 and 30 days' calories came from, each row opening its days, writing nothing", async () => {
    await seedMeals();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    const before = await db.events.count();
    await screen.getByRole("button", { name: /open calories$/ }).click();
    const sheet = page.getByRole("dialog", { name: "CALORIES", exact: true });
    await sheet.getByRole("button", { name: "Last 7 lived days", exact: true }).click();
    await expect.poll(text).toContain("WHERE IT CAME FROM · LAST 7 DAYS");
    // The last 7 × 24 hours hold six finished lived days (23–28) and today, which isn't counted:
    // 6 bowls, 3 shakes (24, 26, 28), toast on 25 and 27.
    await expect.poll(() => [...box()!.querySelectorAll(".md-source-row summary")].map((s) => s.textContent)).toEqual([
      "Rice bowl3,900 kcal · 75% · 6 times", "Protein shake900 kcal · 17% · 3 times", "Toast400 kcal · 8% · 2 times",
    ]);
    expect(text()).toContain("5,200 kcal logged on 6 of the last 6 finished days");
    await sheet.getByRole("button", { name: "Last 30 lived days", exact: true }).click();
    await expect.poll(text).toContain("WHERE IT CAME FROM · LAST 30 DAYS");
    await expect.poll(text).toContain("logged on 10 of the last 29 finished days; days with nothing logged are left out.");
    // A row opens the days it was logged on, newest first.
    await sheet.getByText("Toast", { exact: true }).click();
    expect([...box()!.querySelectorAll("details[open] .md-source-day")].map((d) => d.textContent)).toEqual(["Mon, Oct 19200 kcal", "Sat, Oct 17200 kcal"]);
    expect(text()).not.toMatch(JUDGEMENT);
    for (const width of [320, 412, 1024]) {
      await page.viewport(width, 900);
      expect(box()!.scrollWidth, `${width}`).toBeLessThanOrEqual(box()!.clientWidth + 1);
      for (const el of box()!.querySelectorAll<HTMLElement>(".md-meta, summary, .md-source-day")) expect(parseFloat(getComputedStyle(el).fontSize)).toBeGreaterThanOrEqual(16);
    }
    await page.viewport(360, 900);
    expect((await axe.run(box()!, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/food-sources-calories.png`, element: box()! });
    expect(await db.events.count()).toBe(before);
  });

  it("BODY's protein history lists its sources over the chosen range, and a day opens that day's records", async () => {
    await seedMeals();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein .*explore records$/ }).click();
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("protein");
    await screen.getByRole("button", { name: "7 DAYS", exact: true }).click();
    await expect.poll(() => [...(box()?.querySelectorAll(".md-source-row summary") ?? [])].map((s) => s.textContent)).toEqual([
      "Rice bowl240 g · 56% · 6 times", "Protein shake150 g · 35% · 3 times", "Protein (quick log)25 g · 6% · 1 time", "Toast16 g · 4% · 2 times",
    ]);
    await screen.getByText("Protein (quick log)", { exact: true }).click();
    await screen.getByRole("button", { name: /^Tue, Oct 20, 25 g: open that day's records$/ }).click();
    await expect.element(screen.getByRole("heading", { name: /^Protein · / })).toBeVisible();
  });

  it("says plainly when nothing is logged in the range", async () => {
    await seedLivedMonth();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /open calories$/ }).click();
    await page.getByRole("dialog", { name: "CALORIES", exact: true }).getByRole("button", { name: "Last 7 lived days", exact: true }).click();
    await expect.poll(text).toContain("Nothing with calories logged in the last 7 finished days.");
    expect(box()!.querySelectorAll("summary")).toHaveLength(0);
  });
});
