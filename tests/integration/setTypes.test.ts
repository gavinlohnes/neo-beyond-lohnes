import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDay, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { correctSet, undoSetFix } from "../../src/application/trainFixCommands";
import { getPerformedSets, getProgressionSuggestion } from "../../src/application/trainQueries";
import { getWorkoutSessionRecord, workoutVolumeLbs } from "../../src/application/trainHistoryQueries";
import { getAllRecords, getBestRecords, describeRecordCard } from "../../src/application/personalRecordQueries";
import { getRecordsExport } from "../../src/application/recordsExport";
import { getStrengthReview } from "../../src/application/strengthReviewQueries";
import { getBlockReview, startBlock } from "../../src/application/trainingBlock";
import { estimatedOneRepMax } from "../../src/engine/blockReview";
import { saveRoutineEdit } from "../../src/application/routineEditCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { dropWeight, getDropStepPercent, setDropStepPercent } from "../../src/application/dropStep";
import { searchRecords } from "../../src/application/alfred/alfredSearch";
import { db } from "../../src/persistence/db";
import { findSessionRecords, type RecordCandidateSet } from "../../src/engine/personalRecords";
import { evaluateProgression } from "../../src/engine/progression";
import { buildExerciseHistories, isStalled } from "../../src/engine/stall";
import { applyRoutineEdit } from "../../src/domain/workout/routineEdit";
import { compareSetOrder, countsTowardBest, formatHold, isWorkingSet, WORKOUT_TEMPLATES, type ExercisePrescription, type PerformedSet } from "../../src/domain/workout/types";
import { describeRecordedSet, describeSetValues } from "../../src/ui/screens/train/trainCopy";

/**
 * GRAYSON-SET-TYPES-001: working, warm-up, drop and failure sets, and timed exercises. Every engine output on sets
 * without a kind (today's data) is pinned, then each new kind's effect on bests, the estimated max, progression, the
 * stall and volume, the drop weight, timed sets, and the words history, export and Delta use.
 */
const CHEST = "machine-chest-press";
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const go = (d: Date) => vi.setSystemTime(d);
const CHEST_RX = WORKOUT_TEMPLATES.A!.exercises.find((e) => e.exerciseId === CHEST)!;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  go(at(2, 17));
  localStorage.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

type Logged = [weight: number, reps: number, options?: Parameters<typeof logSet>[7] & { drop?: boolean }];

/** A finished A workout on `day`; drops attach to the set logged just before them. */
async function workout(day: number, sets: Logged[]) {
  go(at(day, 16, 30));
  const d = await startDay(at(day, 16, 30).toISOString());
  await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  go(at(day, 18));
  const s = await startWorkout(d.id, "A", "STANDARD");
  let n = 0;
  for (const [i, [w, r, opts]] of sets.entries()) {
    go(at(day, 18, i + 1));
    const { drop, ...rest } = opts ?? {};
    if (drop) {
      const parent = (await getPerformedSets(s.id)).filter((x) => x.exerciseId === CHEST && x.setKind !== "DROP" && x.setKind !== "WARMUP").sort(compareSetOrder).at(-1)!;
      await logSet(d.id, s.id, CHEST, parent.setNumber, w, r, undefined, { setKind: "DROP", dropOf: parent.id });
    } else if (rest.setKind === "WARMUP") {
      await logSet(d.id, s.id, CHEST, n + 1, w, r, undefined, rest);
    } else {
      n += 1;
      await logSet(d.id, s.id, CHEST, n, w, r, undefined, rest);
    }
  }
  go(at(day, 18, 40));
  await completeWorkout(d.id, s.id, "STANDARD", "COMPLETED");
  go(at(day + 1, 16, 29));
  await endDay(d.id);
  return { day: d, session: s };
}
const chestSets = async (sessionId: string) => (await getPerformedSets(sessionId)).filter((s) => s.exerciseId === CHEST).sort(compareSetOrder);

