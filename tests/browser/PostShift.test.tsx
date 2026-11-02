import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, setWorkContext, updateSchedulePattern } from "../../src/application/commands";

/** POST-SHIFT-001: right after a shift TODAY offers DRIVE HOME, quietly; not before or during. Invented schedule. */
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); localStorage.clear(); await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([
  ["after shift", new Date(2026, 10, 3, 7), "RECOVER", true],
  ["during shift", new Date(2026, 10, 2, 23), "ON SHIFT", false],
] as const)("%s", async (_name, now, mode, shown) => {
  vi.setSystemTime(now);
  await updateSchedulePattern({ anchorMonday: "2026-11-02", weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 });
  const day = await startDay(new Date(2026, 10, 2, 16, 30).toISOString()); await setWorkContext(day.id, "WORK", "MANUAL");
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: new RegExp(`^Mode ${mode}, per schedule`) })).toBeVisible();
  const drive = screen.getByRole("button", { name: "DRIVE HOME · HANDS-FREE" });
  if (!shown) { await expect.element(drive).not.toBeInTheDocument(); return; }
  await drive.click();
  await expect.element(screen.getByRole("dialog", { name: "Drive home" })).toBeVisible();
});
