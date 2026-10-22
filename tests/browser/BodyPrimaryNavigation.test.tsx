import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { openMealInBody } from "./helpers/mealSheet";

/**
 * DAILY-EXPERIENCE-001 review B1: a TODAY shortcut's focused BODY view and its
 * RETURN belong to that visit only. Primary navigation to BODY, and a BODY
 * re-tap, show the Daily Record while every unsaved BODY input survives.
 */

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

async function expectDailyRecord(screen: Screen) {
  await expect.element(screen.getByRole("heading", { name: "BODY", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "WEIGHT HISTORY", exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: "CLOSE" }).elements()).toHaveLength(0);
  expect(screen.getByRole("heading", { name: "BODY // WATER" }).elements()).toHaveLength(0);
  expect(screen.getByRole("dialog", { name: "MEAL TOOLS", exact: true }).elements()).toHaveLength(0);
}

async function tapBody(screen: Screen) {
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "BODY", exact: true })).toHaveAttribute("aria-current", "page");
}

describe("BODY primary navigation after a TODAY shortcut", () => {
  it("shows the Daily Record after water and meal round trips, keeping the meal draft", async () => {
    const screen = await render(<App />);

    await screen.getByRole("button", { name: "Log water" }).click();
    await expect.element(screen.getByRole("dialog", { name: "WATER", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "+8 oz", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(8);
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");

    await tapBody(screen);
    await expectDailyRecord(screen);
    await tapBody(screen);
    await expectDailyRecord(screen);

    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("dialog", { name: "MEAL TOOLS", exact: true })).toBeVisible();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished shift meal");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("640");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");

    await tapBody(screen);
    await expectDailyRecord(screen);
    await expect.poll(() => document.activeElement?.tagName).toBe("H1");
    await tapBody(screen);
    await expectDailyRecord(screen);

    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished shift meal");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(640);
    await expect.element(screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true })).toBeVisible();
    expect(await db.savedMeals.count()).toBe(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("keeps a chosen progress range through a tab detour while BODY returns to its overview", async () => {
    const screen = await render(<App />);
    await tapBody(screen); await screen.getByRole("button", { name: "WEIGHT HISTORY", exact: true }).click();
    await screen.getByRole("button", { name: "7 DAYS", exact: true }).click();
    const before = await db.events.toArray();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click(); await tapBody(screen);
    await tapBody(screen); await expectDailyRecord(screen);
    await screen.getByRole("button", { name: "WEIGHT HISTORY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "7 DAYS", exact: true })).toHaveAttribute("aria-pressed", "true");
    await tapBody(screen); await expectDailyRecord(screen);
    expect(await db.events.toArray()).toEqual(before);
  });

  it("leaves a shortcut visit to BODY by primary navigation without a stale return", async () => {
    const screen = await render(<App />);
    await openMealInBody(screen);
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Draft");
    await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "COMMAND", exact: true })).toHaveAttribute("aria-current", "page");
    await tapBody(screen);
    await expectDailyRecord(screen);

    // A deliberate shortcut still opens its focused view with its return.
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("dialog", { name: "MEAL TOOLS", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "CLOSE" })).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Draft");
  });
});
