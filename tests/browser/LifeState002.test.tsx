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
  [18, "RUN STARTS Today is the first shift of the run."],
  [19, "LAST SHIFT The last shift of the run. Recovery starts tomorrow."],
  [20, "RUN OVER The run is over. Recovery begins today."],
  [21, "FREE DAYS The first day off is done. The rest of these days off are free."],
  [22, "FLIP DAY Back on shift tomorrow at 18:00."],
] as const) {
  it(`Nov ${day}: ${text.split(" ").slice(0, 2).join(" ")}`, async () => {
    vi.setSystemTime(new Date(2026, 10, day, 18));
    await startDay();
    const events = await db.events.count();
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    await expect.poll(momentLine).toBe(text);
    // Only the run-over moment offers a follow-up.
    expect(screen.getByRole("button", { name: "PLAN A LIGHT DAY" }).elements()).toHaveLength(day === 20 ? 1 : 0);
    expect(await db.events.count()).toBe(events);
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
}

it("the last shift is named, and mid-run there is no moment, only the state", async () => {
  vi.setSystemTime(new Date(2026, 10, 24, 18)); // Tue Nov 24, shift 2 of 2 (Wed is off): the last shift
  await startDay();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => document.querySelector("[aria-label='Operating state']")?.getAttribute("data-life-state")).toBe("WORK_RUN");
  expect(momentLine()).toBe("LAST SHIFT The last shift of the run. Recovery starts tomorrow.");
  vi.setSystemTime(new Date(2026, 10, 28, 18)); // Sat, shift 2 of 3: mid-run
  await cleanup();
  await startDay();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => document.querySelector("[aria-label='Operating state'] .today-life-state__line")?.textContent ?? "").toMatch(/^WORK RUN Shift 2 of 3\./);
  expect(momentLine()).toBeNull();
});

it("PLAN A LIGHT DAY previews, writes only on CONFIRM, and isn't offered twice", async () => {
  vi.setSystemTime(new Date(2026, 10, 20, 18));
  await startDay();
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await screen.getByRole("button", { name: "PLAN A LIGHT DAY" }).click();
  const preview = screen.getByRole("group", { name: "Preview" });
  await expect.element(preview.getByText("Adds this plan item for today. Nothing else changes.")).toBeVisible();
  await preview.getByRole("button", { name: "CANCEL" }).click();
  expect(await db.obligations.count()).toBe(0);
  await screen.getByRole("button", { name: "PLAN A LIGHT DAY" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText("Added plan item for today: Keep today light.")).toBeVisible();
  const [item] = await db.obligations.toArray();
  expect([item!.title, item!.plannedAt, item!.description]).toEqual(["Keep today light", "2026-11-20", "From the end of your run: the first day off after it."]);
  await cleanup();
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.element(page.getByText("“Keep today light” is already in today's plans.")).toBeVisible();
  expect(page.getByRole("button", { name: "PLAN A LIGHT DAY" }).elements()).toHaveLength(0);
});