/** A plain set row for the pure engine. */
let nextId = 0;
const row = (sessionId: string, setNumber: number, weight: number, reps: number, extra: Partial<PerformedSet> = {}): PerformedSet => ({
  id: `set-${nextId++}`, beyondDayId: "d", sessionId, exerciseId: CHEST, setNumber, weight, reps, skipped: false,
  recordedAt: new Date(Date.UTC(2026, 10, 1) + nextId * 60_000).toISOString(), ...extra,
});

describe("GRAYSON-SET-TYPES-001 old data reads exactly as before", () => {
  it("a set with no kind is WORKING everywhere, and pinned engine outputs on today's kind of history don't move", () => {
    expect(isWorkingSet({})).toBe(true);
    expect(countsTowardBest({})).toBe(true);
    expect(countsTowardBest({ setKind: "WARMUP" })).toBe(false);
    expect(countsTowardBest({ setKind: "DROP" })).toBe(false);
    expect(countsTowardBest({ setKind: "FAILURE" })).toBe(true);
    expect(countsTowardBest({ skipped: true })).toBe(false);

    // A fixture shaped like today's events: no setKind on most sets, explicit WORKING and WARMUP on others.
    const s1 = [row("s1", 1, 100, 10), row("s1", 2, 100, 10), row("s1", 3, 100, 9)];
    const s2 = [row("s2", 1, 60, 10, { setKind: "WARMUP" }), row("s2", 1, 105, 12, { setKind: "WORKING" }), row("s2", 2, 105, 12), row("s2", 3, 105, 12)];
    const s3 = [row("s3", 1, 110, 8), row("s3", 2, 110, 8, { setKind: "WORKING" }), row("s3", 3, 0, 0, { skipped: true })];
    // Bests: pinned.
    expect([...findSessionRecords(s1, s2).values()]).toEqual([{ kind: "HEAVIEST", weight: 105, reps: 12 }]);
    expect([...findSessionRecords([...s1, ...s2], s3).values()]).toEqual([{ kind: "HEAVIEST", weight: 110, reps: 8 }]);
    // Progression: pinned.
    expect(evaluateProgression(CHEST_RX, s2)).toMatchObject({ recommendation: "INCREASE", lastWeight: 105, suggestedNextWeight: 105 + CHEST_RX.incrementLbs });
    expect(evaluateProgression(CHEST_RX, s1)).toMatchObject({ recommendation: "HOLD", lastWeight: 100 });
    expect(evaluateProgression(CHEST_RX, s3).recommendation).toBe("HOLD");
    // Volume: warm-ups out, as before.
    expect(workoutVolumeLbs(s2)).toBe(105 * 12 * 3);
    // Stall histories: pinned.
    const sessions = ["s1", "s2", "s3"].map((id, i) => ({ sessionId: id, startedAt: new Date(Date.UTC(2026, 10, 1 + i)).toISOString() }));
    expect(buildExerciseHistories(sessions, [...s1, ...s2, ...s3]).get(CHEST)!.map((h) => [h.topWeight, h.record])).toEqual([[100, false], [105, true], [110, true]]);
  });
});

