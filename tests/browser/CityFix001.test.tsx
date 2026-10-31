import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * CITY-FIX-001 (owner's phone, 2026-10-30): ON SHIFT, the COMMS and SHIFT rows covered the skyline and
 * perch, and the SHIFT row cut the bottom of COMMS' text. The city now stands under the timeline.
 */
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true }); vi.setSystemTime(new Date(2026, 9, 12, 18, 31)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

for (const width of [360, 412]) it(`keeps the city between the timeline and the closing rows, uncovered, at ${width}px`, async () => {
  await page.viewport(width, 915);
  const { id: _i, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: /^Comms:/ })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "STARTED WORK", exact: true })).toBeVisible();
  const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
  const timeline = box(".cc-timeline"), skyline = box(".cc-skyline"), perch = box(".cc-perch"), comms = box(".comms-line");
  for (const art of [skyline, perch]) {
    expect(art.top).toBeGreaterThanOrEqual(timeline.bottom - 1);
    expect(art.bottom).toBeLessThanOrEqual(comms.top + 1);
    expect(art.height).toBeGreaterThan(40);
  }
  expect(box(".comms-line__text").bottom).toBeLessThanOrEqual(box(".work-start").top);
});
