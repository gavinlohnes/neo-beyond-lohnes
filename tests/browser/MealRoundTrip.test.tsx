import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import Dexie from "dexie";
import { App } from "../../src/app/App";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getMealEntries, getTotalMealCalories } from "../../src/application/nutritionQueries";
import { getDayProteinTotalG } from "../../src/application/queries";
import { getHistoryDays } from "../../src/application/historyQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { mealButton, openMealInBody, openMealInBodyDom } from "./helpers/mealSheet";

type Screen = Awaited<ReturnType<typeof render>>;
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

async function openMeal(screen: Screen) {
  await openMealInBody(screen);
  await expect.element(screen.getByRole("button", { name: "CLOSE" })).toBeVisible();
  await expect.poll(() => screen.getByRole("dialog").element().contains(document.activeElement)).toBe(true);
}
async function fillMeal(screen: Screen, name = "Lunch") {
  await screen.getByRole("textbox", { name: "New meal name" }).fill(name);
  for (const [field, amount] of [["calories", "600"], ["protein (g)", "45"], ["carbs (g)", "60"], ["fat (g)", "15"]]) {
    await screen.getByRole("spinbutton", { name: `New meal ${field}` }).fill(amount!);
  }
}
async function seedMeal() { return createSavedMeal({ name: "Lunch", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 }); }
async function loggedCount() { return db.events.where("type").equals("MEAL_LOGGED").count(); }

