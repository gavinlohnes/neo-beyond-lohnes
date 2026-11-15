import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 12)); await db.open(); });
afterEach(() => { db.close(); vi.useRealTimers(); });

async function session(dayId: string, date: number, variant: "STANDARD" | "REDUCED", weight: number, substitute = false) {
  vi.setSystemTime(new Date(2026, 10, date, 12));
  const workout = await startWorkout(dayId, "A", variant);
  const count = variant === "STANDARD" ? 3 : 2;
  for (let n = 1; n <= count; n++) {
    await logSet(dayId, workout.id, "machine-chest-press", n, substitute && n === count ? 300 : weight, 10,
      substitute && n === count ? "Different machine" : undefined);
  }
  await completeWorkout(dayId, workout.id, variant, "COMPLETED");
}

it("uses the latest cross-variant stall load rather than the old matching slot's weight", async () => {
  const day = await startDay();
  await session(day.id, 1, "STANDARD", 500);
  for (const date of [3, 5, 7, 9, 11]) await session(day.id, date, "REDUCED", 100);
  vi.setSystemTime(new Date(2026, 10, 12, 12));
  const events = await db.events.count();
  expect(await getProgressionSuggestion("A", "STANDARD", "machine-chest-press")).toMatchObject({
    recommendation: "DELOAD", lastWeight: 100, suggestedNextWeight: 90, stallTopWeights: [100, 100, 100, 100],
  });
  expect(await db.events.count()).toBe(events);
});

it("a heavier substituted movement cannot supply the stalled lift's deload weight", async () => {
  const day = await startDay();
  for (const date of [1, 3, 5, 7]) await session(day.id, date, "STANDARD", 100);
  await session(day.id, 9, "STANDARD", 100, true);
  vi.setSystemTime(new Date(2026, 10, 10, 12));
  expect(await getProgressionSuggestion("A", "STANDARD", "machine-chest-press")).toMatchObject({
    recommendation: "DELOAD", lastWeight: 100, suggestedNextWeight: 90, stallTopWeights: [100, 100, 100, 100],
  });
});

it("a lighter session in another variant suppresses immediate repeated deload advice", async () => {
  const day = await startDay();
  for (const date of [1, 3, 5, 7, 9]) await session(day.id, date, "STANDARD", 100);
  await session(day.id, 11, "REDUCED", 90);
  vi.setSystemTime(new Date(2026, 10, 12, 12));
  expect((await getProgressionSuggestion("A", "STANDARD", "machine-chest-press")).recommendation).toBe("HOLD");
});
