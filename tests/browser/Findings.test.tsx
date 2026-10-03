import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { endDay, startDay, updateSchedulePattern } from "../../src/application/commands";
import { logUrge, saveQuitHabit } from "../../src/application/quitCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * Read-only findings (2026-10-03) in the weekly check-in. The clock (Date
 * only) is pinned; the owner's schedule makes Mon Oct 12 2026 a Week A work
 * night, so 08:00 the next morning falls just after a shift.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("Weekly check-in — findings (real browser)", () => {
  it("shows urge timing in counts once there are 6 urges, and names what's still counting", async () => {
    await saveQuitHabit({ name: "Drinking" });
    vi.setSystemTime(at(12, 16, 40));
    const day = await startDay();
    vi.setSystemTime(at(13, 8, 0));
    for (let i = 0; i < 5; i++) await logUrge(day.id, "AFTER_SHIFT");
    vi.setSystemTime(at(12, 20, 0));
    await logUrge(day.id, "STRESS");
    vi.setSystemTime(at(13, 9, 0));
    await endDay(day.id);

    vi.setSystemTime(at(13, 10, 0));
    const screen = await render(<WeeklyCheckInScreen />);
    const section = screen.getByRole("region", { name: "FINDINGS" });
    await expect.element(section.getByText("When urges came", { exact: true })).toBeVisible();
    await expect.element(section.getByText("5 of 6 after a shift · 1 during a shift", { exact: true })).toBeVisible();
    await expect.element(section.getByText("Last 45 days · placed against your saved schedule.", { exact: true })).toBeVisible();
    await expect
      .element(
        section.getByText(
          "Not enough data yet: sleep before workouts (0 of 6 each way), before vs. after the shift (0 of 6 each way).",
          { exact: true },
        ),
      )
      .toBeVisible();
    // Read-only: nothing in the section to act on.
    expect(section.getByRole("button").elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("with nothing logged, says only what's still counting", async () => {
    vi.setSystemTime(at(13, 10, 0));
    const screen = await render(<WeeklyCheckInScreen />);
    const section = screen.getByRole("region", { name: "FINDINGS" });
    await expect
      .element(section.getByText(/^Not enough data yet: sleep before workouts \(0 of 6 each way\), .*when urges came \(0 of 6 urges\)\.$/))
      .toBeVisible();
    expect(document.querySelectorAll("[data-finding]")).toHaveLength(0);
  });
});
