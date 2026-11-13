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

it("SCHEDULE-MOVE-001: moves a confirmed change only after preview and CONFIRM; BACK changes nothing", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const { confirmScheduleException, getMoveTargets } = await import("../../src/application/scheduleExceptions");
  const { deriveWeekAhead } = await import("../../src/application/weekAheadQueries");
  const { getSchedulePattern } = await import("../../src/application/queries");
  const offDays = deriveWeekAhead(now, await getSchedulePattern(), "A").days.filter((d, i) => i > 0 && d.work === "OFF");
  const original = await confirmScheduleException({ date: offDays[0]!.date, kind: "WORK", note: "Cover" });
  const target = (await getMoveTargets(original.id, now)).find((d) => offDays.some((o) => o.date === d) && d !== original.date)!;
  const label = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const screen = await render(<WeekAheadView now={now} />);
  const list = screen.getByRole("region", { name: "Confirmed schedule changes" });
  await list.getByRole("button", { name: "MOVE" }).click();
  const preview = list.getByRole("group", { name: "Preview" });
  await preview.getByRole("combobox", { name: "Move to" }).selectOptions(target);
  await expect.element(preview.getByText(`Moves this change: ${label(original.date)} goes back to your rotation and ${label(target)} becomes a work day. The history is kept.`)).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  const before = JSON.stringify(await db.scheduleExceptions.toArray());
  await preview.getByRole("button", { name: "BACK" }).click();
  expect(JSON.stringify(await db.scheduleExceptions.toArray())).toBe(before);

  await list.getByRole("button", { name: "MOVE" }).click();
  await list.getByRole("combobox", { name: "Move to" }).selectOptions(target);
  await list.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(list.getByText(`${label(target)}: overtime (work)`)).toBeVisible();
  const row = (d: string) => screen.container.querySelector(`[data-week-ahead-day="${d}"]`)!;
  await expect.poll(() => row(target).textContent).toContain("confirmed change");
  expect(row(original.date).textContent).not.toContain("confirmed change");
  const rows = (await db.scheduleExceptions.toArray()).sort((x, y) => x.date.localeCompare(y.date)); // offDays[0] is the earliest
  expect(rows.map((e) => [e.date, e.status])).toEqual([[original.date, "CANCELLED"], [target, "ACTIVE"]]);
  expect(rows[0]!.history.map((h) => h.action)).toEqual(["CONFIRMED", "CANCELLED"]);
});
