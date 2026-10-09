import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { logWater, logSleep, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getMealEntries, getTotalMealCalories } from "../../src/application/nutritionQueries";
import { getHydrationEntries, getSleepEntries } from "../../src/application/queries";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";

const reads = vi.hoisted(() => ({ fail: false, dailyFail: false, timelineFail: false, wait: null as Promise<void> | null }));
vi.mock("../../src/application/weeklyQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/weeklyQueries")>();
  return { ...actual, getWeeklySummary: async () => { if (reads.fail) throw new Error("Transient read"); return actual.getWeeklySummary(); } };
});
vi.mock("../../src/application/queries", async (original) => {
  const actual = await original<typeof import("../../src/application/queries")>();
  return { ...actual, getHydrationEntries: async (...args: Parameters<typeof actual.getHydrationEntries>) => { if (reads.dailyFail) throw new Error("Transient read"); if (reads.wait) await reads.wait; return actual.getHydrationEntries(...args); } };
});
vi.mock("../../src/application/timelineQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/timelineQueries")>();
  return { ...actual, getTimeline: async () => { if (reads.timelineFail) throw new Error("Transient timeline read"); return actual.getTimeline(); } };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); reads.fail = false; reads.dailyFail = false; reads.timelineFail = false; reads.wait = null; window.scrollTo(0, 0); });

function reading(label: string) {
  return [...document.querySelectorAll(".health-overview .tool-label")].find(element => element.textContent === label)?.parentElement?.textContent ?? "";
}

