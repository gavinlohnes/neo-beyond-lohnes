import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyAnyRestore } from "../../src/persistence/restore";
import { evaluateProgression } from "../../src/engine/progression";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { startWorkout, logSet, completeWorkout, undoLastSet } from "../../src/application/trainCommands";
import { getPerformedSets, getLastPerformedSetForExercise, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getTrainingHistory, getWorkoutRecap, workoutVolumeLbs, getLiftRecentSessions } from "../../src/application/trainHistoryQueries";
import { getAllRecords } from "../../src/application/personalRecordQueries";

beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); vi.useRealTimers(); });
const lift = "machine-chest-press";
it("warm-ups share the next working ordinal without inflating history, suggestions or rotation", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, s.id, lift, 1, 300, 20, undefined, { setKind: "WARMUP" });
  await logSet(day.id, s.id, lift, 1, 200, 10, undefined, { setKind: "WARMUP" });
  expect(await getLastPerformedSetForExercise("A", "STANDARD", lift)).toBeUndefined();
  expect(workoutVolumeLbs(await getPerformedSets(s.id))).toBe(0);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED");
  expect(await suggestTemplateForNextWorkout()).toBe("A");
  expect((await getTrainingHistory())[0]).toMatchObject({ workingSetCount: 0, volumeLbs: 0, recordCount: 0 });
  expect(await getAllRecords()).toEqual([]);
});
it("records zero effort distinctly from unknown; duplicate working taps cannot create two rows", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  const results = await Promise.allSettled([
    logSet(day.id, s.id, lift, 1, 100, 8, undefined, { repsInReserve: 0 }),
    logSet(day.id, s.id, lift, 1, 100, 8, undefined, { repsInReserve: 0 }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await logSet(day.id, s.id, lift, 2, 100, 7);
  const sets = await getPerformedSets(s.id);
  expect(sets).toHaveLength(2);
  expect(sets.find((r) => r.setNumber === 1)?.repsInReserve).toBe(0);
  expect(sets.find((r) => r.setNumber === 2)?.repsInReserve).toBeUndefined();
  const event = (await db.events.where("type").equals("SET_LOGGED").toArray()).find((e) => (e.payload as {setNumber: number}).setNumber === 1)!;
  expect(event.payload).toMatchObject({ repsInReserve: 0, performedSetId: sets.find((s) => s.setNumber === 1)!.id });
});
it("undo uses event order for multiple same-time warm-ups and working sets", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-14T10:00:00Z"));
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, s.id, lift, 1, 45, 10, undefined, { setKind: "WARMUP" });
  await logSet(day.id, s.id, lift, 1, 95, 8);
  await logSet(day.id, s.id, lift, 2, 45, 5, undefined, { setKind: "WARMUP" });
  await undoLastSet(day.id, s.id);
  expect((await getPerformedSets(s.id)).map((r) => r.weight).sort((a, b) => a - b)).toEqual([45, 95]);
  await undoLastSet(day.id, s.id);
  expect(workoutVolumeLbs(await getPerformedSets(s.id))).toBe(0);
  await logSet(day.id, s.id, lift, 1, 95, 8);
  expect(workoutVolumeLbs(await getPerformedSets(s.id))).toBe(760);
});
it.each([-1, 11, 1.5, NaN])("invalid effort %s writes neither row nor event", async (effort) => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  const events = await db.events.count();
  await expect(logSet(day.id, s.id, lift, 1, 100, 8, undefined, { repsInReserve: effort })).rejects.toThrow("SET_EFFORT_INVALID");
  expect(await getPerformedSets(s.id)).toEqual([]); expect(await db.events.count()).toBe(events);
});
it("recap matches actual lifts, excludes warm-ups and substitutions, and keeps partial context", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-14T10:00:00Z"));
  const day = await startDay(); const a = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, a.id, lift, 1, 100, 8); await logSet(day.id, a.id, "lat-pulldown", 1, 80, 10);
  await completeWorkout(day.id, a.id, "STANDARD", "PARTIAL");
  expect(await getWorkoutRecap(a.id)).toMatchObject({ previousStartedAt: null });
  vi.setSystemTime(new Date("2026-11-14T11:00:00Z"));
  const b = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, b.id, lift, 1, 900, 20, undefined, { setKind: "WARMUP" });
  await logSet(day.id, b.id, lift, 1, 105, 8, undefined, { repsInReserve: 0 });
  await logSet(day.id, b.id, "lat-pulldown", 1, 90, 10, "Cable row");
  await completeWorkout(day.id, b.id, "STANDARD", "COMPLETED");
  expect(await getWorkoutRecap(b.id)).toMatchObject({ warmups: 1, effortRecorded: 1, matchedLifts: 1, changedLifts: 2, currentVolume: 840, previousVolume: 800, previousStatus: "PARTIAL" });
  expect((await getLiftRecentSessions(lift))[0]?.sets).toHaveLength(1);
});

