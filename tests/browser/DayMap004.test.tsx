import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { logWater, markWorkStarted, startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * DAY-MAP-001: a mark recorded since the last look on this device is outlined on the map, counted on THE NIGHT SO FAR
 * and named in its list and hidden sentence, for one visit. Device-local, like SINCE. Wed Nov 18 2026 is a work night.
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

const fresh = () => document.querySelectorAll(".cc-tl-fresh").length;
it("outlines what's new since the last look, once", async () => {
  vi.setSystemTime(new Date(2026, 10, 18, 16, 40)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(new Date(2026, 10, 18, 19)); await logWater(day.id, 20);

  // First look: nothing to compare with.
  let screen = await render(<TodayScreen />);
  await expect.poll(() => document.querySelectorAll("[data-day-map] > span").length).toBe(2);
  expect(fresh()).toBe(0);
  await cleanup();

  // Water logged elsewhere, then the next look.
  vi.setSystemTime(new Date(2026, 10, 18, 23)); await logWater(day.id, 16);
  screen = await render(<TodayScreen />);
  await expect.poll(fresh).toBe(1);
  expect(document.querySelector(".cc-tl-fresh")!.classList.contains("cc-tl-pin--water")).toBe(true);
  expect(document.querySelector("[data-day-map-summary]")!.textContent).toContain("New since you last looked: Water 16 oz at 23:00.");
  await screen.getByRole("button", { name: "THE NIGHT SO FAR · 3 · 1 NEW" }).click();
  await expect.poll(() => [...document.querySelectorAll("#day-map-list li")].at(-1)?.textContent).toBe("NEW · Water 16 oz at 23:00");
  // Contrast checked too: the red NEW label must stay readable.
  expect((await axe.run(screen.container, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/10-day-map-new.png`, element: document.querySelector("[aria-label='Mode']")! });
  await cleanup();

  // The look after that: already seen, so nothing is new.
  screen = await render(<TodayScreen />);
  await expect.poll(() => document.querySelectorAll("[data-day-map] > span").length).toBe(3);
  expect(fresh()).toBe(0);
});
