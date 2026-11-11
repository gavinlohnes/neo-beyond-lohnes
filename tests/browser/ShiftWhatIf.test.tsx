import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { createObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** SHIFT-WHAT-IF: ask about a Week Ahead day and read what would change, with nothing saved. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("shows a read-only what-if for an upcoming day, grounded in the saved schedule and past runs", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const week = (await import("../../src/application/weekAheadQueries")).deriveWeekAhead;
  const { getSchedulePattern } = await import("../../src/application/queries");
  const offDay = week(now, await getSchedulePattern(), "A").days.find((d) => d.work === "OFF")!;
  await createObligation({ title: "Call the bank", plannedAt: offDay.date });
  const before = { events: await db.events.count(), obligations: JSON.stringify(await db.obligations.toArray()), schedule: JSON.stringify(await db.schedulePatterns.toArray()) };

  const screen = await render(<WeekAheadView now={now} />);
  await expect.element(screen.getByText("Planned: Call the bank")).toBeVisible();
  const row = screen.container.querySelector(`[data-week-ahead-day="${offDay.date}"]`)!;
  (row.querySelector("button") as HTMLButtonElement).click();

  const panel = screen.getByRole("region", { name: /were a shift\?$/ });
  // Review of #474: focus follows the panel open and back to the day's button on close.
  await expect.poll(() => document.activeElement?.textContent).toMatch(/were a shift\?$/);
  await expect.element(panel.getByText(/^Recovery window \(days off\):/)).toBeVisible();
  await expect.element(panel.getByText("Information only. Your schedule and plans haven't changed.")).toBeVisible();
  await expect.element(panel.getByText(/^Next sleep opportunity \(off-duty window\): \d+ h/)).toBeVisible();
  await expect.element(panel.getByText(/^Work run:/)).toBeVisible();
  await expect.element(panel.getByText("Planned: Call the bank")).toBeVisible();
  await expect.element(panel.getByText(/^With the change \(\d+ shifts\):/)).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await panel.getByRole("button", { name: "CLOSE" }).click();
  await expect.element(screen.getByRole("region", { name: /were a shift\?$/ })).not.toBeInTheDocument();
  await expect.poll(() => document.activeElement === row.querySelector("[data-what-if]")).toBe(true);
  expect({ events: await db.events.count(), obligations: JSON.stringify(await db.obligations.toArray()), schedule: JSON.stringify(await db.schedulePatterns.toArray()) }).toEqual(before);
});
