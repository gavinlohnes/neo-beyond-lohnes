import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { NutritionTargetsSettings } from "../../src/ui/screens/more/NutritionTargetsSettings";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { db } from "../../src/persistence/db";

/**
 * TARGET-PROPOSAL-001 (Gavin, 2026-11-14: "Approved"): CALORIES FOR THIS WEEK in the weekly check-in. BEYOND offers a
 * calorie target from the burn estimate and your own goal weight and weekly rate. SAVE writes exactly that target (with
 * UNDO); KEEP writes nothing. Synthetic data only.
 */
const H = 3_600_000, DAY = 24 * H;
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime();
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const FORBIDDEN = /deficit|surplus|\bnet\b|remaining|calories left|kcal left/i;

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

/** 30 lived days: about 2,000 kcal logged on each finished day, and weight easing down 0.1 lb a day from 200. */
async function seedMonth() {
  const meal = await createSavedMeal({ name: "Rice bowl", calories: 1000, proteinG: 60, carbsG: 110, fatG: 25 });
  for (let i = 0; i < 30; i++) {
    vi.setSystemTime(firstDay + i * DAY); const day = await startDay();
    if (i === 29) break;
    vi.setSystemTime(firstDay + i * DAY + 3 * H); await logMeal(day.id, meal.id, 2);
    if (i % 2 === 0) { vi.setSystemTime(firstDay + i * DAY + 15 * H); await logBodyweight(day.id, Math.round((200 - 0.1 * i + (i % 4 ? 0.2 : -0.2)) * 10) / 10); }
    vi.setSystemTime(firstDay + i * DAY + 23 * H); await endDay(day.id);
  }
  vi.setSystemTime(now);
}
const section = () => page.getByRole("region", { name: "CALORIES FOR THIS WEEK" });
const text = () => section().element().textContent ?? "";

