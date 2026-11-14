import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { markWorkStarted, startDay, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * DAY-MAP-001 slice 2 (Gavin, 2026-11-13, "A"): the shift sleep plan's windows, outlined on TODAY's bar while still
 * ahead, with SLEEP PLAN › opening ROUTE (the cards, sources, SAVE/SKIP stay there). The plan's own numbers are
 * covered in tests/integration/shiftSleepPlan.test.ts; here its read returns a fixed plan.
 */
vi.mock("../../src/application/shiftSleepPlan", async (original) => ({
  ...(await original<typeof import("../../src/application/shiftSleepPlan")>()),
  getShiftSleepPlan: async () => ({
    shift: { date: "2026-11-18", start: new Date(2026, 10, 18, 18).toISOString(), end: new Date(2026, 10, 19, 6).toISOString(), overnight: true, firstOfRun: true, lastOfRun: false },
    cards: [],
    windows: [
      { kind: "SLEEP", start: new Date(2026, 10, 19, 7, 30).toISOString(), end: new Date(2026, 10, 19, 14, 15).toISOString(), basis: "RHYTHM" },
      { kind: "NAP", start: new Date(2026, 10, 18, 8).toISOString(), end: new Date(2026, 10, 18, 17).toISOString(), basis: "RHYTHM" },
    ],
  }),
}));
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("outlines the usual sleep ahead (the nap is over), names it as planned, and SLEEP PLAN opens ROUTE", async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 16, 40)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(new Date(2026, 10, 18, 22));
  const events = await db.events.count();
  const opened: string[] = [];
  const screen = await render(<TodayScreen onOpenCave={(tab) => opened.push(tab)} />);
  await expect.poll(() => document.querySelectorAll(".cc-tl-span--sleep_plan").length).toBe(1);
  expect(document.querySelectorAll(".cc-tl-span--nap_plan").length).toBe(0);
  const plan = document.querySelector<HTMLElement>(".cc-tl-span--sleep_plan")!;
  expect(parseFloat(plan.style.left)).toBeCloseTo((15 / 24) * 100, 1); // 07:30 is 15 h after 16:30
  expect(document.querySelector("[data-day-map-summary]")!.textContent).toBe("Recorded since the day started: At work since 18:02. Planned: Usual sleep 07:30–14:15 (sleep plan, your Garmin rhythm).");
  expect([...document.querySelectorAll(".cc-tl-key span")].map((s) => s.textContent)).toEqual(["Work", "Planned sleep"]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/08-day-map-sleep-plan.png`, element: document.querySelector("[aria-label='Mode']")! });
  await screen.getByRole("button", { name: "SLEEP PLAN ›" }).click();
  expect(opened).toEqual(["route"]);
  expect(await db.events.count()).toBe(events);
});

it("review of #507: while an operation owns TODAY (a workout in progress), the planned blocks and SLEEP PLAN step aside", async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 16, 40)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 22));
  await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  const screen = await render(<TodayScreen onOpenCave={() => {}} />);
  await expect.element(screen.getByRole("button", { name: /^RESUME WORKOUT/ }).first()).toBeVisible();
  expect(document.querySelector(".cc-tl-span--sleep_plan")).toBeNull();
  expect(document.querySelector(".cc-tl-plan-link")).toBeNull();
});
