import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout, logSet } from "../../src/application/trainCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * RESUME-FOLD-001: with a workout under way, RESUME WORKOUT sits above the nav at every phone width, once TODAY has
 * fully settled. At 412 x 800 the full skyline scene used to push it 17 px under (CommandConsole caught it only when it
 * measured after the last reads arrived, so it failed now and then, most often with an Alfred key saved).
 */
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 14, 17));
  try { localStorage.clear(); localStorage.setItem("beyond.alfredKey", "sk-ant-synthetic"); } catch { /* ignore */ }
  const { id: _i, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); try { localStorage.clear(); } catch { /* ignore */ } });

it("keeps RESUME WORKOUT above the nav at 320, 360 and 412 px once TODAY has settled", async () => {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const workout = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, workout.id, "machine-chest-press", 1, 110, 10);
  await page.viewport(360, 800);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "RESUME WORKOUT" })).toBeVisible();
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    // Settled: every animation finished and a second for the last reads, then measure.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const resume = screen.getByRole("button", { name: "RESUME WORKOUT" }).element().getBoundingClientRect();
    expect(resume.bottom, `${width}`).toBeLessThanOrEqual(document.querySelector(".shell-nav")!.getBoundingClientRect().top);
  }
});
