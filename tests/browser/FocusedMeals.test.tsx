import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { getMealEntries, getTotalMealCalories } from "../../src/application/nutritionQueries";
import { getHistoryDays } from "../../src/application/historyQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

let dayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 12, 22));
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  dayId = (await startDay()).id;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });

describe("Focused BODY meals", () => {
  for (const width of [320, 360, 412]) {
    it(`shows a focused, accessible manual entry and saved-meal action at ${width}px`, async () => {
      await page.viewport(width, 800);
      await createSavedMeal({ name: "Shift dinner", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
      const screen = await render(<App />);
      await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
      await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
      await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toBeVisible();
      await expect.element(screen.getByText("HYDRATION", { exact: true })).not.toBeVisible();
      await expect.element(screen.getByRole("button", { name: "EDIT", exact: true, includeHidden: true })).not.toBeVisible();
      await expect.element(screen.getByRole("textbox", { name: "Search USDA food database", includeHidden: true })).not.toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      const log = screen.getByRole("button", { name: "LOG", exact: true }).element();
      expect(log.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(parseFloat(getComputedStyle(log).fontSize)).toBeGreaterThanOrEqual(16);
      // Audit settled rendering, rather than intermediate fade-in compositing.
      // Retained hidden TODAY animations cannot progress while hidden; finish
      // finite entrance effects explicitly, as existing visual tests do.
      for (const animation of document.getAnimations()) animation.finish();
      const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
      expect(result.violations).toEqual([]);
      // Displaying and inspecting the focused surface writes no consumed meal.
      expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
    });
  }

  it("retains a draft and focus across all trackers, focused meals and explicit TODAY return", async () => {
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished shift meal");
    await screen.getByRole("button", { name: "ALL BODY TRACKERS" }).click();
    await expect.element(screen.getByText("HYDRATION", { exact: true })).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("OPEN MEALS");
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.poll(() => document.activeElement?.id).toBe("meal-surface-heading");
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished shift meal");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished shift meal");
    expect(await db.savedMeals.count()).toBe(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("preserves consumed snapshots when secondary preset management changes the reusable meal", async () => {
    await createSavedMeal({ name: "Shift dinner", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    const screen = await render(<BodyScreen focus="meal" />);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Shift dinner logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SHOW MANAGE Shift dinner" }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    const meal = screen.getByRole("group", { name: "Saved meal Shift dinner", exact: true });
    await meal.getByRole("textbox", { name: "Edit meal name" }).fill("Tomorrow dinner");
    await meal.getByRole("spinbutton", { name: "Edit meal calories" }).fill("700");
    await meal.getByRole("button", { name: "SAVE MEAL", exact: true }).click();
    await expect.element(screen.getByText("Tomorrow dinner", { exact: true })).toBeVisible();
    expect(await getTotalMealCalories(dayId)).toBe(600);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    expect((await getMealEntries(dayId))[0]?.name).toBe("Shift dinner");
    expect((await getHistoryDays()).flatMap((day) => day.events).filter((event) => event.type === "MEAL_LOGGED")).toHaveLength(1);
  });

  it("blocks a same-tick all-trackers switch while canonical logging is in flight", async () => {
    await createSavedMeal({ name: "Shift dinner", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    const screen = await render(<BodyScreen focus="meal" />);
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeEnabled();
    const log = screen.getByRole("button", { name: "LOG", exact: true }).element();
    const trackers = screen.getByRole("button", { name: "ALL BODY TRACKERS" }).element();
    log.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    trackers.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.element(screen.getByText("Shift dinner logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  });

  it("keeps optional online lookup accessible without hiding or clearing manual input", async () => {
    const screen = await render(<BodyScreen focus="meal" />);
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Offline draft");
    await screen.getByRole("button", { name: "SHOW FOOD LOOKUP (ONLINE)" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Search USDA food database" })).toBeVisible();
    await screen.getByRole("button", { name: "HIDE FOOD LOOKUP (ONLINE)" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Offline draft");
    expect(await db.savedMeals.count()).toBe(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("keeps direct BODY logging and all trackers available without requiring focused meals", async () => {
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("HYDRATION", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Reusable lunch");
    await screen.getByRole("button", { name: "SAVE MEAL", exact: true }).click();
    await expect.element(screen.getByText("Meal saved for reuse. Tap LOG to record it today.")).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  });
});
