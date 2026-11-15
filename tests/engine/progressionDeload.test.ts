import { describe, expect, it } from "vitest";
import { DELOAD_FRACTION, evaluateProgression } from "../../src/engine/progression";
import { buildExerciseHistories, deloadStall, type ExerciseSession } from "../../src/engine/stall";
import type { ExercisePrescription, PerformedSet } from "../../src/domain/workout/types";

/**
 * DELOAD (4.0-b slice 1; Gavin, 2026-11-15: "I approve the [deload] rule"): a lift whose last 4 sessions in the
 * past 28 days set no new record, all at about the same weight, gets one lighter session at ~90%, rounded down to
 * its own increment. Never replaces INCREASE or RE-ENTRY; advisory only.
 */
const LEG_PRESS: ExercisePrescription = { exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 };
const now = new Date(2026, 10, 15, 9);
const DAY = 86_400_000;

function sets(entries: [weight: number, reps: number][]): PerformedSet[] {
  return entries.map(([weight, reps], i) => ({
    id: `s${i}`, beyondDayId: "d", sessionId: "x", exerciseId: "leg-press", setNumber: i + 1, weight, reps, skipped: false,
    recordedAt: new Date(2026, 10, 14, 7, i).toISOString(),
  }));
}
const MID = sets([[270, 10], [270, 10], [270, 10]]); // HOLD at 270
const LOW = sets([[270, 6], [270, 6], [270, 6]]); // REDUCE
const TOP = sets([[270, 12], [270, 12], [270, 12]]); // INCREASE

/** Sessions every 3 days ending yesterday, oldest first. */
function run(tops: number[], records: boolean[] = tops.map(() => false)): ExerciseSession[] {
  return tops.map((topWeight, i) => ({ t: now.getTime() - (tops.length - i) * 3 * DAY, topWeight, record: records[i]! }));
}
const STALL = deloadStall(run([260, 270, 270, 270, 270]), now)!;

describe("the steady stall (engine/stall.ts)", () => {
  it("four sessions after the first, no record, all within 95% of the heaviest", () => {
    expect(STALL).toEqual({ sessions: 4, topWeights: [270, 270, 270, 270] });
    expect(deloadStall(run([260, 270, 260, 270, 265]), now)).toEqual({ sessions: 4, topWeights: [270, 260, 270, 265] });
  });

  it("no stall with a record in the run, with only four sessions, or when the last is over 28 days ago", () => {
    expect(deloadStall(run([260, 270, 270, 270, 270], [true, false, true, false, false]), now)).toBeUndefined();
    expect(deloadStall(run([270, 270, 270, 270]), now)).toBeUndefined();
    const stale = run([260, 270, 270, 270, 270]).map((s) => ({ ...s, t: s.t - 27 * DAY }));
    expect(deloadStall(stale, now)).toBeUndefined();
  });

  it("a lighter session in the run (a deload done, or building back) is not a plain stall, so it can't repeat at once", () => {
    // The deload at 240, then three sessions building back: no DELOAD until four sessions after it.
    expect(deloadStall(run([270, 270, 270, 270, 270, 240, 250, 260]), now)).toBeUndefined();
    expect(deloadStall(run([270, 270, 270, 270, 270, 240, 260, 270, 270]), now)).toBeUndefined();
    expect(deloadStall(run([270, 270, 270, 270, 270, 240, 260, 270, 270, 270]), now)).toMatchObject({ topWeights: [260, 270, 270, 270] });
  });

  it("buildExerciseHistories judges records with the PR rule: heavier or more reps", () => {
    const at = (d: number) => new Date(2026, 10, d, 7).toISOString();
    const set = (id: string, sessionId: string, weight: number, reps: number): PerformedSet => ({
      id, beyondDayId: "d", sessionId, exerciseId: "leg-press", setNumber: 1, weight, reps, skipped: false, recordedAt: at(Number(sessionId.slice(1))),
    });
    const h = buildExerciseHistories(
      [{ sessionId: "s3", startedAt: at(3) }, { sessionId: "s1", startedAt: at(1) }, { sessionId: "s2", startedAt: at(2) }],
      [set("a", "s1", 270, 10), set("b", "s2", 270, 11), set("c", "s3", 270, 10)],
    ).get("leg-press")!;
    expect(h.map((s) => s.record)).toEqual([false, true, false]);
  });
});

describe("DELOAD in the progression rule", () => {
  it("turns HOLD into one lighter session at ~90%, rounded down to the increment, with the reason", () => {
    expect(DELOAD_FRACTION).toBe(0.9);
    expect(evaluateProgression(LEG_PRESS, MID, { stall: STALL })).toEqual({
      recommendation: "DELOAD",
      reason: "No new record for Leg Press in your last 4 sessions — suggests one lighter session at 240lb (about 90% of 270lb), then building back.",
      lastWeight: 270,
      suggestedNextWeight: 240,
      stallTopWeights: [270, 270, 270, 270],
    });
  });

  it("turns REDUCE into DELOAD too, from the weight last used", () => {
    expect(evaluateProgression(LEG_PRESS, LOW, { stall: STALL })).toMatchObject({ recommendation: "DELOAD", suggestedNextWeight: 240 });
  });

  it("never replaces INCREASE, and a layoff gets RE-ENTRY instead", () => {
    expect(evaluateProgression(LEG_PRESS, TOP, { stall: STALL }).recommendation).toBe("INCREASE");
    expect(evaluateProgression(LEG_PRESS, MID, { stall: STALL, daysSinceLastPerformed: 14 }).recommendation).toBe("RE_ENTRY");
  });

  it("without a stall, or when 90% rounds to nothing lighter, the locked rule is untouched", () => {
    expect(evaluateProgression(LEG_PRESS, MID, {})).toEqual(evaluateProgression(LEG_PRESS, MID));
    expect(evaluateProgression(LEG_PRESS, MID).recommendation).toBe("HOLD");
    const light = sets([[5, 10], [5, 10], [5, 10]]);
    expect(evaluateProgression(LEG_PRESS, light, { stall: { sessions: 4, topWeights: [5, 5, 5, 5] } }).recommendation).toBe("HOLD");
  });

  it("mixed weights last time deload from the heaviest set done", () => {
    const mixed = sets([[270, 10], [260, 10], [260, 10]]);
    expect(evaluateProgression(LEG_PRESS, mixed, { stall: STALL })).toMatchObject({ recommendation: "DELOAD", lastWeight: 270, suggestedNextWeight: 240 });
  });
});


it("DELOAD uses its own recent canonical evidence instead of an older slot or substituted load", () => {
  const stall = { sessions: 4, topWeights: [100, 100, 100, 100] };
  const oldSlot = sets([[500, 10], [500, 10], [500, 10]]);
  const mixedSubstitute = sets([[100, 10], [100, 10], [300, 10]]);
  mixedSubstitute[2]!.substitutedName = "Different machine";
  for (const history of [oldSlot, mixedSubstitute]) {
    expect(evaluateProgression(LEG_PRESS, history, { stall })).toMatchObject({ recommendation: "DELOAD", lastWeight: 100, suggestedNextWeight: 90 });
  }
});
