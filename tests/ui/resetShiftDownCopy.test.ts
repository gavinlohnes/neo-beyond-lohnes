import { describe, expect, it } from "vitest";
import { evaluate } from "../../src/engine/evaluate";
import {
  describeResetInProgress,
  describeResetResult,
  describeShiftDownInProgress,
  describeShiftDownResult,
  isPrimaryReset,
  isPrimaryShiftDown,
  RESET_EXPLANATION,
  SHIFT_DOWN_DURATION_PRESETS,
  SHIFT_DOWN_EXPLANATION,
} from "../../src/ui/screens/today/resetShiftDownCopy";
import type { StateCheckIn } from "../../src/domain/common/types";

function checkIn(overrides: Partial<Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">>): StateCheckIn {
  return {
    id: "t",
    beyondDayId: "d",
    recordedAt: new Date().toISOString(),
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 1,
    alcoholUrge: 0,
    ...overrides,
  };
}

describe("isPrimaryShiftDown — true only when SHIFT DOWN is the actual Engine recommendation", () => {
  it("is true for a RED (STABILIZE) recommendation", () => {
    const rec = evaluate({ beyondDayId: "d", checkIn: checkIn({ stress: 5 }), hasPlannedWork: false });
    expect(rec.kind).toBe("STABILIZE");
    expect(isPrimaryShiftDown(rec)).toBe(true);
  });

  it("is false for RECOVER (YELLOW)", () => {
    const rec = evaluate({ beyondDayId: "d", checkIn: checkIn({ soreness: 4 }), hasPlannedWork: false });
    expect(rec.kind).toBe("RECOVER");
    expect(isPrimaryShiftDown(rec)).toBe(false);
  });

  it("is false for EXECUTE_PLANNED_WORK (GREEN + planned work)", () => {
    const rec = evaluate({ beyondDayId: "d", checkIn: checkIn({}), hasPlannedWork: true });
    expect(rec.kind).toBe("EXECUTE_PLANNED_WORK");
    expect(isPrimaryShiftDown(rec)).toBe(false);
  });

  it("is false for NO_ACTION_REQUIRED", () => {
    const rec = evaluate({ beyondDayId: "d", checkIn: checkIn({}), hasPlannedWork: false });
    expect(rec.kind).toBe("NO_ACTION_REQUIRED");
    expect(isPrimaryShiftDown(rec)).toBe(false);
  });

  it("is false with no recommendation at all", () => {
    expect(isPrimaryShiftDown(null)).toBe(false);
  });
});

describe("isPrimaryReset — no engine path produces this today, verified against every real recommendation kind", () => {
  it("is false for all four kinds the locked engine can actually issue", () => {
    const stabilize = evaluate({ beyondDayId: "d", checkIn: checkIn({ stress: 5 }), hasPlannedWork: false });
    const recover = evaluate({ beyondDayId: "d", checkIn: checkIn({ soreness: 4 }), hasPlannedWork: false });
    const executePlannedWork = evaluate({ beyondDayId: "d", checkIn: checkIn({}), hasPlannedWork: true });
    const noActionRequired = evaluate({ beyondDayId: "d", checkIn: checkIn({}), hasPlannedWork: false });

    for (const rec of [stabilize, recover, executePlannedWork, noActionRequired]) {
      expect(isPrimaryReset(rec)).toBe(false);
    }
  });

  it("is false with no recommendation at all", () => {
    expect(isPrimaryReset(null)).toBe(false);
  });
});

describe("in-progress and result copy", () => {
  it("states the chosen intensity/duration plainly", () => {
    expect(describeResetInProgress(4)).toBe("RESET in progress at intensity 4.");
    expect(describeShiftDownInProgress(20)).toBe("SHIFT DOWN in progress — 20 minutes.");
  });

  it("distinguishes completed from cancelled in the result text", () => {
    expect(describeResetResult("COMPLETED")).toBe("RESET complete.");
    expect(describeResetResult("CANCELLED")).not.toBe(describeResetResult("COMPLETED"));
    expect(describeShiftDownResult("COMPLETED")).toBe("SHIFT DOWN complete.");
    expect(describeShiftDownResult("CANCELLED")).not.toBe(describeShiftDownResult("COMPLETED"));
  });
});

describe("SHIFT_DOWN_DURATION_PRESETS", () => {
  it("is a sensible ascending set of common durations", () => {
    expect(SHIFT_DOWN_DURATION_PRESETS).toEqual([5, 10, 15, 20, 30]);
    expect([...SHIFT_DOWN_DURATION_PRESETS].sort((a, b) => a - b)).toEqual([...SHIFT_DOWN_DURATION_PRESETS]);
  });
});

const BANNED_SUBSTRINGS = [
  "fail",
  "should",
  "must",
  "missed",
  "didn't",
  "incomplete",
  "behind",
  "again and again",
  "not enough",
  "guilt",
  "shame",
  "sorry",
  "give up",
];

describe("tone audit — no shame, failure, or pressure language in RESET/SHIFT DOWN copy", () => {
  it("contains none of the banned words/phrases, case-insensitively", () => {
    const strings = [
      RESET_EXPLANATION,
      SHIFT_DOWN_EXPLANATION,
      describeResetInProgress(3),
      describeShiftDownInProgress(15),
      describeResetResult("COMPLETED"),
      describeResetResult("CANCELLED"),
      describeShiftDownResult("COMPLETED"),
      describeShiftDownResult("CANCELLED"),
    ];
    for (const text of strings) {
      const lower = text.toLowerCase();
      for (const banned of BANNED_SUBSTRINGS) {
        expect(lower, `"${text}" should not contain "${banned}"`).not.toContain(banned);
      }
    }
  });

  it("frames cancelling as no big deal, not a setback", () => {
    expect(describeResetResult("CANCELLED")).toContain("no problem");
    expect(describeShiftDownResult("CANCELLED")).toContain("no problem");
  });
});
