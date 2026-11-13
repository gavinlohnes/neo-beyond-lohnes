import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, setWorkContext, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";

/** SHIFT-RUN-001 on TODAY: the rotation line under the mode, from the saved schedule; his declaration wins. */
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); localStorage.clear(); await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const rotation = { anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 };

// TODAY-CLARITY-001: the operating-state band says the run and NEXT, so the hero no longer repeats it while the band
// shows; when the band steps aside (here, a workout in progress) the hero's line is back.
it("on a Week B Wednesday night the band carries the run once; the hero's line returns when the band steps aside", async () => {
  vi.setSystemTime(new Date(2026, 10, 4, 19));
  await updateSchedulePattern(rotation);
  const day = await startDay(new Date(2026, 10, 4, 16, 30).toISOString()); await setWorkContext(day.id, "WORK", "MANUAL");
  let screen = await render(<App />);
  await expect.poll(() => document.querySelector("[data-life-next]")?.textContent).toBe("NEXT Day off: Fri, Nov 6 · forecast");
  expect(document.querySelector(".today-life-state__line")?.textContent).toMatch(/^WORK RUN Shift 1 of 2\. /);
  expect(document.querySelector(".mode-header__run")).toBeNull();
  await cleanup();
  await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  screen = await render(<App />);
  await expect.element(screen.getByText("scheduled: night 1 of 2 · next day off Fri", { exact: true })).toBeVisible();
});

it("says nothing when he declared the scheduled night OFF", async () => {
  vi.setSystemTime(new Date(2026, 10, 4, 19));
  await updateSchedulePattern(rotation);
  const day = await startDay(new Date(2026, 10, 4, 16, 30).toISOString()); await setWorkContext(day.id, "OFF", "MANUAL");
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: /^Mode / }).first()).toBeVisible();
  expect(document.querySelector(".mode-header__run")).toBeNull();
});
