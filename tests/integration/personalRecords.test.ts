import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, skipSet, startWorkout, undoLastSet } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import {
  describePersonalRecord,
  findSessionRecords,
  getRecordHistory,
  type RecordCandidateSet,
} from "../../src/application/personalRecordQueries";

/**
 * Drop 4 (live PR alerts): records are derived from logged sets only. The
 * pure rule is covered directly; the history query runs against real Dexie
 * (fake-indexeddb), same conventions as the other integration suites.
 */

let seq = 0;
function set(exerciseId: string, weight: number, reps: number, extra: Partial<RecordCandidateSet> = {}): RecordCandidateSet {
  seq += 1;
  return {
    id: `s${seq}`,
    exerciseId,
    weight,
    reps,
    skipped: false,
    recordedAt: `2026-09-30T10:${String(seq).padStart(2, "0")}:00.000Z`,
    ...extra,
  };
}

describe("findSessionRecords (pure)", () => {
  it("the first time an exercise is ever logged is not a record", () => {
    const first = set("bench", 135, 10);
    expect(findSessionRecords([], [first]).size).toBe(0);
  });

  it("the first session with an exercise shows no records, even for a heavier later set", () => {
    const warmup = set("bench", 95, 10);
    const work = set("bench", 135, 8);
    expect(findSessionRecords([], [warmup, work]).size).toBe(0);
  });

  it("a heavier weight than any earlier set is a HEAVIEST record", () => {
    const now = set("bench", 145, 5);
    const records = findSessionRecords([set("bench", 135, 10)], [now]);
    expect(records.get(now.id)).toEqual({ kind: "HEAVIEST", weight: 145, reps: 5 });
  });

  it("more reps than ever at the same or a heavier weight is a REPS record", () => {
    const now = set("bench", 135, 11);
    const records = findSessionRecords([set("bench", 135, 10), set("bench", 145, 5)], [now]);
    expect(records.get(now.id)).toEqual({ kind: "REPS", weight: 135, reps: 11 });
  });

  it("matching or trailing earlier history is not a record", () => {
    const tie = set("bench", 135, 10);
    const lighter = set("bench", 125, 10);
    const history = [set("bench", 135, 10), set("bench", 145, 12)];
    expect(findSessionRecords(history, [tie, lighter]).size).toBe(0);
  });

  it("earlier sets of the same session raise the bar for later ones", () => {
    const first = set("bench", 145, 5);
    const second = set("bench", 145, 5);
    // Passed out of order on purpose: records follow logged time, not array order.
    const records = findSessionRecords([set("bench", 135, 10)], [second, first]);
    expect(records.has(first.id)).toBe(true);
    expect(records.has(second.id)).toBe(false);
  });

  it("ignores skipped, zero-rep, and substituted sets on both sides", () => {
    const history = [set("bench", 300, 1, { substitutedName: "Smith press" }), set("bench", 135, 10)];
    const skipped = set("bench", 200, 0, { skipped: true });
    const zero = set("bench", 200, 0);
    const substituted = set("bench", 200, 5, { substitutedName: "Dumbbell press" });
    const real = set("bench", 150, 5);
    const records = findSessionRecords(history, [skipped, zero, substituted, real]);
    expect([...records.keys()]).toEqual([real.id]);
  });

  it("records are per exercise", () => {
    const row = set("row", 200, 5);
    expect(findSessionRecords([set("bench", 135, 10)], [row]).size).toBe(0);
  });

  it("describes each kind in plain words", () => {
    expect(describePersonalRecord({ kind: "HEAVIEST", weight: 185, reps: 5 })).toBe("NEW PR — heaviest yet (185 lb)");
    expect(describePersonalRecord({ kind: "REPS", weight: 185, reps: 8 })).toBe("NEW PR — most reps at 185 lb (8)");
  });
});

describe("getRecordHistory (real Dexie)", () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    db.close();
  });

  it("returns sets from other sessions only, without undone sets", async () => {
    const day = await startDay();
    const past = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, past.id, "machine-chest-press", 1, 135, 10);
    await logSet(day.id, past.id, "machine-chest-press", 2, 145, 8);
    await undoLastSet(day.id, past.id);
    await completeWorkout(day.id, past.id, "STANDARD", "COMPLETED");

    const current = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, current.id, "machine-chest-press", 1, 140, 10);
    await skipSet(day.id, current.id, "machine-chest-press", 2);

    const history = await getRecordHistory(current.id);
    expect(history.map((s) => [s.weight, s.reps])).toEqual([[135, 10]]);

    const records = findSessionRecords(history, await getPerformedSets(current.id));
    expect([...records.values()]).toEqual([{ kind: "HEAVIEST", weight: 140, reps: 10 }]);
  });
});
