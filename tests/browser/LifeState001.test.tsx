import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";

/**
 * LIFE-STATE-001: TODAY names the day's state from the saved 2-2-3 schedule and the recorded day, with its sources,
 * and orders its sections by it. Week B (from Mon Nov 16 2026) works Wed and Thu; Fri–Sun are off.
 */
beforeEach(async () => {
  await page.viewport(390, 844);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const band = () => document.querySelector("[aria-label='Operating state']");
const lifeFirst = () => {
  const life = document.querySelector(".today-life-link"), support = document.querySelector(".today-context-support");
  return !!life && !!support && !!(life.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING);
};

for (const [date, state, line, first] of [
  [new Date(2026, 10, 18, 18), "WORK RUN", /^WORK RUN Shift 1 of 2\. Fuel, water and sleep between shifts carry the run\.$/, false],
  [new Date(2026, 10, 20, 18), "RECOVERY", /^RECOVERY The first day off after the run\. Sleep usually comes first; plans can wait\. Back on Mon\.$/, true],
  [new Date(2026, 10, 21, 18), "FREE", /^FREE A day off with no shift on either side\. Your time for plans, people and training\. Back on Mon\.$/, true],
  [new Date(2026, 10, 22, 18), "FLIP", /^FLIP The last day off before the run\. Today is the switch back to shift hours\. Back on tomorrow\.$/, false],
] as const) {
  it(`${state}: names the state, shows why, and orders TODAY by it`, async () => {
    vi.setSystemTime(date);
    await startDay();
    const events = await db.events.count();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.poll(() => band()?.querySelector(".today-life-state__line")?.textContent).toMatch(line);
    expect(band()?.getAttribute("data-life-state")).toBe(state.replace(" ", "_"));
    await screen.getByText(`WHY ${state}`).click();
    await expect.element(screen.getByText("This describes the day. BEYOND's advice still comes from your check-in.")).toBeVisible();
    expect(lifeFirst()).toBe(first);
    // FIELD-AUTHORITY-001: the calm line still leads the next card.
    await expect.element(screen.getByRole("heading", { name: "Log when you want." })).toBeVisible();
    expect(await db.events.count()).toBe(events); // reading the state writes nothing
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
}

it("what you recorded wins: a scheduled work day recorded as a day off after a shift reads as recovery", async () => {
  vi.setSystemTime(new Date(2026, 10, 19, 18)); // Thu: scheduled work (shift 2 of 2), the day after Wed's shift
  const day = await startDay();
  await setWorkContext(day.id, "OFF", "MANUAL");
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => band()?.getAttribute("data-life-state")).toBe("RECOVERY");
});

it("with no saved schedule and nothing recorded, TODAY names no state and keeps its old order", async () => {
  await db.schedulePatterns.clear();
  vi.setSystemTime(new Date(2026, 10, 21, 18));
  await startDay();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await new Promise((r) => setTimeout(r, 500));
  expect(band()).toBeNull();
  expect(lifeFirst()).toBe(true);
});

it("steps aside while a workout owns the card, so RESUME stays first", async () => {
  vi.setSystemTime(new Date(2026, 10, 21, 18));
  const day = await startDay();
  await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(screen.getByRole("button", { name: /RESUME WORKOUT/ }).first()).toBeVisible();
  expect(band()?.closest("[hidden]")).not.toBeNull();
});

it("lands in the same render as TODAY's numbers, so nothing jumps after load (CI: Garmin005 tapped a moved tile)", async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 18));
  await startDay();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  // The next card appears only once the day has loaded; the band must already be there with it.
  await expect.element(screen.getByRole("heading", { name: "Log when you want." })).toBeVisible();
  expect(band()?.getAttribute("data-life-state")).toBe("WORK_RUN");
});