describe("GRAYSON-SET-TYPES-001 what each kind does to his numbers", () => {
  it("a drop set counts in volume and sets, never a best, the estimated max, progression or a stall", () => {
    const before = [row("a", 1, 100, 12), row("a", 2, 100, 12), row("a", 3, 100, 12)];
    // A drop at 80 × 20: more reps at a lighter weight would be a "most reps" best if it counted.
    const parent = row("b", 1, 100, 10);
    const drop = row("b", 1, 80, 20, { setKind: "DROP", dropOf: parent.id });
    const session = [parent, drop, row("b", 2, 100, 10), row("b", 3, 100, 10)];
    expect(findSessionRecords(before, session).has(drop.id)).toBe(false);
    expect(findSessionRecords([], [...before, ...session]).size).toBe(0);
    // Volume counts it.
    expect(workoutVolumeLbs(session)).toBe(100 * 10 * 3 + 80 * 20);
    // Progression ignores it: three clean sets at 100, below the top → HOLD at 100, not "mixed weights".
    expect(evaluateProgression(CHEST_RX, session)).toMatchObject({ recommendation: "HOLD", lastWeight: 100 });
    // Stall: the drop is not the top set and never the record.
    const h = buildExerciseHistories([{ sessionId: "a", startedAt: "2026-11-01T00:00:00Z" }, { sessionId: "b", startedAt: "2026-11-02T00:00:00Z" }], [...before, ...session]).get(CHEST)!;
    expect(h.map((x) => [x.topWeight, x.record])).toEqual([[100, false], [100, false]]);
  });

  it("a failure set counts everywhere a working set does; a warm-up nowhere", () => {
    const before = [row("a", 1, 100, 10)];
    const fail = row("b", 1, 100, 13, { setKind: "FAILURE", repsInReserve: 0 });
    expect(findSessionRecords(before, [fail]).get(fail.id)).toEqual({ kind: "REPS", weight: 100, reps: 13 });
    const three = [row("c", 1, 100, 12, { setKind: "FAILURE" }), row("c", 2, 100, 12), row("c", 3, 100, 12, { setKind: "FAILURE" })];
    expect(evaluateProgression(CHEST_RX, three).recommendation).toBe("INCREASE");
    expect(workoutVolumeLbs(three)).toBe(3 * 1200);
    const warm = row("d", 1, 200, 10, { setKind: "WARMUP" });
    expect(findSessionRecords(before, [warm]).size).toBe(0);
    expect(workoutVolumeLbs([warm])).toBe(0);
  });

  it("in the app: a drop changes no best, next weight or block estimated max, and counts in strength-review sets", async () => {
    await workout(2, [[100, 10], [100, 10], [100, 10]]);
    await workout(9, [[100, 12], [100, 12], [100, 12], [80, 20, { drop: true }]]);
    expect((await getAllRecords()).map((r) => describeRecordCard(r.record))).toEqual(["Most reps at 100 lb: 12"]);
    expect((await getBestRecords()).find((r) => r.exerciseId === CHEST)!.record).toMatchObject({ weight: 100, reps: 12 });
    // All three working sets at the top of the range: INCREASE, as if the drop weren't there.
    expect(await getProgressionSuggestion("A", "STANDARD", CHEST, at(10, 12))).toMatchObject({ recommendation: "INCREASE", lastWeight: 100 });
    const review = await getStrengthReview(at(10, 12));
    expect(review.records.filter((r) => r.exerciseId === CHEST && r.weight === 80)).toHaveLength(1);
  });

});

describe("GRAYSON-SET-TYPES-001 the block's estimated max", () => {
  it("reads working and failure sets; a drop of 95 × 10 never raises it", async () => {
    go(at(1, 12));
    await startBlock({ weeks: 4, focus: ["Chest"] }, at(1, 12));
    // The block starts Monday, Nov 2.
    await workout(2, [[100, 5], [95, 10, { drop: true }]]);
    await workout(23, [[105, 5, { setKind: "FAILURE" }]]);
    const review = (await getBlockReview(at(29, 20)))!;
    const lifts = review.lines.find((l) => l.kind === "LIFTS")!.text;
    // Epley-style e1RM of 100 × 5 and 105 × 5; 95 × 10 would read higher.
    expect(lifts).toContain(`Machine Chest Press ${estimatedOneRepMax(100, 5)} → ${estimatedOneRepMax(105, 5)} lb`);
    expect(estimatedOneRepMax(95, 10)!).toBeGreaterThan(estimatedOneRepMax(100, 5)!);
  });
});

