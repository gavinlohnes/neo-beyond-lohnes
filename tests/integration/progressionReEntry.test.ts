import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, skipSet, startWorkout, undoLastSet } from "../../src/application/trainCommands";
import { getDaysSinceExerciseLastPerformed, getProgressionSuggestion } from "../../src/application/trainQueries";

/**
 * RE-ENTRY through the real TRAIN commands. Triceps Pressdown sits in both
 * Template A (2 sets) and Template C (3 sets) — the any-workout rule is
 * tested across them.
 */
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min, 0, 0);

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

async function session(when: Date, templateId: string, work: (dayId: string, sessionId: string) => Promise<void>) {
  vi.setSystemTime(when);
  const day = await startDay();
  const s = await startWorkout(day.id, templateId, "STANDARD");
  await work(day.id, s.id);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
  await endDay(day.id);
}

describe("getDaysSinceExerciseLastPerformed", () => {
  it("counts whole days since the last real set in any workout, ignoring skipped and undone sets", async () => {
    await session(at(9, 1, 7), "A", async (dayId, id) => {
      await logSet(dayId, id, "triceps-pressdown", 1, 60, 15);
    });
    await session(at(9, 10, 7), "C", async (dayId, id) => {
      await skipSet(dayId, id, "triceps-pressdown", 1);
      await logSet(dayId, id, "triceps-pressdown", 2, 60, 12);
      await undoLastSet(dayId, id);
    });
    // The only real set is Sep 1 — Sep 10's was skipped, then its logged set undone.
    expect(await getDaysSinceExerciseLastPerformed("triceps-pressdown", at(9, 21, 7))).toBe(20);
    expect(await getDaysSinceExerciseLastPerformed("never-done", at(9, 21, 7))).toBeUndefined();
  });

  it("doesn't count the sets of a workout still in progress", async () => {
    await session(at(9, 1, 7), "A", async (dayId, id) => {
      await logSet(dayId, id, "machine-chest-press", 1, 100, 12);
    });
    vi.setSystemTime(at(9, 20, 7));
    const day = await startDay();
    const live = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, live.id, "machine-chest-press", 1, 90, 12);
    expect(await getDaysSinceExerciseLastPerformed("machine-chest-press", at(9, 20, 8))).toBe(19);
  });
});

describe("getProgressionSuggestion — re-entry", () => {
  it("eases back in after 14+ days away from the lift", async () => {
    await session(at(9, 1, 7), "A", async (dayId, id) => {
      for (let n = 1; n <= 3; n++) await logSet(dayId, id, "machine-chest-press", n, 100, 12);
    });
    expect(await getProgressionSuggestion("A", "STANDARD", "machine-chest-press", at(9, 14, 7))).toMatchObject({ recommendation: "INCREASE" });
    expect(await getProgressionSuggestion("A", "STANDARD", "machine-chest-press", at(9, 15, 7))).toMatchObject({
      recommendation: "RE_ENTRY",
      suggestedNextWeight: 90,
      daysSinceLastPerformed: 14,
    });
  });

  it("isn't a layoff when the same lift was done recently in another workout", async () => {
    await session(at(9, 1, 7), "A", async (dayId, id) => {
      for (let n = 1; n <= 2; n++) await logSet(dayId, id, "triceps-pressdown", n, 60, 15);
    });
    await session(at(9, 18, 7), "C", async (dayId, id) => {
      for (let n = 1; n <= 3; n++) await logSet(dayId, id, "triceps-pressdown", n, 60, 12);
    });
    // Template A's own history is 20 days old, but the lift itself was done 3 days ago in C.
    expect(await getProgressionSuggestion("A", "STANDARD", "triceps-pressdown", at(9, 21, 7))).toMatchObject({ recommendation: "INCREASE" });
  });
});
