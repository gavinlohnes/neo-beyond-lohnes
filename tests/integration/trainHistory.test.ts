import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  skipSet,
  startWorkout,
  undoLastSet,
} from "../../src/application/trainCommands";
import {
  getLiftRecentSessions,
  getTrainingHistory,
  getWorkoutSessionRecord,
  workoutVolumeLbs,
} from "../../src/application/trainHistoryQueries";
import { getPerformedSets } from "../../src/application/trainQueries";

/**
 * ULTIMATE-FOUNDATION-002 (Training Record): the history read models through
 * the real command layer. Reads only — every test also checks nothing new
 * was written by reading.
 */

let clock = new Date(2026, 9, 12, 18).getTime();
/** Each call moves the clock a minute on, so session order never rests on a same-millisecond tie. */
function tick() {
  clock += 60_000;
  vi.setSystemTime(clock);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 9, 12, 18).getTime();
  vi.setSystemTime(clock);
  await db.open();
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

/** A finished earlier session, so the next one has something to beat (the first session never shows a record). */
async function baseline(dayId: string, exerciseId: string, weight: number, reps: number) {
  const s = await startWorkout(dayId, "A", "STANDARD");
  tick();
  await logSet(dayId, s.id, exerciseId, 1, weight, reps);
  tick();
  await completeWorkout(dayId, s.id, "STANDARD", "COMPLETED");
  tick();
  return s;
}

async function readsWriteNothing<T>(read: () => Promise<T>): Promise<T> {
  const before = [await db.events.count(), await db.performedSets.count(), await db.workoutSessions.count()];
  const result = await read();
  expect([await db.events.count(), await db.performedSets.count(), await db.workoutSessions.count()]).toEqual(before);
  return result;
}

describe("workoutVolumeLbs — the one volume rule", () => {
  it("is weight × reps over non-skipped sets; a substitute counts as work performed", () => {
    expect(
      workoutVolumeLbs([
        { weight: 100, reps: 10, skipped: false },
        { weight: 50, reps: 12, skipped: false },
        { weight: 200, reps: 5, skipped: true },
      ]),
    ).toBe(1600);
    expect(workoutVolumeLbs([])).toBe(0);
  });

  it("undone sets drop out because callers pass getPerformedSets' undone-free sets", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 2, 300, 10);
    tick();
    await undoLastSet(day.id, session.id);
    expect(workoutVolumeLbs(await getPerformedSets(session.id))).toBe(1000);
  });
});

describe("getTrainingHistory", () => {
  it("lists strength sessions newest first with real status, sets, duration, volume and records", async () => {
    const day = await startDay();
    const earlier = await baseline(day.id, "machine-chest-press", 90, 10);
    const first = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, first.id, "machine-chest-press", 1, 100, 10);
    tick();
    await skipSet(day.id, first.id, "machine-chest-press", 2);
    tick();
    await logSet(day.id, first.id, "pec-deck", 1, 50, 12, "Cable fly");
    tick();
    await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED", 3);

    tick();
    const second = await startWorkout(day.id, "B", "REDUCED");
    tick();
    await logSet(day.id, second.id, "lat-pulldown", 1, 120, 8);
    tick();
    await abandonWorkout(day.id, second.id, "REDUCED");

    const history = await readsWriteNothing(getTrainingHistory);
    expect(history.map((h) => [h.templateId, h.sessionType, h.status])).toEqual([
      ["B", "REDUCED", "ABANDONED"],
      ["A", "STANDARD", "COMPLETED"],
      ["A", "STANDARD", "COMPLETED"],
    ]);
    expect(history[2]!.id).toBe(earlier.id);
    expect(history[2]!.recordCount).toBe(0);
    const a = history[1]!;
    expect(a.workingSetCount).toBe(2);
    expect(a.skippedSetCount).toBe(1);
    expect(a.volumeLbs).toBe(100 * 10 + 50 * 12);
    expect(a.durationMinutes).toBe(4);
    // 100 lb beats the earlier 90 lb; the substitute is a different lift and earns none.
    expect(a.recordCount).toBe(1);
    // ABANDONED sessions keep their status and never earn records (RECORDS' finished-only rule).
    expect(history[0]!.recordCount).toBe(0);
    expect(history[0]!.volumeLbs).toBe(960);
  });

  it("never lists RECOVERY or the in-progress session", async () => {
    const day = await startDay();
    const recovery = await startWorkout(day.id, "A", "RECOVERY");
    tick();
    await completeRecoverySession(day.id, recovery.id, 20);
    tick();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 100, 10);
    expect(await getTrainingHistory()).toEqual([]);
  });

  it("reports an unknown duration as null rather than measuring to now", async () => {
    const day = await startDay();
    await db.workoutSessions.add({
      id: "no-end",
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId: "A",
      sessionType: "STANDARD",
      status: "COMPLETED",
      startedAt: new Date(clock).toISOString(),
    });
    expect((await getTrainingHistory())[0]!.durationMinutes).toBeNull();
  });
});

