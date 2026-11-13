import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** SCHEDULE-EXCEPTIONS-001: a What-If becomes a confirmed change only after REVIEW and CONFIRM; cancel keeps history. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("confirms overtime from a What-If, labels the day, and cancels it from the list", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const { deriveWeekAhead } = await import("../../src/application/weekAheadQueries");
  const { getSchedulePattern } = await import("../../src/application/queries");
  const offDay = deriveWeekAhead(now, await getSchedulePattern(), "A").days.find((d, i) => i > 0 && d.work === "OFF")!;
  const before = { events: await db.events.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) };

  const screen = await render(<WeekAheadView now={now} />);
  const row = () => screen.container.querySelector(`[data-week-ahead-day="${offDay.date}"]`)!;
  await expect.poll(() => !!row()).toBe(true);
  (row().querySelector("button") as HTMLButtonElement).click();
  const offer = screen.getByRole("region", { name: "Confirm this change" });
  await offer.getByRole("textbox", { name: "Note" }).fill("Covering a shift");
  await offer.getByRole("button", { name: "REVIEW THE CHANGE" }).click();
  await expect.element(offer.getByText(/nothing is marked as worked\.$/)).toBeVisible();
  // Reviewing writes nothing.
  expect(await db.scheduleExceptions.count()).toBe(0);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  await offer.getByRole("button", { name: "CONFIRM" }).click();

  const list = screen.getByRole("region", { name: "Confirmed schedule changes" });
  await expect.element(list.getByText(/overtime \(work\)$/)).toBeVisible();
  await expect.element(list.getByText("Covering a shift")).toBeVisible();
  await expect.poll(() => row().textContent).toContain("confirmed change");
  expect((await db.scheduleExceptions.toArray()).map((e) => [e.date, e.kind, e.status])).toEqual([[offDay.date, "WORK", "ACTIVE"]]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await list.getByRole("button", { name: "CANCEL CHANGE" }).click();
  await expect.element(list.getByText(/goes back to your rotation\. The history is kept\.$/)).toBeVisible();
  await list.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByRole("region", { name: "Confirmed schedule changes" })).not.toBeInTheDocument();
  expect((await db.scheduleExceptions.toArray()).map((e) => e.status)).toEqual(["CANCELLED"]);
  // The rotation and the event log are untouched.
  expect({ events: await db.events.count(), schedule: JSON.stringify(await db.schedulePatterns.toArray()) }).toEqual(before);
});
