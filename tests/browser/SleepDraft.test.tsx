import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { completeShiftDown, logWater, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { markAppOpened } from "../../src/ui/appSession";
import { db } from "../../src/persistence/db";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * Sleep draft (2026-10-03), through the real TODAY. Mon Oct 12 2026 is a
 * Week A work night under the owner's saved schedule; Shift Down completes
 * Tue 07:05 and the app is opened again at 14:20.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

async function workNightThenShiftDown(): Promise<BeyondDay> {
  const { id: _i, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  vi.setSystemTime(at(12, 16, 30));
  const day = await startDay();
  vi.setSystemTime(at(13, 6, 10));
  await markWorkEnded(day.id);
  vi.setSystemTime(at(13, 6, 50));
  const started = await startShiftDown(day.id, 15);
  vi.setSystemTime(at(13, 7, 5));
  await completeShiftDown(day.id, started);
  return day;
}

function openAt(when: Date) {
  vi.setSystemTime(when);
  markAppOpened(when);
}

beforeEach(async () => {
  // The clock is pinned but keeps running, so the screen's own polling and timeouts behave normally.
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  await page.viewport(360, 800);
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Sleep draft (real browser)", () => {
  it("proposes 'up to' the gap after Shift Down; a nudge and one tap log it as main sleep, recorded as adjusted", async () => {
    const day = await workNightThenShiftDown();
    openAt(at(13, 14, 20));
    const onOpenBody = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} />);

    await expect.element(screen.getByRole("heading", { name: "Slept up to 7 hr 15 min?" })).toBeVisible();
    await expect.element(screen.getByText("Shift Down 07:05 → opened 14:20", { exact: true })).toBeVisible();
    // Manual entry stays one tap away.
    await screen.getByRole("button", { name: "ENTER IN BODY" }).click();
    expect(onOpenBody).toHaveBeenCalledWith("sleep");

    await screen.getByRole("button", { name: "15 minutes less" }).click();
    await expect.element(screen.getByRole("heading", { name: "Slept up to 7 hr?" })).toBeVisible();
    await expect.element(screen.getByText("Shift Down 07:05 → opened 14:20 · adjusted −15 min", { exact: true })).toBeVisible();
    // Nothing is written until LOG.
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).some((e) => e.type === "SLEEP_LOGGED")).toBe(false);

    await screen.getByRole("button", { name: "LOG 7 HR" }).click();
    await expect.element(screen.getByText("Main sleep logged · 7 hr", { exact: true })).toBeVisible();
    const sleep = (await db.events.where("beyondDayId").equals(day.id).toArray()).find((e) => e.type === "SLEEP_LOGGED");
    expect(sleep?.payload).toMatchObject({ durationMinutes: 420, kind: "PRIMARY", draft: "ADJUSTED" });
    // Main sleep ends the post-shift stretch.
    await expect.element(screen.getByRole("heading", { name: "After sleep", exact: true })).toBeVisible();
  });

  it("NOT NOW hides it for that day, on this phone", async () => {
    await workNightThenShiftDown();
    openAt(at(13, 14, 20));
    const first = await render(<TodayScreen />);
    await first.getByRole("button", { name: "NOT NOW" }).click();
    const mainSleepRow = () => document.querySelector('[data-shift-clock-row="MAIN_SLEEP"]')?.textContent ?? "";
    await expect.poll(mainSleepRow, { timeout: 10_000 }).toContain("Log it when you wake.");
    expect(mainSleepRow()).not.toContain("Slept up to");
    await cleanup();

    await render(<TodayScreen />);
    await expect.poll(mainSleepRow, { timeout: 10_000 }).toContain("Log it when you wake.");
    expect(mainSleepRow()).not.toContain("Slept up to");
  });

  it("stays quiet when something else was done in BEYOND after Shift Down", async () => {
    const day = await workNightThenShiftDown();
    vi.setSystemTime(at(13, 9, 0));
    await logWater(day.id, 16);
    openAt(at(13, 14, 20));
    await render(<TodayScreen />);

    const mainSleepRow = () => document.querySelector('[data-shift-clock-row="MAIN_SLEEP"]')?.textContent ?? "";
    await expect.poll(mainSleepRow, { timeout: 10_000 }).toContain("Log it when you wake.");
    expect(mainSleepRow()).not.toContain("Slept up to");
  });
});
