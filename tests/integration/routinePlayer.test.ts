import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { completePlayedRoutineStep, getRoutinePlayback, routineEstimate } from "../../src/application/routinePlayer";
import { createRoutine, getRoutineTicks, getRoutines, matchSteps, modifyRoutine, setRoutineArchived, setRoutineStep, stepKey } from "../../src/application/routineCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { applyAnyRestore } from "../../src/persistence/restore";

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 4, 17)); await db.open(); });
afterEach(() => { db.close(); vi.useRealTimers(); });

it("PLAY reads old text-only routines without creating a day or events; estimates name untimed work", async () => {
  const routine = await createRoutine({ title: "Synthetic routine", moment: "BEFORE_SHIFT", steps: ["Synthetic step"] });
  const before = await db.events.toArray();
  const state = await getRoutinePlayback(routine.id);
  expect(state.dayId).toBeNull(); expect(state.scheduledShiftStart).toBeNull();
  expect(state.routine.steps[0]!.minutes).toBeUndefined();
  expect(routineEstimate(state.routine.steps)).toBeNull();
  expect(routineEstimate([{ minutes: 2 }, {}])).toBe("About 2 min + untimed steps");
  expect(routineEstimate([{ minutes: 2 }, { minutes: 3 }])).toBe("About 5 min");
  expect(await db.beyondDays.count()).toBe(0); expect(await db.events.toArray()).toEqual(before);
});

it("bounds explicit estimates and preserves step identity/ticks when estimates change or clear", async () => {
  for (const minutes of [0, -1, 1.5, 241, Number.NaN]) {
    await expect(createRoutine({ title: "Synthetic invalid", moment: "DAY_OFF", steps: [{ text: "Synthetic step", minutes }] })).rejects.toThrow();
  }
  expect(await db.routines.count()).toBe(0);
  const day = await startDay();
  const r = await createRoutine({ title: "Synthetic estimated", moment: "DAY_OFF", steps: [{ text: "Synthetic first", minutes: 2 }, "Synthetic second"] });
  await setRoutineStep(day.id, r.id, r.steps[0]!.id, true);
  const moved = await modifyRoutine(r.id, { steps: matchSteps(r, ["Synthetic second", "Synthetic first"]) });
  expect(moved.steps[1]).toMatchObject({ id: r.steps[0]!.id, minutes: 2 });
  const cleared = await modifyRoutine(r.id, { steps: moved.steps.map(({ id, text }) => ({ id, text })) });
  expect(cleared.steps[1]!.minutes).toBeUndefined();
  expect((await getRoutineTicks(day.id)).has(stepKey(r.id, r.steps[0]!.id))).toBe(true);
});

it("records DONE via the canonical tick exactly once under duplicate calls", async () => {
  const day = await startDay(); const r = await createRoutine({ title: "Synthetic done", moment: "DAY_OFF", steps: ["Synthetic first"] });
  const snapshot = await getRoutinePlayback(r.id);
  expect((await Promise.all([completePlayedRoutineStep(snapshot, r.steps[0]!.id), completePlayedRoutineStep(snapshot, r.steps[0]!.id)])).sort()).toEqual([false, true]);
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(1);
  expect((await getRoutineTicks(day.id)).has(stepKey(r.id, r.steps[0]!.id))).toBe(true);
});

it("rejects modified and archived routines even when the edit timestamp is unchanged", async () => {
  await startDay(); const r = await createRoutine({ title: "Synthetic stale", moment: "DAY_OFF", steps: ["Synthetic step"] });
  const snapshot = await getRoutinePlayback(r.id);
  const changed = await modifyRoutine(r.id, { steps: [{ ...r.steps[0]!, minutes: 3 }] });
  expect(changed.updatedAt).toBe(r.updatedAt);
  await expect(completePlayedRoutineStep(snapshot, r.steps[0]!.id)).rejects.toThrow(/routine changed/i);
  const fresh = await getRoutinePlayback(r.id); await setRoutineArchived(r.id, true);
  await expect(completePlayedRoutineStep(fresh, r.steps[0]!.id)).rejects.toThrow(/routine changed/i);
  await expect(getRoutinePlayback(r.id)).rejects.toThrow(/no longer in use/);
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
});

it("rejects a replaced day and the next 16:30 boundary without ticking a historical day", async () => {
  const day = await startDay(); const r = await createRoutine({ title: "Synthetic day guard", moment: "DAY_OFF", steps: ["Synthetic step"] });
  const snapshot = await getRoutinePlayback(r.id);
  await endDay(day.id); await startDay();
  await expect(completePlayedRoutineStep(snapshot, r.steps[0]!.id)).rejects.toThrow(/lived day changed/i);
  const next = await getRoutinePlayback(r.id);
  vi.setSystemTime(new Date(2026, 10, 5, 16, 31));
  await expect(completePlayedRoutineStep(next, r.steps[0]!.id)).rejects.toThrow(/lived day changed/i);
  expect((await getRoutinePlayback(r.id)).dayBlocked).toBe(true);
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
});

it("uses a saved scheduled shift only before work, respecting a manually declared day off", async () => {
  const r = await createRoutine({ title: "Synthetic before shift", moment: "BEFORE_SHIFT", steps: [{ text: "Synthetic step", minutes: 10 }] });
  await updateSchedulePattern({ ...DEFAULT_SCHEDULE_PATTERN, anchorMonday: "2026-11-02", weeks: [{ workdays: [3] }, { workdays: [3] }] });
  const day = await startDay();
  const value = (await getRoutinePlayback(r.id)).scheduledShiftStart;
  expect(value).toBe(new Date(2026, 10, 4, 18).toISOString());
  await setWorkContext(day.id, "OFF", "MANUAL");
  expect((await getRoutinePlayback(r.id)).scheduledShiftStart).toBeNull();
});

it("round-trips estimates and ticks, and restores an old untimed native backup", async () => {
  const day = await startDay();
  const old = await createRoutine({ title: "Synthetic old routine", moment: "DAY_OFF", steps: ["Synthetic old step"] });
  const oldFile = new File([await db.export({ prettyJson: true })], "old-untimed.json", { type: "application/json" });
  const estimated = await createRoutine({ title: "Synthetic timed routine", moment: "DAY_OFF", steps: [{ text: "Synthetic timed step", minutes: 4 }] });
  await setRoutineStep(day.id, estimated.id, estimated.steps[0]!.id, true);
  const version = db.verno;
  const currentFile = new File([await db.export({ prettyJson: true })], "estimated.json", { type: "application/json" });
  await applyAnyRestore(currentFile);
  expect((await getRoutines()).find((r) => r.id === estimated.id)!.steps[0]!.minutes).toBe(4);
  expect((await getRoutineTicks(day.id)).has(stepKey(estimated.id, estimated.steps[0]!.id))).toBe(true);
  await applyAnyRestore(oldFile);
  expect(await getRoutines()).toHaveLength(1);
  expect((await getRoutines())[0]!.id).toBe(old.id);
  expect((await getRoutines())[0]!.steps[0]!.minutes).toBeUndefined();
  expect(db.verno).toBe(version);
});
