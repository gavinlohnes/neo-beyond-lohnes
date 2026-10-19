import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, setWorkContext, startDay } from "../../src/application/commands";
import { logSet, startWorkout } from "../../src/application/trainCommands";
import { getActiveDay } from "../../src/application/queries";
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
  vi.restoreAllMocks();
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

for (const newActivity of [false, true]) it(`rechecks an idle deadline while App stays mounted${newActivity ? ", and a new set moves the deadline" : ""}`, async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const at = (hour: number, minute = 0, second = 0) => new Date(2026, 9, 22, hour, minute, second);
  vi.setSystemTime(at(15));
  const day = await startDay();
  vi.setSystemTime(at(16));
  const workout = await startWorkout(day.id, "A", "REDUCED");

  // Keep real browser/IndexedDB/locator timers. Capture App's real deadlines
  // and dispatch their callbacks after advancing Date, without waiting hours.
  const scheduled: { at: number; fire: () => void }[] = [];
  const realSetTimeout = window.setTimeout.bind(window);
  vi.spyOn(window, "setTimeout").mockImplementation((handler, delay = 0, ...args) => {
    const id = realSetTimeout(handler, delay, ...args);
    if (typeof handler === "function") {
      scheduled.push({ at: Date.now() + delay, fire: () => { clearTimeout(id); handler(...args); } });
    }
    return id;
  });
  async function fireAt(time: Date) {
    await expect.poll(() => scheduled.some((entry) => entry.at === time.getTime())).toBe(true);
    const index = scheduled.findIndex((entry) => entry.at === time.getTime());
    const [timer] = scheduled.splice(index, 1);
    vi.setSystemTime(time);
    timer!.fire();
  }

  vi.setSystemTime(at(16, 29, 59));
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await fireAt(at(16, 30, 1));
  await expect.poll(() => scheduled.some((entry) => entry.at === at(18, 0, 1).getTime())).toBe(true);
  expect((await getActiveDay())?.id).toBe(day.id);
  if (newActivity) {
    vi.setSystemTime(at(17));
    await logSet(day.id, workout.id, "machine-chest-press", 1, 100, 8);
  }
  await fireAt(at(18, 0, 1));
  if (newActivity) {
    await expect.poll(() => scheduled.some((entry) => entry.at === at(19, 0, 1).getTime())).toBe(true);
    expect((await getActiveDay())?.id).toBe(day.id);
    await fireAt(at(19, 0, 1));
  }
  await expect.poll(async () => (await getActiveDay())?.id).not.toBe(day.id);
  await expect.element(screen.getByText("WORKOUT STILL OPEN", { exact: true })).toBeVisible();
  expect(await db.workoutSessions.get(workout.id)).toMatchObject({ status: "ACTIVE", beyondDayId: day.id });
  expect((await db.beyondDays.toArray()).filter((row) => row.status === "ACTIVE")).toHaveLength(1);
});
