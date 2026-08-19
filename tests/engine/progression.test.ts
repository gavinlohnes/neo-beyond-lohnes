import { describe, expect, it } from "vitest";
import { evaluateProgression } from "../../src/engine/progression";
import type { ExercisePrescription, PerformedSet } from "../../src/domain/workout/types";

const PRESCRIPTION: ExercisePrescription = {
  exerciseId: "machine-chest-press",
  name: "Machine Chest Press",
  sets: 3,
  repRangeLow: 8,
  repRangeHigh: 12,
  incrementLbs: 5,
};

function set(weight: number, reps: number, skipped = false): PerformedSet {
  return {
    id: crypto.randomUUID(),
    beyondDayId: "day-1",
    sessionId: "session-1",
    exerciseId: PRESCRIPTION.exerciseId,
    setNumber: 1,
    weight,
    reps,
    skipped,
    recordedAt: new Date().toISOString(),
  };
}

describe("evaluateProgression — NO_HISTORY", () => {
  it("no prior sets at all", () => {
    expect(evaluateProgression(PRESCRIPTION, []).recommendation).toBe("NO_HISTORY");
  });
});

describe("evaluateProgression — INCREASE", () => {
  it("all required sets at the top of the rep range at the same weight", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 12), set(135, 12), set(135, 12)]);
    expect(result.recommendation).toBe("INCREASE");
    expect(result.lastWeight).toBe(135);
    expect(result.suggestedNextWeight).toBe(140); // 135 + the exercise's own 5lb increment
  });

  it("above the top of the range also counts as reaching it", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 13), set(135, 15), set(135, 12)]);
    expect(result.recommendation).toBe("INCREASE");
  });

  it("uses the exercise's own configured increment, not a universal +2.5lb", () => {
    const customIncrement: ExercisePrescription = { ...PRESCRIPTION, incrementLbs: 10 };
    const result = evaluateProgression(customIncrement, [set(100, 12), set(100, 12), set(100, 12)]);
    expect(result.suggestedNextWeight).toBe(110);
  });
});

describe("evaluateProgression — HOLD", () => {
  it("within range without reaching the top", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 10), set(135, 9), set(135, 11)]);
    expect(result.recommendation).toBe("HOLD");
    expect(result.lastWeight).toBe(135);
  });

  it("mixed evidence: some sets at top, some below minimum", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 12), set(135, 5), set(135, 10)]);
    expect(result.recommendation).toBe("HOLD");
  });

  it("fewer sets performed than prescribed (incomplete evidence)", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 12), set(135, 12)]); // only 2 of 3
    expect(result.recommendation).toBe("HOLD");
  });

  it("a skipped set makes the evidence incomplete, even if the other sets were all at the top", () => {
    const result = evaluateProgression(PRESCRIPTION, [
      set(135, 12),
      set(135, 12),
      set(0, 0, true), // skipped — must not count as a failing 0
    ]);
    expect(result.recommendation).toBe("HOLD");
    expect(result.reason).toMatch(/incomplete/i);
  });

  it("mixed weights across sets is treated as unclean evidence", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 12), set(140, 12), set(135, 12)]);
    expect(result.recommendation).toBe("HOLD");
  });
});

describe("evaluateProgression — REDUCE", () => {
  it("every completed required set below the rep-range minimum", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 5), set(135, 6), set(135, 4)]);
    expect(result.recommendation).toBe("REDUCE");
    expect(result.suggestedNextWeight).toBe(130);
  });

  it("exactly at the minimum does not count as below it", () => {
    const result = evaluateProgression(PRESCRIPTION, [set(135, 8), set(135, 8), set(135, 8)]);
    expect(result.recommendation).toBe("HOLD"); // within range, not below minimum
  });

  it("suggested reduced weight never goes negative", () => {
    const lightPrescription: ExercisePrescription = { ...PRESCRIPTION, incrementLbs: 10 };
    const result = evaluateProgression(lightPrescription, [set(5, 3), set(5, 3), set(5, 3)]);
    expect(result.recommendation).toBe("REDUCE");
    expect(result.suggestedNextWeight).toBe(0);
  });
});

describe("evaluateProgression — never silently changes anything", () => {
  it("is a pure function: same input always produces the same output, no side effects possible", () => {
    const sets = [set(135, 12), set(135, 12), set(135, 12)];
    const first = evaluateProgression(PRESCRIPTION, sets);
    const second = evaluateProgression(PRESCRIPTION, sets);
    expect(second).toEqual(first);
  });
});