describe("TODAY meal round trip", () => {
  it("uses canonical preset creation and logging once, then restores TODAY's disclosure, position, focus and totals", async () => {
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "Open LOG" })).toBeVisible();
    await document.fonts.ready;
    for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const trigger = mealButton(screen).element() as HTMLButtonElement;
    trigger.focus();
    trigger.scrollIntoView({ block: "center" });
    const originY = window.scrollY;
    await openMealInBodyDom(screen);
    await fillMeal(screen);
    await screen.getByRole("button", { name: "SAVE FOR REUSE", exact: true }).click();
    await expect.element(screen.getByText("Meal saved. Use LOG when you eat it.")).toBeVisible();
    expect(await loggedCount()).toBe(0);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Lunch logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    expect(await loggedCount()).toBe(1);
    expect(await getTotalMealCalories(dayId)).toBe(600);
    expect(await getDayProteinTotalG(dayId)).toBe(45);
    expect((await getHistoryDays()).flatMap((day) => day.events).filter((event) => event.type === "MEAL_LOGGED")).toHaveLength(1);
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.element(screen.getByRole("button", { name: "Open LOG" })).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(trigger);
    await expect.poll(() => Math.abs(window.scrollY - Math.min(originY, document.documentElement.scrollHeight - innerHeight))).toBeLessThanOrEqual(2);
    await expect.element(screen.getByRole("group", { name: "Protein 45 g · Water 0 oz", exact: true })).toBeVisible();
  });

  it("retains a canceled draft across explicit return without creating a record", async () => {
    // A shorter phone keeps a real scroll offset available for the restore check below.
    await page.viewport(360, 640);
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen, "Unfinished dinner");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    expect(await db.savedMeals.count()).toBe(0);
    expect(await loggedCount()).toBe(0);
    window.scrollTo(0, 80);
    const reopenedOrigin = window.scrollY;
    expect(reopenedOrigin).toBe(80);
    // A DOM click: a locator click first scrolls its target into view, which would move the origin under test.
    await openMealInBodyDom(screen);
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.poll(() => window.scrollY).toBe(reopenedOrigin);
  });

  it("retains a draft through primary navigation without asking to discard it", async () => {
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen);
    const confirm = vi.spyOn(window, "confirm");
    await screen.getByRole("button", { name: "CLOSE", exact: true }).click();
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toHaveAttribute("aria-current", "page");
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    // Review B1: primary navigation ends the shortcut's focused view; the draft stays.
    await expect.element(screen.getByRole("heading", { name: "DATA", exact: true })).toBeVisible();
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Lunch");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(600);
    expect(confirm).not.toHaveBeenCalled();
    expect(await loggedCount()).toBe(0);
  });

  it("keeps input and shows a nearby error when preset saving fails", async () => {
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen);
    const failure = vi.spyOn(db.savedMeals, "add").mockRejectedValue(new Error("Disk full"));
    await screen.getByRole("button", { name: "SAVE FOR REUSE", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Disk full");
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Lunch");
    expect(await loggedCount()).toBe(0);
    failure.mockRestore();
    await screen.getByRole("button", { name: "SAVE FOR REUSE", exact: true }).click();
    await expect.poll(() => db.savedMeals.count()).toBe(1);
  });

  it("retains the selected preset after a failed log and retries exactly once", async () => {
    await seedMeal();
    const screen = await render(<App />);
    await openMeal(screen);
    const failure = vi.spyOn(db.events, "add").mockRejectedValue(new Error("Disk full"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Disk full");
    expect(await loggedCount()).toBe(0);
    failure.mockRestore();
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(loggedCount).toBe(1);
  });

  for (const destination of ["TRAIN", "TODAY", "DATA", "MORE", "Search everything", "CLOSE"]) {
    it(`blocks LOG followed immediately by ${destination}, plus same-tick duplicate taps`, async () => {
      await seedMeal();
      const screen = await render(<App />);
      await openMeal(screen);
      await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeEnabled();
      const original = db.events.add.bind(db.events);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const write = vi.spyOn(db.events, "add").mockImplementation((...args) => Dexie.Promise.resolve(gate).then(() => original(...args)));
      const button = screen.getByRole("button", { name: "LOG", exact: true }).element() as HTMLButtonElement;
      const navigate = screen.getByRole("button", { name: destination, exact: true }).element() as HTMLButtonElement;
      try {
        // No await, disabled-state wait or React commit between the dispatches.
        button.click(); button.click(); navigate.click();
        await expect.element(screen.getByRole("button", { name: "CLOSE" })).toBeVisible();
        await expect.poll(() => screen.getByRole("button", { name: "TODAY", exact: true }).element().getAttribute("aria-current")).toBe("page");
      } finally { release(); }
      await expect.poll(loggedCount).toBe(1);
      expect(write).toHaveBeenCalledOnce();
    });
  }


  it("retains the canonical correction path after return, without changing the original event", async () => {
    await seedMeal();
    const screen = await render(<App />);
    await openMeal(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    const [original] = await getMealEntries(dayId);
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await openMealInBody(screen);
    await screen.getByRole("button", { name: "SHOW TODAY'S MEALS (1)" }).click();
    await screen.getByRole("button", { name: "Edit Lunch" }).click();
    await screen.getByRole("spinbutton", { name: "Corrected protein (g)" }).fill("30");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(() => getDayProteinTotalG(dayId)).toBe(30);
    expect(await loggedCount()).toBe(1);
    expect(await db.events.where("type").equals("MEAL_LOG_CORRECTED").count()).toBe(1);
    expect((await db.events.get(original!.rootEventId))?.payload).toMatchObject({ proteinG: 45 });
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.element(screen.getByRole("group", { name: "Protein 30 g · Water 0 oz", exact: true })).toBeVisible();
  });

  it("distinguishes a committed log from a subsequent read failure", async () => {
    await seedMeal();
    const screen = await render(<App />);
    await openMeal(screen);
    // The sheet's own saved-meal read must finish before the failure is injected.
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read failed"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal logged.");
    expect(await loggedCount()).toBe(1);
    expect(await getMealEntries(dayId)).toHaveLength(1);
    await screen.getByRole("button", { name: "CLOSE" }).click();
    read.mockRestore();
    await openMealInBody(screen);
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SHOW TODAY'S MEALS (1)" }).click();
    await expect.element(screen.getByRole("button", { name: "Edit Lunch" })).toBeVisible();
    await expect.poll(() => screen.getByRole("alert").elements().length).toBe(0);
    expect(await loggedCount()).toBe(1);
  });

  it.each([false, true])("restores focus after delayed reopen recovery without losing a draft or logging twice (operator moved focus: %s)", async (moveFocus) => {
    await seedMeal();
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen, "Unfinished dinner");
    const originalRead = db.savedMeals.toArray.bind(db.savedMeals);
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read failed"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal logged.");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    read.mockImplementation(() => Dexie.Promise.resolve(gate).then(originalRead));
    const returnButton = screen.getByRole("button", { name: "CLOSE" });
    try {
      await openMealInBody(screen);
      await expect.element(returnButton).toBeDisabled();
      // Let App's one-shot animation-frame handoff encounter the disabled control.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (moveFocus) (screen.getByRole("textbox", { name: "New meal name" }).element() as HTMLInputElement).focus();
    } finally { release(); }
    await expect.element(returnButton).toBeEnabled();
    const expectedFocus = moveFocus ? screen.getByRole("textbox", { name: "New meal name" }).element() : screen.getByRole("button", { name: "LOG", exact: true }).element();
    await expect.poll(() => document.activeElement).toBe(expectedFocus);
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SHOW TODAY'S MEALS (1)" }).click();
    await expect.element(screen.getByRole("button", { name: "Edit Lunch" })).toBeVisible();
    expect(await loggedCount()).toBe(1);
    expect(await getTotalMealCalories(dayId)).toBe(600);
    expect(await getDayProteinTotalG(dayId)).toBe(45);
    expect((await getHistoryDays()).flatMap((day) => day.events).filter((event) => event.type === "MEAL_LOGGED")).toHaveLength(1);
  });

  it("recovers a committed preset on reopen without creating or logging it again", async () => {
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen);
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read failed"));
    await screen.getByRole("button", { name: "SAVE FOR REUSE", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal saved.");
    expect(await db.savedMeals.count()).toBe(1);
    expect(screen.getByRole("button", { name: "LOG", exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "CLOSE" }).click();
    read.mockRestore();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeVisible();
    expect(await db.savedMeals.count()).toBe(1);
    expect(await loggedCount()).toBe(0);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(loggedCount).toBe(1);
  });

  it("retries failed reads explicitly, preserving another draft and the committed log", async () => {
    await seedMeal();
    const screen = await render(<App />);
    await openMeal(screen);
    await fillMeal(screen, "Unfinished dinner");
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read failed"));
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "RETRY READINGS" })).toBeVisible();
    await screen.getByRole("button", { name: "RETRY READINGS" }).click();
    // Distinguish this failed retry from the earlier post-commit refresh error.
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Could not refresh the meal readings. Retry readings without saving or logging again.");
    await expect.element(screen.getByRole("button", { name: "RETRY READINGS" })).toBeEnabled();
    read.mockRestore();
    await screen.getByRole("button", { name: "RETRY READINGS" }).click();
    await expect.element(screen.getByText("1 meal logged today", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    expect(await loggedCount()).toBe(1);
    await expect.poll(() => screen.getByRole("button", { name: "RETRY READINGS" }).elements().length).toBe(0);
  });


  it("keeps ordinary direct BODY entry independent of the TODAY round trip", async () => {
    await seedMeal();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.element(screen.getByText("Lunch logged · 600 kcal · 45g", { exact: true })).toBeVisible();
    expect(await loggedCount()).toBe(1);
  });

  for (const width of [320, 360, 412]) {
    it(`keeps meal entry readable, keyboard focused and accessible at ${width}px`, async () => {
      await page.viewport(width, 800);
      const screen = await render(<App />);
      await openMeal(screen);
      await fillMeal(screen);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      expect(screen.getByRole("button", { name: "CLOSE" }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      // Contrast is measured on the settled sheet, not mid entry animation on a slow runner.
      for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const result = await axe.run(document.body, { rules: { "region": { enabled: false } } });
      expect(result.violations).toEqual([]);
    });
  }
});
