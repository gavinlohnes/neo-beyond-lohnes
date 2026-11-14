import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { logProtein, logWater, markWorkStarted, startDay, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * DAY-MAP-001 slice 3: THE NIGHT SO FAR opens the map as a list, each item with its time and, where one exists, its
 * own screen (water, food, sleep, TRAIN, ROUTE). Nothing is written. Week B: Wed Nov 18 2026 is a work night.
 */
vi.mock("../../src/application/shiftSleepPlan", async (original) => ({
  ...(await original<typeof import("../../src/application/shiftSleepPlan")>()),
  getShiftSleepPlan: async () => ({
    shift: { date: "2026-11-18", start: new Date(2026, 10, 18, 18).toISOString(), end: new Date(2026, 10, 19, 6).toISOString(), overnight: true, firstOfRun: true, lastOfRun: false },
    cards: [],
    windows: [{ kind: "SLEEP", start: new Date(2026, 10, 19, 7, 30).toISOString(), end: new Date(2026, 10, 19, 14, 15).toISOString() }],
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

it("lists the night so far, opens each item's own screen, writes nothing, and steps aside for a workout", async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 16, 40)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 17, 15)); await logProtein(day.id, 45);
  vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(new Date(2026, 10, 18, 19)); await logWater(day.id, 20);
  vi.setSystemTime(new Date(2026, 10, 18, 22));
  const events = await db.events.count();
  const opened: string[] = [];
  let screen = await render(<TodayScreen onOpenHealthEvidence={(m) => opened.push(`evidence:${m}`)} onOpenTrain={(d) => opened.push(`train:${d}`)} onOpenCave={(t) => opened.push(`cave:${t}`)} />);

  const toggle = screen.getByRole("button", { name: "THE NIGHT SO FAR · 4" });
  await toggle.click();
  const list = screen.getByRole("list", { name: "The night so far" });
  const rows = () => [...document.querySelectorAll("#day-map-list li")].map((li) => li.textContent);
  await expect.poll(rows).toEqual([
    expect.stringMatching(/ at 17:15FOOD ›$/),
    "At work since 18:02",
    "Water 20 oz at 19:00WATER ›",
    "PLANNED · Usual sleep 07:30–14:15 (sleep plan, your Garmin rhythm)ROUTE ›",
  ]);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/09-day-map-list.png`, element: document.querySelector("[aria-label='Mode']")! });
  await list.getByRole("button", { name: "WATER ›" }).click();
  await list.getByRole("button", { name: "FOOD ›" }).click();
  await list.getByRole("button", { name: "ROUTE ›" }).click();
  expect(opened).toEqual(["evidence:water", "evidence:protein", "cave:route"]);
  await screen.getByRole("button", { name: "HIDE THE NIGHT" }).click();
  expect(document.getElementById("day-map-list")).toBeNull();
  expect(await db.events.count()).toBe(events);

  // Review of #508 (a): shown above, so a workout really is what hides the map, its list and SLEEP PLAN.
  await cleanup();
  await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  screen = await render(<TodayScreen onOpenCave={() => {}} onOpenHealthEvidence={() => {}} />);
  await expect.element(screen.getByRole("button", { name: /^RESUME WORKOUT/ }).first()).toBeVisible();
  expect(document.querySelector("[data-day-map]")).toBeNull();
  expect(document.querySelector(".cc-tl-plan-link")).toBeNull();
});
