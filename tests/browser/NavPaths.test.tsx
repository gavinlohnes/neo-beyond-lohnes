import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * NAV-001: Gavin's tree-test tasks, each walked from TODAY by visible labels only. A task that
 * fails here is a task he can't find. Later slices turn the todos into real paths.
 */
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  await page.viewport(390, 844);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function openLog(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "Open LOG" }).click();
  const sheet = screen.getByRole("dialog", { name: "LOG" });
  await expect.element(sheet).toBeVisible();
  return sheet;
}

describe("NAV-001 top tasks from TODAY", () => {
  it("+ floats at the bottom-right, above the tab bar", async () => {
    await startDay();
    const screen = await render(<App />);
    const plus = screen.getByRole("button", { name: "Open LOG" });
    await expect.element(plus).toBeVisible();
    const box = plus.element().getBoundingClientRect();
    const nav = document.querySelector(".shell-nav")!.getBoundingClientRect();
    expect(getComputedStyle(plus.element()).position).toBe("fixed");
    expect(box.bottom).toBeLessThanOrEqual(nav.top);
    expect(window.innerWidth - box.right).toBeLessThanOrEqual(32);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  it("log a meal: + → MEAL opens with NEW MEAL first, before the list", async () => {
    await startDay();
    const screen = await render(<App />);
    const sheet = await openLog(screen);
    await sheet.getByRole("button", { name: "MEAL", exact: true }).click();
    const meal = screen.getByRole("dialog", { name: "MEAL" });
    await expect.element(meal.getByRole("button", { name: "NEW MEAL", exact: true })).toBeVisible();
    const buttons = [...meal.element().querySelectorAll("button, input")].map((el) => el.textContent || el.getAttribute("aria-label"));
    expect(buttons.indexOf("NEW MEAL")).toBeLessThan(buttons.indexOf("Search your meals"));
    await meal.getByRole("button", { name: "NEW MEAL", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toBeVisible();
  });

  it("log weight: + → BODYWEIGHT", async () => {
    await startDay();
    const screen = await render(<App />);
    const sheet = await openLog(screen);
    await sheet.getByRole("button", { name: "BODYWEIGHT", exact: true }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Weight (lbs)", exact: true })).toBeVisible();
  });

  it("why: the suggestion shows 'See the reasoning', which opens the plain answer", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 });
    const screen = await render(<App />);
    const why = screen.getByText("See the reasoning", { exact: true });
    await expect.element(why).toBeVisible();
    await why.click();
    await expect.poll(() => document.querySelector("[data-why-plain]")?.getClientRects().length ?? 0).toBeGreaterThan(0);
  });

  it("start a workout: TRAIN is a primary tab", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.poll(() => document.querySelector('.shell-nav [aria-current="page"]')?.textContent ?? "").toContain("TRAIN");
  });

  it.todo("back up: MORE → Back up my data (slice 2)");
  it.todo("review sleep: TODAY's sleep tile or DATA → Sleep opens on this week (slice 3)");
  it.todo("last run of shifts: DATA → Your rotation (slice 4)");
  it.todo("sync Garmin: on TODAY's numbers (slice 4)");
});
