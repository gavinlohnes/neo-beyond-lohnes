import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, setWorkContext, startDay } from "../../src/application/commands";
import { startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";

/**
 * TONIGHT-001 (owner ruling, 2026-10-19): a workout left open after a shift
 * used to hold the whole BeyondDay at 16:30, so TODAY kept showing that
 * day's mode, check-in and numbers for as long as it stayed open. An idle
 * workout now lets the day roll and stays resumable on its own day.
 */
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

it("an idle workout from the morning no longer freezes TODAY at 16:30, and it says which day it's from", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 6, 52)); // Thu Oct 22, after a night shift
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  await logProtein(day.id, 75);
  const workout = await startWorkout(day.id, "A", "REDUCED");

  vi.setSystemTime(new Date(2026, 9, 22, 16, 41)); // waking for the next shift
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();

  await expect.element(screen.getByText("WORKOUT STILL OPEN", { exact: true })).toBeVisible();
  await expect.element(screen.getByText(/A · reduced · started Thu 06:52\. It stays on that day\./)).toBeVisible();
  await expect.poll(() => document.querySelector('[data-signal="stale-note"]')).toBeNull();
  await expect.element(screen.getByRole("button", { name: /^Protein 0 g/ })).toBeVisible();

  const days = await db.beyondDays.toArray();
  expect(days.filter((d) => d.status === "ACTIVE").map((d) => d.id)).not.toContain(day.id);
  expect(days.filter((d) => d.status === "ACTIVE")).toHaveLength(1);
  expect(await db.workoutSessions.get(workout.id)).toMatchObject({ status: "ACTIVE", beyondDayId: day.id });

  await screen.getByRole("button", { name: "RESUME WORKOUT", exact: true }).click();
  await expect.element(screen.getByText("Template A · REDUCED — in progress", { exact: true })).toBeVisible();
});
