import { afterEach, expect, it, vi } from "vitest";
import { startDay, performDueDayRollover } from "../../src/application/commands";
import { getNextDayRolloverCheckAt } from "../../src/application/dayRolloverQueries";
import { logSet, skipSet, startWorkout } from "../../src/application/trainCommands";

const at = (hour: number, minute = 0) => new Date(2026, 9, 22, hour, minute);
afterEach(() => vi.useRealTimers());

it("schedules the boundary with no day, or with a day not yet due", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(15));
  expect(await getNextDayRolloverCheckAt()).toEqual(at(16, 30));
  await startDay();
  expect(await getNextDayRolloverCheckAt()).toEqual(at(16, 30));
});

it("schedules an overdue day immediately when no workout holds it", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(15));
  await startDay();
  vi.setSystemTime(at(17));
  expect(await getNextDayRolloverCheckAt()).toEqual(at(17));
});

it("follows the latest logged or skipped set, then returns to the next boundary after rollover", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(15));
  const day = await startDay();
  vi.setSystemTime(at(16));
  const workout = await startWorkout(day.id, "A", "REDUCED");
  vi.setSystemTime(at(16, 30));
  expect(await performDueDayRollover()).toBeUndefined();
  expect(await getNextDayRolloverCheckAt()).toEqual(at(18));
  vi.setSystemTime(at(17));
  await logSet(day.id, workout.id, "machine-chest-press", 1, 100, 8);
  expect(await getNextDayRolloverCheckAt()).toEqual(at(19));
  vi.setSystemTime(at(17, 30));
  await skipSet(day.id, workout.id, "machine-chest-press", 2);
  expect(await getNextDayRolloverCheckAt()).toEqual(at(19, 30));
  vi.setSystemTime(at(19, 30));
  expect(await performDueDayRollover()).toBeDefined();
  expect(await getNextDayRolloverCheckAt()).toEqual(new Date(2026, 9, 23, 16, 30));
});
