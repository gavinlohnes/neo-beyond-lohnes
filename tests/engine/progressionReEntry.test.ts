import { describe, expect, it } from "vitest";
import { evaluateProgression, RE_ENTRY_DAYS } from "../../src/engine/progression";
import type { ExercisePrescription, PerformedSet } from "../../src/domain/workout/types";

/**
 * RE-ENTRY (owner-approved amendment, 2026-10-03): after 14+ days away from
 * an exercise, an INCREASE or HOLD becomes ~90% of the last load, rounded
 * down to the exercise's own increment.
 */
const LEG_PRESS: ExercisePrescription = { exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 };
const CURL: ExercisePrescription = { exerciseId: "preacher-curl", name: "Preacher Curl", sets: 2, repRangeLow: 10, repRangeHigh: 15, incrementLbs: 5 };

function sets(prescription: ExercisePrescription, entries: [weight: number, reps: number, skipped?: boolean][]): PerformedSet[] {
  return entries.map(([weight, reps, skipped = false], i) => ({
    id: `s${i}`,
    beyondDayId: "d",
    sessionId: "x",
    exerciseId: prescription.exerciseId,
    setNumber: i + 1,
    weight,
    reps,
    skipped,
    recordedAt: new Date(2026, 8, 1, 7, i).toISOString(),
  }));
}

const TOP = sets(LEG_PRESS, [[270, 12], [270, 12], [270, 12]]); // INCREASE
const MID = sets(LEG_PRESS, [[270, 10], [270, 10], [270, 10]]); // HOLD at 270

describe("re-entry boundary", () => {
  it("13 days away changes nothing; 14 days away eases back in", () => {
    expect(evaluateProgression(LEG_PRESS, TOP, { daysSinceLastPerformed: 13 }).recommendation).toBe("INCREASE");
    expect(evaluateProgression(LEG_PRESS, TOP, { daysSinceLastPerformed: RE_ENTRY_DAYS })).toEqual({
      recommendation: "RE_ENTRY",
      reason: "14 days since your last Leg Press — suggests 240lb (about 90% of 270lb) to start back.",
      lastWeight: 270,
      suggestedNextWeight: 240,
      daysSinceLastPerformed: 14,
    });
  });

  it("with no day count at all, the locked rule is untouched", () => {
    expect(evaluateProgression(LEG_PRESS, TOP)).toEqual(evaluateProgression(LEG_PRESS, TOP, {}));
    expect(evaluateProgression(LEG_PRESS, TOP).recommendation).toBe("INCREASE");
  });
});

describe("which advice it replaces", () => {
  it("replaces INCREASE and HOLD", () => {
    expect(evaluateProgression(LEG_PRESS, MID, { daysSinceLastPerformed: 20 })).toMatchObject({
      recommendation: "RE_ENTRY",
      suggestedNextWeight: 240,
    });
  });

  it("leaves REDUCE alone — it's already lighter", () => {
    const low = sets(LEG_PRESS, [[270, 5], [270, 6], [270, 5]]);
    expect(evaluateProgression(LEG_PRESS, low, { daysSinceLastPerformed: 30 })).toMatchObject({ recommendation: "REDUCE", suggestedNextWeight: 260 });
  });

  it("has nothing to ease back into without history", () => {
    expect(evaluateProgression(LEG_PRESS, [], { daysSinceLastPerformed: 30 }).recommendation).toBe("NO_HISTORY");
  });

  it("eases back from the heaviest set done when last time was mixed or incomplete", () => {
    const mixed = sets(LEG_PRESS, [[250, 12], [270, 10], [260, 11]]);
    expect(evaluateProgression(LEG_PRESS, mixed, { daysSinceLastPerformed: 15 })).toMatchObject({
      recommendation: "RE_ENTRY",
      lastWeight: 270,
      suggestedNextWeight: 240,
    });
    const skipped = sets(LEG_PRESS, [[270, 10], [999, 0, true], [270, 9]]);
    expect(evaluateProgression(LEG_PRESS, skipped, { daysSinceLastPerformed: 15 })).toMatchObject({ lastWeight: 270, suggestedNextWeight: 240 });
  });
});

describe("rounding", () => {
  it("rounds down to the exercise's own step, never up", () => {
    // 270 × 0.9 = 243 → 240 on a 10-lb stack; 65 × 0.9 = 58.5 → 55 on a 5-lb step.
    expect(evaluateProgression(CURL, sets(CURL, [[65, 15], [65, 15]]), { daysSinceLastPerformed: 21 })).toMatchObject({ suggestedNextWeight: 55 });
    // An exact multiple stays exact: 100 × 0.9 = 90.
    expect(evaluateProgression(LEG_PRESS, sets(LEG_PRESS, [[100, 12], [100, 12], [100, 12]]), { daysSinceLastPerformed: 21 })).toMatchObject({ suggestedNextWeight: 90 });
  });

  it("keeps the ordinary advice when there's no lighter step to suggest", () => {
    // 5 × 0.9 = 4.5 → 0 on a 5-lb step: no real lighter weight exists.
    expect(evaluateProgression(CURL, sets(CURL, [[5, 15], [5, 15]]), { daysSinceLastPerformed: 30 }).recommendation).toBe("INCREASE");
  });
});