it("native backup round-trip preserves warm-up, zero effort, event sequence and undo", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, s.id, lift, 1, 45, 10, undefined, { setKind: "WARMUP" });
  await logSet(day.id, s.id, lift, 1, 100, 8, undefined, { setKind: "WORKING", repsInReserve: 0 });
  const before = await getPerformedSets(s.id);
  const blob = await db.export({ prettyJson: true });
  await undoLastSet(day.id, s.id);
  await applyAnyRestore(new File([blob], "gym.json", { type: "application/json" }));
  expect(await getPerformedSets(s.id)).toEqual(before);
  await undoLastSet(day.id, s.id);
  expect((await getPerformedSets(s.id)).map((r) => r.setKind)).toEqual(["WARMUP"]);
});
it("effort never changes the progression result and warm-ups never fill prescribed evidence", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, s.id, lift, 1, 100, 12);
  await logSet(day.id, s.id, lift, 2, 100, 12);
  await logSet(day.id, s.id, lift, 3, 100, 12);
  const sets = await getPerformedSets(s.id);
  const prescription = { exerciseId: lift, name: "Chest", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 };
  expect(evaluateProgression(prescription, sets.map((r) => ({ ...r, repsInReserve: 0 })))).toEqual(evaluateProgression(prescription, sets.map((r) => ({ ...r, repsInReserve: 10 }))));
  expect(evaluateProgression(prescription, sets.map((r, i) => ({ ...r, ...(i === 2 ? { setKind: "WARMUP" as const } : {}) }))).recommendation).toBe("HOLD");
});

it("an undone working set plus warm-ups cannot advance rotation", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "REDUCED");
  await logSet(day.id, s.id, lift, 1, 45, 10, undefined, { setKind: "WARMUP" });
  await logSet(day.id, s.id, lift, 1, 100, 8);
  await undoLastSet(day.id, s.id);
  await completeWorkout(day.id, s.id, "REDUCED", "PARTIAL");
  expect(await suggestTemplateForNextWorkout()).toBe("A");
});

it("overlapping undo actions select different effective rows inside their transactions", async () => {
  const day = await startDay(); const s = await startWorkout(day.id, "A", "STANDARD");
  for (let n = 1; n <= 3; n++) await logSet(day.id, s.id, lift, n, 100, 8);
  expect(await Promise.all([undoLastSet(day.id, s.id), undoLastSet(day.id, s.id)])).toEqual([true, true]);
  expect((await getPerformedSets(s.id)).map((r) => r.setNumber)).toEqual([1]);
  const undone = await db.events.where("type").equals("SET_UNDONE").toArray();
  expect(new Set(undone.map((e) => (e.payload as { performedSetId: string }).performedSetId)).size).toBe(2);
  await Promise.all([undoLastSet(day.id, s.id), logSet(day.id, s.id, lift, 2, 110, 8)]);
  expect((await getPerformedSets(s.id)).map((r) => [r.setNumber, r.weight])).toEqual([[2, 110]]);
});