describe("TARGET-PROPOSAL-001", () => {
  it("proposes a target from the burn estimate and your aim; SAVE writes exactly it, UNDO restores, nothing else changes", async () => {
    await seedMonth();
    await updateNutritionTargets({ calorieTargetKcal: 2300, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 });
    const { calorieProposal: p } = await getWeeklySummary(new Date(now));
    expect(p.kind).toBe("PROPOSAL");
    if (p.kind !== "PROPOSAL") return;
    await page.viewport(360, 900);
    const screen = await render(<WeeklyCheckInScreen />);
    await expect.element(section().getByText(`About ${p.kcal.toLocaleString("en-US")} kcal a day`, { exact: true })).toBeVisible();
    expect(text()).toContain(`From your burn estimate (${p.maintenance.lowKcal.toLocaleString("en-US")}–${p.maintenance.highKcal.toLocaleString("en-US")} a day) and your aim: lose 0.5% of your bodyweight a week toward 180 lb`);
    expect(text()).toContain("Your target now: 2,300.");
    expect(text()).toContain("Your choice: nothing changes until you save.");
    expect(text()).not.toMatch(FORBIDDEN);
    // The aim is more than 150 kcal from the current target, so this week moves only 150.
    expect(p.limits).toContain("STEP");
    expect(p.kcal).toBe(2150);
    expect(text()).toContain(`Your aim works out to about ${p.aimKcal.toLocaleString("en-US")}; BEYOND moves a target at most 150 kcal a week.`);
    await settle();
    expect((await axe.run(section().element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/target-proposal.png`, element: section().element() as HTMLElement });

    const before = await db.nutritionTargets.get("current");
    const events = await db.events.count();
    await section().getByRole("button", { name: "SAVE 2,150", exact: true }).click();
    await expect.element(section().getByText(/^Saved\. Your calorie target is now 2,150 kcal a day\./)).toBeVisible();
    const saved = await db.nutritionTargets.get("current");
    expect(saved).toMatchObject({ calorieTargetKcal: 2150, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5, proteinMultiplierGPerLb: before!.proteinMultiplierGPerLb });
    // Targets are configuration: no event is appended, and nothing else is written.
    expect(await db.events.count()).toBe(events);
    await section().getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(section().getByText("Undone. Your target is back as it was.", { exact: true })).toBeVisible();
    expect(await db.nutritionTargets.get("current")).toEqual(before);
    void screen;
  });

  it("KEEP writes nothing, and the section fits and reads at 320–1024 px", async () => {
    await seedMonth();
    await updateNutritionTargets({ calorieTargetKcal: 2300, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 });
    const before = await db.nutritionTargets.get("current");
    await page.viewport(320, 900);
    render(<WeeklyCheckInScreen />);
    await expect.element(section().getByRole("button", { name: "KEEP 2,300", exact: true })).toBeVisible();
    for (const width of [320, 412, 768, 1024]) {
      await page.viewport(width, 900); await settle();
      const box = section().element() as HTMLElement;
      expect(box.scrollWidth, `${width}`).toBeLessThanOrEqual(box.clientWidth + 1);
      expect(document.documentElement.scrollWidth, `${width}`).toBeLessThanOrEqual(width);
      for (const el of box.querySelectorAll<HTMLElement>("p, button")) expect(parseFloat(getComputedStyle(el).fontSize), `${el.textContent} ${width}`).toBeGreaterThanOrEqual(16);
    }
    await section().getByRole("button", { name: "KEEP 2,300", exact: true }).click();
    await expect.element(section().getByText("Kept 2,300 kcal a day. Nothing changed.", { exact: true })).toBeVisible();
    expect(await db.nutritionTargets.get("current")).toEqual(before);
  });

  it("says the target already fits, with nothing to save", async () => {
    await seedMonth();
    await updateNutritionTargets({ calorieTargetKcal: 2300, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 });
    const { calorieProposal: p } = await getWeeklySummary(new Date(now));
    await updateNutritionTargets({ calorieTargetKcal: p.kind === "PROPOSAL" ? p.aimKcal : 2000 });
    render(<WeeklyCheckInScreen />);
    await expect.poll(() => document.querySelector("[data-calorie-proposal]")?.getAttribute("data-calorie-proposal")).toBe("fits");
    expect(text()).toMatch(/^CALORIES FOR THIS WEEKYour target of [\d,]+ kcal a day already fits your aim toward 180 lb\. Nothing to change this week\.$/);
    expect(section().getByRole("button").elements()).toHaveLength(0);
  });

  it("abstains, naming what's missing, and offers nothing to save", async () => {
    render(<WeeklyCheckInScreen />);
    await expect.element(section().getByText("A proposal needs your burn estimate first (see EXPENDITURE above).", { exact: true })).toBeVisible();
    expect(section().getByRole("button").elements()).toHaveLength(0);
    await cleanup();
    await seedMonth();
    render(<WeeklyCheckInScreen />);
    await expect.element(section().getByText("Set a goal weight in TARGETS and BEYOND will propose a calorie target here each week.", { exact: true })).toBeVisible();
    await cleanup();
    await updateNutritionTargets({ goalWeightLbs: 180 });
    render(<WeeklyCheckInScreen />);
    await expect.element(section().getByText(/^Set how fast you want your weight to change/)).toBeVisible();
    expect(section().getByRole("button").elements()).toHaveLength(0);
  });

  it("TARGET-PROPOSAL-002: says where the current weight came from, and won't use a weigh-in over 14 days old", async () => {
    await seedMonth();
    await updateNutritionTargets({ calorieTargetKcal: 2300, goalWeightLbs: 180, weightChangeTargetPercentPerWeek: 0.5 });
    render(<WeeklyCheckInScreen />);
    await expect.poll(() => document.querySelector("[data-calorie-proposal]")?.getAttribute("data-calorie-proposal")).toBe("proposal");
    expect(text()).toMatch(/Current weight \d+\.\d lb, this week's average\./);
    await cleanup();
    // Three weeks later with no new weigh-in: no current weight, so no proposal.
    vi.setSystemTime(now + 21 * DAY);
    render(<WeeklyCheckInScreen />);
    await expect.poll(() => document.querySelector("[data-calorie-proposal]")?.getAttribute("data-calorie-proposal")).toBe("waiting");
    expect(text()).not.toMatch(/About [\d,]+ kcal a day/);
  });

  it("TARGET-PROPOSAL-002: the floor is set in TARGETS, holds the proposal up, and blank goes back to 1,500", async () => {
    await seedMonth();
    // A steep rate that would aim far lower than 2,200.
    await updateNutritionTargets({ calorieTargetKcal: 2250, goalWeightLbs: 150, weightChangeTargetPercentPerWeek: 2 });
    const screen = await render(<NutritionTargetsSettings />);
    await screen.getByRole("button", { name: "Open TARGETS", exact: true }).click();
    const floor = screen.getByRole("spinbutton", { name: "Lowest calorie target BEYOND may propose (kcal/day)", exact: true });
    await expect.element(floor).toHaveValue(null);
    await floor.fill("2200");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await db.nutritionTargets.get("current"))?.calorieFloorKcal).toBe(2200);
    await cleanup();
    render(<WeeklyCheckInScreen />);
    await expect.element(section().getByText("About 2,200 kcal a day", { exact: true })).toBeVisible();
    expect(text()).toContain("Your floor is 2,200 kcal a day (set in TARGETS), so it goes no lower.");
    await cleanup();
    const again = await render(<NutritionTargetsSettings />);
    await again.getByRole("button", { name: "Open TARGETS", exact: true }).click();
    await again.getByRole("spinbutton", { name: "Lowest calorie target BEYOND may propose (kcal/day)", exact: true }).clear();
    await again.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await db.nutritionTargets.get("current"))?.calorieFloorKcal).toBeUndefined();
  });
});

async function settle() {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
