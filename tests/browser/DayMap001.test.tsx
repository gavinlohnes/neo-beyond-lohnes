import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logProtein, logWater, markWorkStarted, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * DAY-MAP-001: TODAY's 16:30 → 16:30 bar carries what has been recorded on the lived day (check-in, a meal, water,
 * work since 18:02), read-only, with the same facts in one hidden sentence. Week B: Wed Nov 18 2026 is a work night.
 * Screenshot when VITE_WALKTHROUGH_SHOTS is set.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const t = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("draws the night so far on the lived-day bar, and writes nothing", async () => {
  vi.setSystemTime(t(18, 16, 40)); const day = await startDay();
  vi.setSystemTime(t(18, 17, 5)); await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 });
  vi.setSystemTime(t(18, 17, 15)); await logProtein(day.id, 45);
  vi.setSystemTime(t(18, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(t(18, 19)); await logWater(day.id, 20);
  vi.setSystemTime(t(18, 23)); await logWater(day.id, 16);
  vi.setSystemTime(t(19, 1));
  const events = await db.events.count();

  await render(<App />);
  await expect.poll(() => document.querySelectorAll("[data-day-map] > span").length).toBe(5);
  const summary = document.querySelector("[data-day-map-summary]")!.textContent!;
  expect(summary).toMatch(/^Recorded since the day started: Checked in at 17:05; .* at 17:15; At work since 18:02; Water 20 oz at 19:00; Water 16 oz at 23:00\.$/);
  // Work is drawn from 18:02 to now (01:00) on the 16:30 → 16:30 bar.
  const work = document.querySelector<HTMLElement>(".cc-tl-span--work")!;
  expect(parseFloat(work.style.left)).toBeCloseTo(((1.5 + 2 / 60) / 24) * 100, 1);
  expect(parseFloat(work.style.width)).toBeCloseTo(((8.5 - 1.5 - 2 / 60) / 24) * 100, 1);
  expect([...document.querySelectorAll(".cc-tl-key span")].map((s) => s.textContent)).toEqual(["Work", "Meal", "Water", "Check-in"]);
  await new Promise((done) => setTimeout(done, 300));
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  const result = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/07-day-map.png`, element: document.querySelector("[aria-label='Mode']")! });
  expect(await db.events.count()).toBe(events);
});
