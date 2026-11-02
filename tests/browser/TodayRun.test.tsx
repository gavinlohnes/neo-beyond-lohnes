import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, setWorkContext, updateSchedulePattern } from "../../src/application/commands";

/** SHIFT-RUN-001 on TODAY: the rotation line under the mode, from the saved schedule; his declaration wins. */
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); localStorage.clear(); await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const rotation = { anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 };

it("shows 'scheduled: night 1 of 2 · next day off Fri' on a Week B Wednesday night", async () => {
  vi.setSystemTime(new Date(2026, 10, 4, 19));
  await updateSchedulePattern(rotation);
  const day = await startDay(new Date(2026, 10, 4, 16, 30).toISOString()); await setWorkContext(day.id, "WORK", "MANUAL");
  const screen = await render(<App />);
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
