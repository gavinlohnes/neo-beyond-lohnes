import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { logSleep, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getActiveDay } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * EARLY-DAY-START-001 (Gavin, 2026-11-20): he leaves the day running and wakes around 15:00. Once last night's sleep
 * is in, TODAY offers START DAY; the tap opens the 16:30 day that owns tonight's shift. Week A, Sat Nov 14 2026 is
 * night 2 of 3.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const row = () => document.querySelector("[aria-label='Start your day']");

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(13, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  await startDay(at(13, 16, 30).toISOString());
  vi.setSystemTime(at(14, 14, 50));
  await logSleep((await getActiveDay())!.id, 400, "PRIMARY");
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: offers START DAY at 15:05 and the tap opens tonight's work day, shift 2 of 3`, async () => {
    await page.viewport(width, 800);
    vi.setSystemTime(at(14, 15, 5));
    const events = await db.events.count();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.element(screen.getByText("Opens the day that owns your 18:00 shift. A check-in now carries past 16:30.")).toBeVisible();
    expect(await db.events.count()).toBe(events); // showing the row writes nothing
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(row()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

    await screen.getByRole("region", { name: "Start your day" }).getByRole("button", { name: "START DAY" }).click();
    await expect.poll(async () => (await getActiveDay())?.startedAt).toBe(at(14, 16, 30).toISOString());
    expect((await getActiveDay())!.workContext).toBe("WORK");
    await expect.poll(() => row()).toBeNull();
    await expect.poll(() => document.querySelector("[aria-label='Operating state'] .today-life-state__line")?.textContent ?? "").toMatch(/Shift 2 of 3\./);
  });
}

it("is not offered before the window (11:00) or once the 16:30 day is running", async () => {
  vi.setSystemTime(at(14, 11, 0));
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(screen.getByText("BEYOND // TODAY")).toBeVisible();
  await new Promise((r) => setTimeout(r, 300));
  expect(row()).toBeNull();
  await cleanup();

  vi.setSystemTime(at(14, 16, 31));
  await startDay(at(14, 16, 30).toISOString());
  await render(<TodayScreen onOpenLife={() => {}} />);
  await new Promise((r) => setTimeout(r, 300));
  expect(row()).toBeNull();
});
