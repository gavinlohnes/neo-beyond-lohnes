import { describe, expect, it } from "vitest";
import { evaluate } from "../../src/engine/evaluate";
import type { StateCheckIn } from "../../src/domain/common/types";

function checkIn(overrides: Partial<StateCheckIn> = {}): StateCheckIn {
  return {
    id: "check-in-1",
    beyondDayId: "day-1",
    recordedAt: "2026-08-18T00:00:00.000Z",
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 0,
    alcoholUrge: 0,
    ...overrides,
  };
}

describe("evaluate — one primary recommendation per call", () => {
  it("returns exactly one recommendation object (never a list)", () => {
    const result = evaluate({ beyondDayId: "day-1", checkIn: checkIn(), hasPlannedWork: false });
    expect(result).toBeTypeOf("object");
    expect(result.kind).toBeDefined();
  });

  it("no check-in yet -> NO_ACTION_REQUIRED, not an error or empty state", () => {
    const result = evaluate({ beyondDayId: "day-1", checkIn: null, hasPlannedWork: false });
    expect(result.kind).toBe("NO_ACTION_REQUIRED");
    expect(result.statusAtIssue).toBe("NO_ACTION_REQUIRED");
    expect(result.suggestedCommand).toBeNull();
  });

  it("RED capacity -> STABILIZE beats every other rule", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn({ energy: 1 }),
      hasPlannedWork: true,
    });
    expect(result.kind).toBe("STABILIZE");
    expect(result.priority).toBe(1);
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
    expect(result.statusAtIssue).toBe("ACTION");
  });

  it("YELLOW capacity -> RECOVER beats planned work", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn({ stress: 4 }),
      hasPlannedWork: true,
    });
    expect(result.kind).toBe("RECOVER");
    expect(result.priority).toBe(2);
    expect(result.suggestedCommand).toBe("RECOVERY_SESSION");
  });

  it("GREEN capacity with planned work -> EXECUTE_PLANNED_WORK", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn(),
      hasPlannedWork: true,
    });
    expect(result.kind).toBe("EXECUTE_PLANNED_WORK");
    expect(result.priority).toBe(3);
    expect(result.suggestedCommand).toBe("START_WORKOUT");
  });

  it("GREEN capacity with no planned work -> NO_ACTION_REQUIRED as a first-class recommendation", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn(),
      hasPlannedWork: false,
    });
    expect(result.kind).toBe("NO_ACTION_REQUIRED");
    expect(result.priority).toBe(4);
    expect(result.suggestedCommand).toBeNull();
    expect(result.statusAtIssue).toBe("NO_ACTION_REQUIRED");
  });
});

describe("evaluate — WHY trace", () => {
  it("records which rules matched and why, and the selection reason", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn({ energy: 1 }),
      hasPlannedWork: false,
    });
    expect(result.trace.selectedRecommendation).toBe("STABILIZE");
    const stabilizeRule = result.trace.matchedRules.find((r) => r.ruleId === "STABILIZE");
    expect(stabilizeRule?.result).toBe(true);
    const recoverRule = result.trace.matchedRules.find((r) => r.ruleId === "RECOVER");
    expect(recoverRule?.result).toBe(false);
    expect(result.trace.selectionReason).toContain("RED capacity");
  });

  it("records derived capacity and reason codes when a check-in exists", () => {
    const result = evaluate({
      beyondDayId: "day-1",
      checkIn: checkIn({ stress: 4 }),
      hasPlannedWork: false,
    });
    const capacityInput = result.trace.derived.find((d) => d.key === "capacity");
    expect(capacityInput?.value).toBe("YELLOW");
  });

  it("records no derived capacity when there is no check-in", () => {
    const result = evaluate({ beyondDayId: "day-1", checkIn: null, hasPlannedWork: false });
    expect(result.trace.derived).toEqual([]);
  });
});