describe("BODY daily health record", () => {
  for (const width of [320, 360, 412]) {
    it(`offers readable immediate actions and accessible daily/progress views at ${width}px`, async () => {
      await page.viewport(width, 800);
      await startDay();
      const screen = await render(<BodyScreen />);
      await expect.element(screen.getByRole("button", { name: "OPEN MEALS" })).toBeVisible();
      await expect.poll(() => reading("CALORIES")).toContain("0 kcal");
      await document.fonts.ready;
      for (const animation of document.getAnimations()) animation.finish();
      for (const name of ["OPEN MEALS", "YOUR PROGRESS", "+8 oz", "+12 oz", "+16 oz"]) {
        const button = screen.getByRole("button", { name, exact: true }).element();
        expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(button.getBoundingClientRect().bottom).toBeLessThanOrEqual(728);
        expect(parseFloat(getComputedStyle(button).fontSize)).toBeGreaterThanOrEqual(16);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      await screen.getByRole("button", { name: "YOUR PROGRESS" }).click();
      await expect.element(screen.getByText("No weigh-ins recorded. Your other progress is still available.")).toBeVisible();
      await expect.poll(() => document.activeElement?.id).toBe("health-progress-heading");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      await screen.getByRole("button", { name: "DAILY RECORD" }).click();
      await expect.poll(() => document.activeElement?.textContent).toBe("YOUR PROGRESS");
    });
  }

  it("keeps an overnight lived day, distinguishes main sleep from naps and corrects the effective record", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 20));
    const day = await startDay();
    await logSleep(day.id, 400, "PRIMARY");
    vi.setSystemTime(new Date(2026, 9, 13, 2));
    await logSleep(day.id, 20, "SUPPLEMENTAL");
    await logWater(day.id, 16);
    const screen = await render(<BodyScreen />);
    await expect.poll(() => reading("MAIN SLEEP")).toContain("6 hr 40 min");
    expect(reading("NAPS")).toContain("20 min");
    expect(reading("WATER")).toContain("16 oz");
    await screen.getByRole("button", { name: "Inspect Nap · 20 min" }).click();
    const hours = screen.getByRole("spinbutton", { name: "Hours" }).last();
    await expect.poll(() => document.activeElement).toBe(hours.element());
    await hours.fill("1");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(() => reading("NAPS")).toContain("1 hr 20 min");
    expect(reading("MAIN SLEEP")).toContain("6 hr 40 min");
    expect((await getSleepEntries(day.id)).map(e => e.kind)).toEqual(["PRIMARY", "SUPPLEMENTAL"]);
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(2);
    expect(await db.events.where("type").equals("SLEEP_LOG_CORRECTED").count()).toBe(1);
  });

  it("opens canonical water correction from the record and updates orientation without rewriting history", async () => {
    const day = await startDay(); await logWater(day.id, 16);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Inspect Water · 16 oz" }).click();
    const input = screen.getByRole("spinbutton", { name: "Corrected amount (oz)" });
    await expect.poll(() => document.activeElement).toBe(input.element());
    await input.fill("12"); await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(() => reading("WATER")).toContain("12 oz");
    expect((await getHydrationEntries(day.id))[0]?.correctionCount).toBe(1);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  });

  it("inspects and corrects a consumed meal, retaining preset and canonical totals", async () => {
    const day = await startDay();
    const meal = await createSavedMeal({ name: "Dinner", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    await logMeal(day.id, meal.id);
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Inspect Dinner" }).click();
    const input = screen.getByRole("spinbutton", { name: "Corrected calories" });
    await expect.poll(() => document.activeElement).toBe(input.element());
    await input.fill("550");
    await screen.getByRole("button", { name: "DAILY RECORD" }).click();
    await screen.getByRole("button", { name: "Inspect Dinner" }).click();
    await expect.element(input).toHaveValue(550);
    await expect.poll(() => document.activeElement).toBe(input.element());
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await screen.getByRole("button", { name: "DAILY RECORD" }).click();
    await expect.poll(() => reading("CALORIES")).toContain("550 kcal");
    expect(await getTotalMealCalories(day.id)).toBe(550);
    expect((await getMealEntries(day.id))[0]?.correctionCount).toBe(1);
    expect((await db.savedMeals.get(meal.id))?.calories).toBe(600);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    await screen.getByRole("button", { name: "SHOW NUTRITION DETAILS" }).click();
    await expect.element(screen.getByText("Carbs: 60 g · Fat: 15 g from recorded meals.")).toBeVisible();
    await expect.element(screen.getByText("Fiber is not recorded in the current meal data.")).toBeVisible();
  });

  it("shows real training accomplishments without weight, and read-only progress retry never writes", async () => {
    const day = await startDay();
    for (const pounds of [135, 145]) {
      const session = await startWorkout(day.id, "A", "STANDARD");
      await logSet(day.id, session.id, "machine-chest-press", 1, pounds, 6);
      await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    }
    const count = await db.events.count();
    reads.fail = true;
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "YOUR PROGRESS" }).click();
    await expect.element(screen.getByRole("button", { name: "RETRY PROGRESS" })).toBeVisible();
    reads.fail = false;
    await screen.getByRole("button", { name: "RETRY PROGRESS" }).click();
    await expect.element(screen.getByText("2 workouts · 1 PR", { exact: true })).toBeVisible();
    await expect.poll(() => document.activeElement?.id).toBe("health-progress-heading");
    reads.timelineFail = true;
    await screen.getByRole("button", { name: "SHOW ACCOMPLISHMENT TIMELINE" }).click();
    await screen.getByRole("button", { name: "RETRY TIMELINE" }).click();
    await expect.element(screen.getByRole("button", { name: "RETRY TIMELINE" })).toBeVisible();
    reads.timelineFail = false;
    await screen.getByRole("button", { name: "RETRY TIMELINE" }).click();
    await expect.element(screen.getByRole("region", { name: "Accomplishments over the last 90 days" })).toBeVisible();
    await expect.element(screen.getByRole("region", { name: "Accomplishments over the last 90 days" }).getByText(/Machine Chest Press: heaviest yet/)).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("HIDE ACCOMPLISHMENT TIMELINE");
    expect(await db.events.count()).toBe(count);
  });
  it("retains unsaved sleep input across meals and progress, and only explicit logging writes", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("button", { name: "DONE", exact: true }).click();
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Open SLEEP");
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "DAILY RECORD" }).click();
    await screen.getByRole("button", { name: "YOUR PROGRESS" }).click();
    await screen.getByRole("button", { name: "DAILY RECORD" }).click();
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Hours" })).toHaveValue(7);
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(0);
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();
    await expect.poll(() => reading("MAIN SLEEP")).toContain("7 hr");
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBe(1);
  });

  it("retries failed daily reads without another write and restores an enabled control", async () => {
    const day = await startDay(); await logWater(day.id, 16); reads.dailyFail = true;
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByRole("button", { name: "RETRY READINGS" })).toBeVisible();
    reads.dailyFail = false;
    let releaseRead!: () => void;
    reads.wait = new Promise<void>((resolve) => { releaseRead = resolve; });
    await screen.getByRole("button", { name: "RETRY READINGS" }).click();
    await expect.element(screen.getByRole("button", { name: "OPEN MEALS" })).toBeDisabled();
    releaseRead();
    await expect.poll(() => reading("WATER")).toContain("16 oz");
    await expect.poll(() => document.activeElement?.id).toBe("body-meals-entry");
    await expect.element(screen.getByRole("button", { name: "OPEN MEALS" })).toBeEnabled();
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  });

  it("guards a same-tick progress switch while canonical water logging is in flight", async () => {
    await startDay();
    const screen = await render(<BodyScreen />);
    await expect.poll(() => reading("WATER")).toContain("0 oz");
    screen.getByRole("button", { name: "+8 oz" }).element().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    screen.getByRole("button", { name: "YOUR PROGRESS" }).element().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.element(screen.getByText("8 oz added.", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "BODY // DAILY RECORD" })).toBeVisible();
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  });

});