describe("GRAYSON-SET-TYPES-001 logging and fixing kinds", () => {
  it("a failure set is logged with 0 reps left; a drop needs its parent and shares its number", async () => {
    go(at(2, 16, 30));
    const d = await startDay(at(2, 16, 30).toISOString());
    await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    go(at(2, 18));
    const s = await startWorkout(d.id, "A", "STANDARD");
    await logSet(d.id, s.id, CHEST, 1, 100, 8, undefined, { setKind: "FAILURE", repsInReserve: 3 });
    const [fail] = await chestSets(s.id);
    expect(fail).toMatchObject({ setKind: "FAILURE", repsInReserve: 0 });
    await expect(logSet(d.id, s.id, CHEST, 1, 80, 8, undefined, { setKind: "DROP" })).rejects.toThrow(/SET_DROP_INVALID/);
    await expect(logSet(d.id, s.id, CHEST, 1, 80, 8, undefined, { setKind: "DROP", dropOf: "nope" })).rejects.toThrow(/SET_DROP_INVALID/);
    await logSet(d.id, s.id, CHEST, 1, 80, 8, undefined, { setKind: "DROP", dropOf: fail!.id });
    // The drop doesn't take set 2's slot.
    await logSet(d.id, s.id, CHEST, 2, 100, 8);
    expect((await chestSets(s.id)).map((x) => [x.setNumber, x.setKind ?? "WORKING"])).toEqual([[1, "FAILURE"], [1, "DROP"], [2, "WORKING"]]);
    const event = (await db.events.toArray()).find((e) => e.type === "SET_LOGGED" && (e.payload as { setKind?: string }).setKind === "DROP")!;
    expect(event.payload).toMatchObject({ setKind: "DROP", dropOf: fail!.id });
  });

  it("ADD DROP's weight: 20% lighter by default, rounded down to his plate step; the step is his (5–50%)", () => {
    expect(getDropStepPercent()).toBe(20);
    expect(dropWeight(100, 5)).toBe(80);
    expect(dropWeight(135, 5)).toBe(105); // 108 → 105
    expect(dropWeight(47.5, 2.5)).toBe(37.5); // 38 → 37.5
    expect(dropWeight(10, 5)).toBe(5);
    setDropStepPercent(50);
    expect(getDropStepPercent()).toBe(50);
    expect(dropWeight(100, 5)).toBe(50);
    expect(() => setDropStepPercent(90)).toThrow(/DROP_STEP_INVALID/);
    expect(() => setDropStepPercent(4)).toThrow(/DROP_STEP_INVALID/);
    expect(getDropStepPercent()).toBe(50);
  });

  it("changing a set's kind after logging is a fix with UNDO, and the numbers follow", async () => {
    await workout(2, [[100, 10], [100, 10], [100, 10]]);
    const { session } = await workout(9, [[100, 12], [100, 12], [100, 12], [100, 15]]);
    // The fourth set (100 × 15) is a best until he marks it a drop of set 3.
    const sets = await chestSets(session.id);
    expect((await getBestRecords()).find((r) => r.exerciseId === CHEST)!.record.reps).toBe(15);
    const fourth = sets.find((s) => s.reps === 15)!;
    const fix = await correctSet(fourth.id, { weight: 100, reps: 15, setKind: "DROP" });
    const dropped = (await chestSets(session.id)).find((s) => s.setKind === "DROP")!;
    expect(dropped.dropOf).toBe(sets.find((s) => s.setNumber === 3)!.id);
    expect((await getBestRecords()).find((r) => r.exerciseId === CHEST)!.record.reps).toBe(12);
    expect((await getWorkoutSessionRecord(session.id))!.exercises[0]!.sets.at(-1)!.fixes![0]).toMatchObject({ before: { reps: 15 }, after: { setKind: "DROP" } });
    await undoSetFix(fix.fixEventId);
    expect((await chestSets(session.id)).some((s) => s.setKind === "DROP")).toBe(false);
    expect((await getBestRecords()).find((r) => r.exerciseId === CHEST)!.record.reps).toBe(15);
    // To failure: reps left becomes 0.
    await correctSet(fourth.id, { weight: 100, reps: 15, setKind: "FAILURE", repsInReserve: 4 });
    expect((await chestSets(session.id)).find((s) => s.reps === 15)).toMatchObject({ setKind: "FAILURE", repsInReserve: 0 });
  });
});