describe("getWorkoutSessionRecord", () => {
  it("groups sets by exercise in logged order, labels skipped and substituted sets, and marks records", async () => {
    const day = await startDay();
    await baseline(day.id, "pec-deck", 40, 12);
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, session.id, "pec-deck", 1, 50, 12);
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10, "Dumbbell press");
    tick();
    await skipSet(day.id, session.id, "pec-deck", 2);
    tick();
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");

    const record = await readsWriteNothing(() => getWorkoutSessionRecord(session.id));
    expect(record!.entry.status).toBe("PARTIAL");
    expect(record!.exercises.map((e) => e.name)).toEqual(["Pec Deck", "Machine Chest Press"]);
    const pec = record!.exercises[0]!.sets;
    expect(pec.map((s) => [s.setNumber, s.skipped])).toEqual([[1, false], [2, true]]);
    expect(pec[0]!.record?.kind).toBe("HEAVIEST");
    const press = record!.exercises[1]!.sets[0]!;
    expect(press.substitutedName).toBe("Dumbbell press");
    expect(press.record).toBeUndefined();
  });

  it("keeps each exercise's sets in the order they were logged, not by set number", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 2, 100, 8);
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 1, 90, 10);
    tick();
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");

    const record = await readsWriteNothing(() => getWorkoutSessionRecord(session.id));
    expect(record!.exercises[0]!.sets.map((s) => s.setNumber)).toEqual([2, 1]);
  });

  it("an undone set and the record it carried are gone on the next read", async () => {
    const day = await startDay();
    await baseline(day.id, "machine-chest-press", 90, 10);
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 2, 150, 10);
    tick();
    await undoLastSet(day.id, session.id);
    tick();
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const record = await getWorkoutSessionRecord(session.id);
    expect(record!.exercises[0]!.sets.map((s) => s.weight)).toEqual([100]);
    expect(record!.entry.volumeLbs).toBe(1000);
    expect(record!.entry.recordCount).toBe(1);
  });

  it("is null for RECOVERY, ACTIVE and unknown sessions", async () => {
    const day = await startDay();
    const recovery = await startWorkout(day.id, "A", "RECOVERY");
    tick();
    await completeRecoverySession(day.id, recovery.id, 20);
    tick();
    const active = await startWorkout(day.id, "A", "STANDARD");
    expect(await getWorkoutSessionRecord(recovery.id)).toBeNull();
    expect(await getWorkoutSessionRecord(active.id)).toBeNull();
    expect(await getWorkoutSessionRecord("missing")).toBeNull();
  });
});

describe("getLiftRecentSessions", () => {
  it("returns the last three finished sessions' counted sets, newest first, never the active session", async () => {
    const day = await startDay();
    for (const weight of [100, 105, 110, 115]) {
      tick();
      const s = await startWorkout(day.id, "A", "STANDARD");
      tick();
      await logSet(day.id, s.id, "machine-chest-press", 1, weight, 10);
      tick();
      await logSet(day.id, s.id, "machine-chest-press", 2, weight, 8);
      tick();
      await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED");
    }
    tick();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 200, 10);

    const lift = await readsWriteNothing(() => getLiftRecentSessions("machine-chest-press"));
    expect(lift.map((s) => s.sets)).toEqual([
      [{ weight: 115, reps: 10 }, { weight: 115, reps: 8 }],
      [{ weight: 110, reps: 10 }, { weight: 110, reps: 8 }],
      [{ weight: 105, reps: 10 }, { weight: 105, reps: 8 }],
    ]);
  });

  it("leaves out skipped, zero-rep, substituted, undone and ABANDONED sets, as the strength curve does", async () => {
    const day = await startDay();
    const finished = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, finished.id, "machine-chest-press", 1, 100, 10);
    tick();
    await skipSet(day.id, finished.id, "machine-chest-press", 2);
    tick();
    await logSet(day.id, finished.id, "machine-chest-press", 3, 999, 10, "Dumbbell press");
    tick();
    await logSet(day.id, finished.id, "machine-chest-press", 4, 500, 10);
    tick();
    await undoLastSet(day.id, finished.id);
    await db.performedSets.add({
      id: "zero-reps",
      beyondDayId: day.id,
      sessionId: finished.id,
      exerciseId: "machine-chest-press",
      setNumber: 5,
      weight: 400,
      reps: 0,
      skipped: false,
      recordedAt: new Date(clock).toISOString(),
    });
    tick();
    await completeWorkout(day.id, finished.id, "STANDARD", "COMPLETED");
    tick();
    const stopped = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, stopped.id, "machine-chest-press", 1, 300, 10);
    tick();
    await abandonWorkout(day.id, stopped.id, "STANDARD");

    expect((await getLiftRecentSessions("machine-chest-press")).map((s) => s.sets)).toEqual([[{ weight: 100, reps: 10 }]]);
  });
});
