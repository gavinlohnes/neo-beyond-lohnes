import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * OPERATOR-EXPERIENCE-001: TODAY's operating-state band says NOW and NEXT (with where NEXT came from) and opens the
 * week in place, so a confirmed change can be seen, moved or cancelled without leaving TODAY (before: MORE → WEEKLY →
 * SHOW WEEK AHEAD). Week B from Mon Nov 16 2026: Wed 18/Thu 19 work, Fri 20–Sun 22 off, Mon 23/Tue 24 work.
 */
beforeEach(async () => {
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const next = () => document.querySelector("[data-life-next]")?.textContent;

it("names NOW and NEXT, opens the week in place, and NEXT follows a change cancelled there", async () => {
  vi.setSystemTime(new Date(2026, 10, 17, 9));
  await confirmScheduleException({ date: "2026-11-20", kind: "WORK", note: "Cover" });
  vi.setSystemTime(new Date(2026, 10, 18, 20)); // Wed night: shift 1 of 2
  await startDay();
  const before = { events: await db.events.count(), exceptions: JSON.stringify(await db.scheduleExceptions.toArray()) };
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);

  await expect.poll(next).toBe("NEXT Day off: Sat, Nov 21 · forecast · 1 confirmed change ahead");
  await screen.getByText("WHY WORK RUN").click();
  await expect.element(screen.getByText("Next: a day off on Sat, Nov 21, from your saved schedule (a forecast, not a record).")).toBeVisible();

  const toggle = screen.getByRole("button", { name: "WEEK AHEAD · 1 CONFIRMED" });
  await toggle.click();
  const week = screen.getByRole("region", { name: "Week ahead" });
  const list = week.getByRole("region", { name: "Confirmed schedule changes" });
  await expect.element(list.getByText("Fri, Nov 20: overtime (work)")).toBeVisible();
  // Reading and opening write nothing.
  expect({ events: await db.events.count(), exceptions: JSON.stringify(await db.scheduleExceptions.toArray()) }).toEqual(before);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  // Cancelling there is still confirm-first, and TODAY's NEXT follows.
  await list.getByRole("button", { name: "CANCEL CHANGE" }).click();
  expect((await db.scheduleExceptions.toArray())[0]!.status).toBe("ACTIVE");
  await list.getByRole("button", { name: "CONFIRM" }).click();
  await expect.poll(next).toBe("NEXT Day off: Fri, Nov 20 · forecast");
  await expect.element(screen.getByRole("button", { name: "HIDE WEEK AHEAD" })).toBeVisible();
  await screen.getByRole("button", { name: "HIDE WEEK AHEAD" }).click();
  expect(document.getElementById("today-week-ahead")).toBeNull();
});

it("before 16:30 tonight's shift is next; with no saved schedule NEXT says it isn't known", async () => {
  vi.setSystemTime(new Date(2026, 10, 17, 18)); // Tue's lived day (off), Wed's shift tonight-ish
  await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 9)); // still Tuesday's lived day
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(next).toBe("NEXT Shift: Wed, Nov 18 · 18:00 · forecast");
  await cleanup();
  // No saved schedule: today is what he recorded; the days ahead are unknown, never guessed.
  await db.schedulePatterns.clear();
  vi.setSystemTime(new Date(2026, 10, 18, 17));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(next).toBe("NEXT Days: work or off not known · no saved schedule");
});

it("slice 3: names what changed since the last look on this device, once, and not the visit's own changes", async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.setSystemTime(new Date(2026, 10, 18, 20));
  await startDay();
  const since = () => document.querySelector("[data-life-since]")?.textContent ?? null;

  // First look: nothing to compare with.
  let screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(next).toBe("NEXT Day off: Fri, Nov 20 · forecast");
  expect(since()).toBeNull();
  await cleanup();

  // A change made elsewhere shows on the next visit.
  vi.setSystemTime(new Date(2026, 10, 18, 21, 15));
  await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
  screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(since).toBe("SINCE 20:00 Confirmed changes: 0 → 1");
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  // Cancelling it during this visit isn't reported back as a change in this visit…
  await screen.getByRole("button", { name: "WEEK AHEAD · 1 CONFIRMED" }).click();
  const list = screen.getByRole("region", { name: "Confirmed schedule changes" });
  await list.getByRole("button", { name: "CANCEL CHANGE" }).click();
  await list.getByRole("button", { name: "CONFIRM" }).click();
  await expect.poll(next).toBe("NEXT Day off: Fri, Nov 20 · forecast");
  expect(since()).toBe("SINCE 20:00 Confirmed changes: 0 → 1");
  await cleanup();

  // …nor on the next one: the last look already showed it.
  screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(next).toBe("NEXT Day off: Fri, Nov 20 · forecast");
  expect(since()).toBeNull();
});
