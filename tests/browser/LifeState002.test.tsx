import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * LIFE-STATE-002: on the day a state changes, TODAY names the moment above the state. Week B (from Mon Nov 16 2026)
 * works Wed and Thu; Fri–Sun are off; Mon Nov 23 starts the next run.
 */
beforeEach(async () => {
  await page.viewport(390, 844);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const momentLine = () => document.querySelector("[aria-label='Operating state'] .today-life-state__moment")?.textContent ?? null;

for (const [day, text] of [
  [18, "RUN STARTS This is the first shift of the run."],
  [19, "LAST SHIFT The last shift of the run. Recovery starts after it ends at 06:00."],
  [20, "RUN OVER The run is over. This is the first day off."],
  [21, "FREE DAYS The first day off is done. The rest of these days off are free."],
  [22, "FLIP DAY Back on shift tomorrow at 18:00."],
] as const) {
  it(`Nov ${day}: ${text.split(" ").slice(0, 2).join(" ")}`, async () => {
    vi.setSystemTime(new Date(2026, 10, day, 18));
    await startDay();
    const events = await db.events.count();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.poll(momentLine).toBe(text);
    // LIFE-STATE-003: only the run-over moment offers the post-run report and the recovery contract.
    expect(screen.getByRole("region", { name: "Recovery contract" }).elements()).toHaveLength(day === 20 ? 1 : 0);
    expect(screen.getByText("POST-RUN REPORT").elements()).toHaveLength(day === 20 ? 1 : 0);
    expect(await db.events.count()).toBe(events);
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
}

it("the last shift is named, and mid-run there is no moment, only the state", async () => {
  vi.setSystemTime(new Date(2026, 10, 24, 18)); // Tue Nov 24, shift 2 of 2 (Wed is off): the last shift
  await startDay();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => document.querySelector("[aria-label='Operating state']")?.getAttribute("data-life-state")).toBe("WORK_RUN");
  expect(momentLine()).toBe("LAST SHIFT The last shift of the run. Recovery starts after it ends at 06:00.");
  vi.setSystemTime(new Date(2026, 10, 28, 18)); // Sat, shift 2 of 3: mid-run
  await cleanup();
  await startDay();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => document.querySelector("[aria-label='Operating state'] .today-life-state__line")?.textContent ?? "").toMatch(/^WORK RUN Shift 2 of 3\./);
  expect(momentLine()).toBeNull();
});
