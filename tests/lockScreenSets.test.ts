import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDay } from "../src/application/commands";
import { applyParkedTaps, buildLockScreenPlan, type LockScreenInbox, type ParkedTap, type PlannedSet } from "../src/application/lockScreenSets";
import { restSecondsFor } from "../src/application/restMemory";
import { completeWorkout, logSet, startWorkout } from "../src/application/trainCommands";
import { getPerformedSets } from "../src/application/trainQueries";
import { WORKOUT_TEMPLATES } from "../src/domain/workout/types";
import { db } from "../src/persistence/db";

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001: the plan the lock-screen notification shows, and parked DONE / SKIP taps applied
 * through the one logSet / skipSet command with the tap's time. Run under TZ=UTC and TZ=America/Chicago.
 */
const A = WORKOUT_TEMPLATES.A!.exercises;
const plannedA = (): PlannedSet[] => A.flatMap((ex) => Array.from({ length: ex.sets }, (_, i) => ({
  exerciseId: ex.exerciseId, name: ex.name, setNumber: i + 1, total: ex.sets, weight: 100, reps: ex.repRangeLow,
})));

function inbox(taps: Omit<ParkedTap, "key">[]): LockScreenInbox & { left: () => string[] } {
  const parked = new Map(taps.map((t, i) => [`tap-${i}`, { ...t, key: `tap-${i}` }]));
  return { async list() { return [...parked.values()]; }, async remove(key) { parked.delete(key); }, left: () => [...parked.keys()] };
}

let clock = new Date(2026, 10, 24, 18, 0).getTime();
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); clock = new Date(2026, 10, 24, 18, 0).getTime(); vi.setSystemTime(clock); });
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
const minutes = (n: number) => new Date(clock + n * 60_000).toISOString();

describe("GRAYSON-TRAIN-LOCKSCREEN-001 plan", () => {
  it("the plan for workout A lists every planned working set not yet recorded, in order, with its rest", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const all = buildLockScreenPlan({ session, planned: plannedA(), recorded: [], home: "https://example.test/beyond/", showSkip: true, restFor: () => 120 });
    expect(all.sets.map((s) => `${s.exerciseId}#${s.setNumber}`)).toEqual(plannedA().map((s) => `${s.exerciseId}#${s.setNumber}`));
    expect(all.sets[0]).toMatchObject({ name: A[0]!.name, setNumber: 1, total: A[0]!.sets, weight: 100 });
    expect(Object.keys(all.restSeconds)).toEqual([...new Set(A.map((e) => e.exerciseId))]);
    await logSet(day.id, session.id, A[0]!.exerciseId, 1, 100, 8);
    const after = buildLockScreenPlan({ session, planned: plannedA(), recorded: await getPerformedSets(session.id), home: "h", showSkip: false });
    expect(after.sets[0]).toMatchObject({ exerciseId: A[0]!.exerciseId, setNumber: 2 });
    expect(after.showSkip).toBe(false);
  });
});

describe("GRAYSON-TRAIN-LOCKSCREEN-001 parked taps", () => {
  it("apply in tap order through logSet / skipSet with the tap time and a lock-screen mark, then clear; rest starts at the tap", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    clock += 20 * 60_000; vi.setSystemTime(clock);
    const ex = A[0]!.exerciseId;
    const box = inbox([
      { sessionId: session.id, exerciseId: ex, setNumber: 2, weight: 105, reps: 8, kind: "SKIP", tappedAt: minutes(-5) },
      { sessionId: session.id, exerciseId: ex, setNumber: 1, weight: 100, reps: 8, kind: "DONE", tappedAt: minutes(-10) },
      { sessionId: session.id, exerciseId: ex, setNumber: 3, weight: 105, reps: 7, kind: "DONE", tappedAt: minutes(-2) },
    ]);
    expect(await applyParkedTaps(box)).toEqual({ applied: 3, dropped: 0 });
    expect(box.left()).toEqual([]);
    const sets = (await getPerformedSets(session.id)).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(sets.map((s) => [s.setNumber, s.skipped, s.from, s.recordedAt])).toEqual([
      [1, false, "LOCK_SCREEN", minutes(-10)], [2, true, "LOCK_SCREEN", minutes(-5)], [3, false, "LOCK_SCREEN", minutes(-2)],
    ]);
    const events = await db.events.where("type").anyOf(["SET_LOGGED", "SET_SKIPPED"]).toArray();
    expect(events.map((e) => e.occurredAt).sort()).toEqual([minutes(-10), minutes(-5), minutes(-2)].sort());
    const live = await db.workoutSessions.get(session.id);
    expect(live!.activeRestEndsAt).toBe(new Date(Date.parse(minutes(-2)) + restSecondsFor(ex) * 1000).toISOString());
  });

  it("a tap for a finished or another session is dropped, never logged; a second tap for the same set logs once", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    clock += 10 * 60_000; vi.setSystemTime(clock);
    const ex = A[0]!.exerciseId;
    const twice = inbox([
      { sessionId: session.id, exerciseId: ex, setNumber: 1, weight: 100, reps: 8, kind: "DONE", tappedAt: minutes(-3) },
      { sessionId: session.id, exerciseId: ex, setNumber: 1, weight: 100, reps: 8, kind: "DONE", tappedAt: minutes(-2) },
      { sessionId: "another-workout", exerciseId: ex, setNumber: 2, weight: 100, reps: 8, kind: "DONE", tappedAt: minutes(-1) },
    ]);
    expect(await applyParkedTaps(twice)).toEqual({ applied: 1, dropped: 2 });
    expect(twice.left()).toEqual([]);
    expect((await getPerformedSets(session.id)).length).toBe(1);

    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    const late = inbox([{ sessionId: session.id, exerciseId: ex, setNumber: 2, weight: 100, reps: 8, kind: "DONE", tappedAt: minutes(-1) }]);
    expect(await applyParkedTaps(late)).toEqual({ applied: 0, dropped: 1 });
    expect(late.left()).toEqual([]);
    expect((await getPerformedSets(session.id)).length).toBe(1);
  });

  it("a tap time before the workout or in the future is refused by logSet itself", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, "A", "STANDARD");
    const ex = A[0]!.exerciseId;
    await expect(logSet(day.id, session.id, ex, 1, 100, 8, undefined, { at: minutes(-30), from: "LOCK_SCREEN" })).rejects.toThrow(/SET_TIME_OUTSIDE_WORKOUT/);
    await expect(logSet(day.id, session.id, ex, 1, 100, 8, undefined, { at: minutes(30), from: "LOCK_SCREEN" })).rejects.toThrow(/SET_TIME_OUTSIDE_WORKOUT/);
    // Without `at` nothing changes: now, no mark.
    await logSet(day.id, session.id, ex, 1, 100, 8);
    const [set] = await getPerformedSets(session.id);
    expect(set!.from).toBeUndefined();
    expect(set!.recordedAt).toBe(new Date(clock).toISOString());
  });
});