describe("GRAYSON-SET-TYPES-001 timed exercises", () => {
  const PLANK: ExercisePrescription = { exerciseId: "lib-plank", name: "Plank", sets: 3, repRangeLow: 1, repRangeHigh: 3, incrementLbs: 5, measure: "TIME", targetSec: 30 };
  const held = (sessionId: string, n: number, sec: number, extra: Partial<PerformedSet> = {}) => row(sessionId, n, 0, 0, { exerciseId: "lib-plank", durationSec: sec, ...extra });

  it("longest time held is the best, per weight; drops and warm-ups never count", () => {
    const first = [held("a", 1, 30), held("a", 2, 30)];
    const second = [held("b", 1, 45), held("b", 2, 40), held("b", 3, 60, { setKind: "DROP", dropOf: "x" })];
    const found = findSessionRecords(first, second);
    expect([...found.values()]).toEqual([{ kind: "TIME", weight: 0, reps: 0, durationSec: 45 }]);
    // Heavier weight with a shorter hold is still a best at that weight; lighter needs a longer hold.
    const weighted = [held("c", 1, 20, { weight: 25 })];
    expect(findSessionRecords([...first, ...second], weighted).get(weighted[0]!.id)).toMatchObject({ kind: "TIME", weight: 25, durationSec: 20 });
    // The first session with a timed exercise sets nothing, like reps.
    expect(findSessionRecords([], first).size).toBe(0);
    // A timed set never feeds the reps rules.
    expect(findSessionRecords([row("z", 1, 0, 5, { exerciseId: "lib-plank" })], first).size).toBe(0);
  });

  it("progression: +5 s once every working set holds the target; otherwise hold the target", () => {
    expect(evaluateProgression(PLANK, [held("a", 1, 30), held("a", 2, 32), held("a", 3, 31)])).toMatchObject({ recommendation: "INCREASE", lastTargetSec: 30, suggestedTargetSec: 35 });
    expect(evaluateProgression(PLANK, [held("a", 1, 30), held("a", 2, 25), held("a", 3, 31)])).toMatchObject({ recommendation: "HOLD", lastTargetSec: 30 });
    expect(evaluateProgression(PLANK, [held("a", 1, 30), held("a", 2, 30)]).recommendation).toBe("HOLD");
    expect(evaluateProgression(PLANK, [held("a", 1, 30), held("a", 2, 30), held("a", 3, 10, { setKind: "WARMUP" }), held("a", 3, 30)]).recommendation).toBe("INCREASE");
    expect(evaluateProgression(PLANK, []).recommendation).toBe("NO_HISTORY");
    expect(evaluateProgression({ ...PLANK, targetSec: undefined }, [held("a", 1, 30), held("a", 2, 30), held("a", 3, 30)])).toMatchObject({ suggestedTargetSec: 35 });
  });

  it("a timed set logs seconds with 0 reps; out-of-range times are refused; the fix path keeps the time", async () => {
    go(at(2, 16, 30));
    const d = await startDay(at(2, 16, 30).toISOString());
    await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    go(at(2, 18));
    const s = await startWorkout(d.id, "A", "STANDARD");
    await expect(logSet(d.id, s.id, "lib-plank", 1, 0, 0)).rejects.toThrow(/SET_REPS_REQUIRED/);
    await expect(logSet(d.id, s.id, "lib-plank", 1, 0, 0, undefined, { durationSec: 0 })).rejects.toThrow(/SET_TIME_INVALID/);
    await expect(logSet(d.id, s.id, "lib-plank", 1, 0, 0, undefined, { durationSec: 3601 })).rejects.toThrow(/SET_TIME_INVALID/);
    await logSet(d.id, s.id, "lib-plank", 1, 0, 0, undefined, { durationSec: 45 });
    const [set] = (await getPerformedSets(s.id)).filter((x) => x.exerciseId === "lib-plank");
    expect(set).toMatchObject({ reps: 0, durationSec: 45 });
    const fix = await correctSet(set!.id, { weight: 0, reps: 0, durationSec: 50 });
    expect((await getPerformedSets(s.id)).find((x) => x.exerciseId === "lib-plank")).toMatchObject({ durationSec: 50 });
    await undoSetFix(fix.fixEventId);
    expect((await getPerformedSets(s.id)).find((x) => x.exerciseId === "lib-plank")).toMatchObject({ durationSec: 45 });
    await expect(correctSet(set!.id, { weight: 0, reps: 0, durationSec: 0 })).rejects.toThrow(/SET_TIME_INVALID/);
  });

  it("a routine exercise can be made timed and back; the target is his, 5 s steps, 0:05–10:00", async () => {
    const base = WORKOUT_TEMPLATES.A!.exercises;
    const timed = applyRoutineEdit(base, { kind: "SET", index: 0, change: { measure: "TIME" } });
    expect(timed[0]).toMatchObject({ measure: "TIME", targetSec: 30 });
    const longer = applyRoutineEdit(timed, { kind: "SET", index: 0, change: { targetSec: 45 } });
    expect(longer[0]!.targetSec).toBe(45);
    const back = applyRoutineEdit(longer, { kind: "SET", index: 0, change: { measure: "REPS" } });
    expect(back[0]).toEqual(base[0]);
    await saveRoutineEdit("A", { exercises: longer });
    expect((await resolveTemplateExercises("A", "STANDARD"))[0]).toMatchObject({ measure: "TIME", targetSec: 45 });
    await expect(saveRoutineEdit("A", { exercises: applyRoutineEdit(timed, { kind: "SET", index: 0, change: { targetSec: 601 } }) })).rejects.toThrow(/target time/);
    // Adding the library's Plank brings it in timed.
    const added = applyRoutineEdit(base, { kind: "ADD", exercise: { exerciseId: "lib-plank", name: "Plank", repRangeLow: 1, repRangeHigh: 3, incrementLbs: 5, measure: "TIME", targetSec: 30 } });
    expect(added.at(-1)).toMatchObject({ measure: "TIME", targetSec: 30 });
  });
});

