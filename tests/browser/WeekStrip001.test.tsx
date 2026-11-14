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
 * WEEK-STRIP-001: the coming days as tiles under NEXT, from Week Ahead's own days (recorded, confirmed change,
 * forecast, unknown), each opening Week Ahead in place at that day. Week B from Mon Nov 16 2026: Wed 18/Thu 19 work,
 * Fri 20–Sun 22 off, Mon 23/Tue 24 work. Fri 20 is confirmed overtime.
 */
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

const tiles = () => [...document.querySelectorAll<HTMLButtonElement>("[data-week-strip-day]")];
it("reads the week at a glance and opens Week Ahead at a tapped day, writing nothing", async () => {
  vi.setSystemTime(new Date(2026, 10, 17, 9)); await confirmScheduleException({ date: "2026-11-20", kind: "WORK" });
  vi.setSystemTime(new Date(2026, 10, 18, 20)); await startDay();
  const before = { events: await db.events.count(), exceptions: JSON.stringify(await db.scheduleExceptions.toArray()) };
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => tiles().length).toBe(7);
  expect(tiles().map((t) => t.getAttribute("aria-label"))).toEqual([
    "Wed, Nov 18: work 18:00, recorded. Open in week ahead",
    "Thu, Nov 19: work 18:00, forecast. Open in week ahead",
    "Fri, Nov 20: work 18:00, confirmed change. Open in week ahead",
    "Sat, Nov 21: day off, forecast. Open in week ahead",
    "Sun, Nov 22: day off, forecast. Open in week ahead",
    "Mon, Nov 23: work 18:00, forecast. Open in week ahead",
    "Tue, Nov 24: work 18:00, forecast. Open in week ahead",
  ]);
  expect(tiles()[0]!.getAttribute("aria-current")).toBe("date");
  expect(tiles().filter((t) => t.getAttribute("aria-current")).length).toBe(1);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/11-week-strip.png`, element: document.querySelector("[aria-label='Operating state']")! });

  await screen.getByRole("button", { name: /^Sun, Nov 22: day off, forecast/ }).click();
  await expect.element(screen.getByRole("region", { name: "Week ahead" })).toBeVisible();
  await expect.poll(() => { const row = document.querySelector("#today-week-ahead [data-week-ahead-day='2026-11-22']"); if (!row) return false; const r = row.getBoundingClientRect(); return r.top >= -2 && r.bottom <= window.innerHeight + 2; }).toBe(true);
  expect({ events: await db.events.count(), exceptions: JSON.stringify(await db.scheduleExceptions.toArray()) }).toEqual(before);
});

it("with no saved schedule the coming days say they aren't known, never a guess", async () => {
  await db.schedulePatterns.clear();
  vi.setSystemTime(new Date(2026, 10, 18, 17)); const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  await render(<TodayScreen onOpenLife={() => {}} />);
  await expect.poll(() => tiles().length).toBe(7);
  expect(tiles()[0]!.getAttribute("aria-label")).toBe("Wed, Nov 18: work, recorded. Open in week ahead");
  expect(tiles().slice(1).every((t) => t.getAttribute("aria-label")!.endsWith(": work or off not known. Open in week ahead"))).toBe(true);
  expect(tiles()[1]!.textContent).toBe("TH?19");
});
