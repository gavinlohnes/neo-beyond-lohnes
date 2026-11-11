import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { updateSchedulePattern } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { seedRotation } from "./helpers/rotation";

/** WEEK ENERGY FORECAST: Week Ahead shows each day's place in the run and its recorded energy, and follows the schedule. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const lines = (root: Element) => [...root.querySelectorAll("[data-energy-forecast-day]")].map((p) => p.textContent);

it("forecasts the week from recorded runs, writes nothing, and follows a schedule change", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const before = { events: await db.events.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) };

  const screen = await render(<WeekAheadView now={now} />);
  await expect.element(screen.getByText("ENERGY FORECAST")).toBeVisible();
  await expect.element(screen.getByText(/^Lowest \w{3} \(\d\.\d of 5\), best \w{3} \(\d\.\d of 5\)\.$/)).toBeVisible();
  await expect.element(screen.getByText(/^Sleep owed: \d+ h \d\d m against 7 h a night over your last 7 logged days\.$|^No sleep owed/)).toBeVisible();
  await expect.poll(() => lines(screen.container).length).toBe(7);
  const first = lines(screen.container);
  for (const line of first) expect(line).toMatch(/^(Shift|Day off) \d+ of \d+ · energy (\d\.\d of 5 \(\d+ days\) · main sleep .* · from (your past \d+-(shift|day-off) runs|past runs of any length)$|: not enough history)/);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect({ events: await db.events.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) }).toEqual(before);
  await cleanup();

  // The operator saves a different rotation; the forecast reads the new one.
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern({ ...schedule, weeks: [{ workdays: [2, 3, 4] }, { workdays: [2, 3, 4] }] });
  const again = await render(<WeekAheadView now={now} />);
  await expect.poll(() => lines(again.container).length).toBe(7);
  // Tue Oct 27 is now shift 1 of 3.
  expect(lines(again.container)[0]).toMatch(/^Shift 1 of 3 · /);
  expect(lines(again.container)).not.toEqual(first);
});