describe("GRAYSON-SET-TYPES-001 the kind in words", () => {
  it("history, export and Delta say drop, to failure and the hold", async () => {
    const { session } = await workout(2, [[60, 10, { setKind: "WARMUP" }], [100, 8, { setKind: "FAILURE" }], [80, 8, { drop: true }], [100, 8]]);
    const record = (await getWorkoutSessionRecord(session.id))!;
    const sets = record.exercises[0]!.sets;
    expect(sets.map((s) => describeSetValues(s))).toEqual(["warm-up 60 lb × 10", "to failure: 100 lb × 8", "drop 80 lb × 8", "100 lb × 8"]);
    expect(describeRecordedSet({ id: "t", setNumber: 1, weight: 0, reps: 0, skipped: false, durationSec: 45 })).toBe("Set 1 · held 0:45");
    expect(describeRecordedSet({ id: "t", setNumber: 2, weight: 20, reps: 0, skipped: false, durationSec: 90 })).toBe("Set 2 · 20 lb · held 1:30");
    expect(formatHold(605)).toBe("10:05");

    const csv = await getRecordsExport("workouts");
    expect(csv.header.slice(-2)).toEqual(["skipped", "held"]);
    const kinds = csv.rows.filter((r) => r[4] !== undefined).map((r) => r[7]);
    expect(kinds).toEqual(expect.arrayContaining(["warm-up", "to failure", "drop", "working"]));

    // Delta reads each set with its kind in words.
    const found = await searchRecords("to failure");
    expect(found.split("\n").filter((l) => l.includes(" · SET · ")).length).toBe(1);
    expect(found).toMatch(/"kind":"to failure"/);
    expect((await searchRecords("drop")).split("\n").some((l) => l.includes(" · SET · ") && l.includes('"kind":"drop"'))).toBe(true);
  });
});

// Keep the type import used: RecordCandidateSet accepts a timed set.
const _timed: RecordCandidateSet = { id: "x", exerciseId: "e", weight: 0, reps: 0, skipped: false, recordedAt: "", durationSec: 30 };
void _timed;
