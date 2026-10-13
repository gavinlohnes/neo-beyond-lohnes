import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

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
  await expect.element(screen.getByRole("heading", { name: "BODY // DAILY RECORD" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "YOUR PROGRESS" })).toBeVisible();
  expect(screen.getByRole("button", { name: "RETURN TO TODAY" }).elements()).toHaveLength(0);
  expect(screen.getByRole("heading", { name: "BODY // WATER" }).elements()).toHaveLength(0);
  expect(screen.getByRole("heading", { name: "BODY // MEALS" }).elements()).toHaveLength(0);
}

async function tapBody(screen: Screen) {
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "BODY", exact: true })).toHaveAttribute("aria-current", "page");
}

describe("BODY primary navigation after a TODAY shortcut", () => {
  it("shows the Daily Record after water and meal round trips, keeping the meal draft", async () => {
    const screen = await render(<App />);

    await screen.getByRole("button", { name: "Log water in BODY" }).click();
    await expect.element(screen.getByRole("heading", { name: "BODY // WATER" })).toBeVisible();
    await screen.getByRole("button", { name: "+8 oz", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(dayId)).toBe(8);
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");

    await tapBody(screen);
    await expectDailyRecord(screen);
    await tapBody(screen);
    await expectDailyRecord(screen);

    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished shift meal");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("640");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");

    await tapBody(screen);
    await expectDailyRecord(screen);
    await expect.poll(() => document.activeElement?.id).toBe("meal-surface-heading");
    await tapBody(screen);
    await expectDailyRecord(screen);

    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished shift meal");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(640);
    expect(screen.getByRole("button", { name: "RETURN TO TODAY" }).elements()).toHaveLength(0);
    expect(await db.savedMeals.count()).toBe(0);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("keeps a locally opened meals view across tabs, and a BODY re-tap returns to the Daily Record", async () => {
    const screen = await render(<App />);
    await tapBody(screen);
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await tapBody(screen);
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    await tapBody(screen);
    await expectDailyRecord(screen);
  });

  it("leaves a shortcut visit to BODY by primary navigation without a stale return", async () => {
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Draft");
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toHaveAttribute("aria-current", "page");
    await tapBody(screen);
    await expectDailyRecord(screen);

    // A deliberate shortcut still opens its focused view with its return.
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await expect.element(screen.getByRole("heading", { name: "BODY // MEALS" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RETURN TO TODAY" })).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Draft");
  });
});
