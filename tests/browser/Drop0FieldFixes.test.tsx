import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import {
  logWater,
  performDueDayRollover,
  startDay,
  submitCheckIn,
  updateSchedulePattern,
} from "../../src/application/commands";
import { getActiveDay, getWorkContextSource } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { quickCheckInValues } from "../../src/ui/screens/today/TodayScreen";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * DROP 0 — the two open field reports, through the real rendered screens.
 * Oct 12 2026 is a Week A Monday (work), Oct 14 a Week A Wednesday (off),
 * under the owner's saved schedule.
 */

const at = (m: number, d: number, h: number, min = 0, s = 0) => new Date(2026, m - 1, d, h, min, s, 0);

async function saveOwnersSchedule() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
}

/** Starts the lived day at a fixed instant; the screen itself then renders on real time. */
async function startDayAt(when: Date): Promise<BeyondDay> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(when);
  const day = await startDay();
  vi.useRealTimers();
  return day;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Fix 1 — TODAY no longer asks when the saved schedule is clear", () => {
  /** Pins the clock (Date only) for the rest of the test; Shift Clock (Drop 2) lays TODAY out by the time. */
  function pinClock(when: Date) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(when);
  }

  it("scheduled work day: no question, 'Working · per schedule', and one tap changes it", async () => {
    await page.viewport(360, 800);
    await saveOwnersSchedule();
    const day = await startDayAt(at(10, 12, 16, 30));
    pinClock(at(10, 12, 16, 40));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Working · per schedule", { exact: true }).first()).toBeVisible();
    expect(screen.getByRole("heading", { name: "Are you working today?" }).elements()).toHaveLength(0);
    // Drop 2 ruling (a): before the shift starts, MARK WORK ENDED isn't offered.
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);

    // Drop 2: the one-tap change sits in the status strip, once.
    expect(screen.getByRole("button", { name: "CHANGE TO OFF" }).elements()).toHaveLength(1);
    await screen.getByRole("button", { name: "CHANGE TO OFF" }).click();
    await expect.element(screen.getByText("Off today", { exact: true })).toBeVisible();
    expect(screen.getByText("Working · per schedule", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Are you working today?" }).elements()).toHaveLength(0);
    expect((await getActiveDay())?.workContext).toBe("OFF");
    expect(await getWorkContextSource(day.id)).toBe("MANUAL");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("scheduled day off: no question, 'Off · per schedule', and one tap changes it", async () => {
    await saveOwnersSchedule();
    const day = await startDayAt(at(10, 14, 16, 30));
    pinClock(at(10, 14, 16, 40));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Off · per schedule", { exact: true })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Are you working today?" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "CHANGE TO WORKING" }).click();
    await expect.element(screen.getByRole("heading", { name: "Working today", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "MARK WORK ENDED" })).toBeVisible();
    expect((await getActiveDay())?.workContext).toBe("WORK");
    expect(await getWorkContextSource(day.id)).toBe("MANUAL");
  });

  it("seeded default schedule only: the existing question appears", async () => {
    await startDayAt(at(10, 12, 16, 30));
    pinClock(at(10, 12, 16, 40));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Are you working today?" })).toBeVisible();
    expect(screen.getByText("Working · per schedule", { exact: true }).elements()).toHaveLength(0);
  });
});

describe("Fix 2 — open screens move to the new day at 16:30", () => {
  it("BODY open across a rollover shows the new day's numbers and keeps a half-typed meal", async () => {
    const day = await startDay();
    await logWater(day.id, 16);
    const screen = await render(<BodyScreen />);
    const waterReading = () => [...document.querySelectorAll(".health-overview .tool-label")].find(el => el.textContent === "WATER")?.nextElementSibling?.textContent;
    await expect.poll(waterReading).toBe("16 oz");

    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await screen.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Half-typed bowl");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("640");

    // The day began two days ago, so a 16:30 boundary has passed since.
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await db.beyondDays.update(day.id, { startedAt: twoDaysAgo });
    const newDay = await performDueDayRollover();
    expect(newDay).toBeDefined();

    await screen.getByRole("button", { name: "DAILY RECORD" }).click();
    await expect.poll(waterReading).toBe("0 oz");
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Half-typed bowl");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(640);
  });

  it("an app left open on TODAY rolls over at 16:30 by itself and shows the new day", async () => {
    // Date runs on real time from 16:29:57, so the app's boundary timer fires about 4 s in.
    vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
    vi.setSystemTime(at(10, 14, 16, 29, 57));
    const day = await startDay();
    await db.beyondDays.update(day.id, { startedAt: at(10, 14, 10, 0).toISOString() });
    await submitCheckIn(day.id, quickCheckInValues);

    const screen = await render(<App />);
    await expect.element(screen.getByText(/Checked in/)).toBeVisible();

    await expect.poll(async () => (await getActiveDay())?.id, { timeout: 10_000, interval: 250 }).not.toBe(day.id);
    await expect.poll(() => screen.getByText(/Checked in/).elements().length, { timeout: 5_000 }).toBe(0);
  }, 20_000);
});
