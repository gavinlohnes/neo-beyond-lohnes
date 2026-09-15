import { describe, expect, it } from "vitest";
import { evaluate, type EvaluateInput } from "../../src/engine/evaluate";
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

// hasUnresolvedPostShift defaults to false so every pre-Drop-02b test below
// exercises exactly the same behavior it always did — POST_SHIFT_TRANSITION
// only ever appears in the dedicated describe block further down.
// hasEligibleObligationDueOrOverdue defaults to false so every pre-Drop
// INTENT-ARBITRATION-001 test below exercises exactly the same behavior it
// always did — OBLIGATION_DUE only ever appears in its own describe block.
function input(overrides: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    beyondDayId: "day-1",
    checkIn: checkIn(),
    hasPlannedWork: false,
    hasUnresolvedPostShift: false,
    hasEligibleObligationDueOrOverdue: false,
    ...overrides,
  };
}

describe("evaluate — one primary recommendation per call", () => {
  it("returns exactly one recommendation object (never a list)", () => {
    const result = evaluate(input());
    expect(result).toBeTypeOf("object");
    expect(result.kind).toBeDefined();
  });

  it("no check-in yet -> NO_ACTION_REQUIRED, not an error or empty state", () => {
    const result = evaluate(input({ checkIn: null }));
    expect(result.kind).toBe("NO_ACTION_REQUIRED");
    expect(result.statusAtIssue).toBe("NO_ACTION_REQUIRED");
    expect(result.suggestedCommand).toBeNull();
  });

  it("RED capacity -> STABILIZE beats every other rule", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }), hasPlannedWork: true }));
    expect(result.kind).toBe("STABILIZE");
    expect(result.priority).toBe(1);
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
    expect(result.statusAtIssue).toBe("ACTION");
  });

  it("YELLOW capacity -> RECOVER beats planned work", () => {
    const result = evaluate(input({ checkIn: checkIn({ stress: 4 }), hasPlannedWork: true }));
    expect(result.kind).toBe("RECOVER");
    expect(result.priority).toBe(3);
    expect(result.suggestedCommand).toBe("RECOVERY_SESSION");
  });

  it("GREEN capacity with planned work -> EXECUTE_PLANNED_WORK", () => {
    const result = evaluate(input({ hasPlannedWork: true }));
    expect(result.kind).toBe("EXECUTE_PLANNED_WORK");
    expect(result.priority).toBe(4);
    expect(result.suggestedCommand).toBe("START_WORKOUT");
  });

  it("GREEN capacity with no planned work -> NO_ACTION_REQUIRED as a first-class recommendation", () => {
    const result = evaluate(input());
    expect(result.kind).toBe("NO_ACTION_REQUIRED");
    expect(result.priority).toBe(6);
    expect(result.suggestedCommand).toBeNull();
    expect(result.statusAtIssue).toBe("NO_ACTION_REQUIRED");
  });
});

describe("evaluate — WHY trace", () => {
  it("records which rules matched and why, and the selection reason", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }) }));
    expect(result.trace.selectedRecommendation).toBe("STABILIZE");
    const stabilizeRule = result.trace.matchedRules.find((r) => r.ruleId === "STABILIZE");
    expect(stabilizeRule?.result).toBe(true);
    const recoverRule = result.trace.matchedRules.find((r) => r.ruleId === "RECOVER");
    expect(recoverRule?.result).toBe(false);
    expect(result.trace.selectionReason).toContain("RED capacity");
  });

  it("records derived capacity and reason codes when a check-in exists", () => {
    const result = evaluate(input({ checkIn: checkIn({ stress: 4 }) }));
    const capacityInput = result.trace.derived.find((d) => d.key === "capacity");
    expect(capacityInput?.value).toBe("YELLOW");
  });

  it("records no derived capacity when there is no check-in", () => {
    const result = evaluate(input({ checkIn: null }));
    expect(result.trace.derived).toEqual([]);
  });

  it("records unresolved post-shift context as an explicit decision input", () => {
    const result = evaluate(input({ hasUnresolvedPostShift: true }));
    expect(result.trace.inputs).toContainEqual({ key: "hasUnresolvedPostShift", value: true });
  });

  it("truthfully explains whether EXECUTE_PLANNED_WORK matched", () => {
    const matched = evaluate(input({ hasPlannedWork: true }));
    const matchedRule = matched.trace.matchedRules.find((r) => r.ruleId === "EXECUTE_PLANNED_WORK");
    expect(matchedRule).toMatchObject({
      result: true,
      reason: "GREEN capacity with planned work",
    });

    const notMatched = evaluate(input({ hasPlannedWork: false }));
    const notMatchedRule = notMatched.trace.matchedRules.find((r) => r.ruleId === "EXECUTE_PLANNED_WORK");
    expect(notMatchedRule).toMatchObject({
      result: false,
      reason: "GREEN capacity with no planned work",
    });
  });
});

/**
 * Drop 02b (Explicit Work Transition). Decision Register: "Engine
 * priority: Stabilize -> explicit post-shift transition when applicable
 * -> Recover -> Execute planned work... On the next check-in, RED
 * capacity still wins; otherwise unresolved post-shift context recommends
 * SHIFT DOWN before generic recovery or execution."
 */
describe("evaluate — POST_SHIFT_TRANSITION (Drop 02b)", () => {
  it("RED capacity still outranks an unresolved post-shift fact", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }), hasUnresolvedPostShift: true }));
    expect(result.kind).toBe("STABILIZE");
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
  });

  it("unresolved post-shift beats YELLOW capacity's RECOVER", () => {
    const result = evaluate(input({ checkIn: checkIn({ stress: 4 }), hasUnresolvedPostShift: true }));
    expect(result.kind).toBe("POST_SHIFT_TRANSITION");
    expect(result.priority).toBe(2);
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
    expect(result.statusAtIssue).toBe("ACTION");
  });

  it("unresolved post-shift beats GREEN capacity's EXECUTE_PLANNED_WORK", () => {
    const result = evaluate(input({ hasPlannedWork: true, hasUnresolvedPostShift: true }));
    expect(result.kind).toBe("POST_SHIFT_TRANSITION");
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
  });

  it("unresolved post-shift beats plain GREEN capacity NO_ACTION_REQUIRED", () => {
    const result = evaluate(input({ hasUnresolvedPostShift: true }));
    expect(result.kind).toBe("POST_SHIFT_TRANSITION");
  });

  it("unresolved post-shift applies even with no check-in yet today", () => {
    const result = evaluate(input({ checkIn: null, hasUnresolvedPostShift: true }));
    expect(result.kind).toBe("POST_SHIFT_TRANSITION");
    expect(result.suggestedCommand).toBe("START_SHIFT_DOWN");
  });

  it("no unresolved post-shift fact -> behaves exactly as before (YELLOW still reaches RECOVER)", () => {
    const result = evaluate(input({ checkIn: checkIn({ stress: 4 }), hasUnresolvedPostShift: false }));
    expect(result.kind).toBe("RECOVER");
  });

  it("trace shows POST_SHIFT_TRANSITION matched and RECOVER/EXECUTE_PLANNED_WORK did not", () => {
    const result = evaluate(input({ hasPlannedWork: true, hasUnresolvedPostShift: true }));
    expect(result.trace.selectedRecommendation).toBe("POST_SHIFT_TRANSITION");
    const postShiftRule = result.trace.matchedRules.find((r) => r.ruleId === "POST_SHIFT_TRANSITION");
    expect(postShiftRule?.result).toBe(true);
    const recoverRule = result.trace.matchedRules.find((r) => r.ruleId === "RECOVER");
    expect(recoverRule?.result).toBe(false);
    const executeRule = result.trace.matchedRules.find((r) => r.ruleId === "EXECUTE_PLANNED_WORK");
    expect(executeRule?.result).toBe(false);
  });

  it("trace explains RED outranking an unresolved post-shift fact, not just silently omitting it", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }), hasUnresolvedPostShift: true }));
    const postShiftRule = result.trace.matchedRules.find((r) => r.ruleId === "POST_SHIFT_TRANSITION");
    expect(postShiftRule?.result).toBe(false);
    expect(postShiftRule?.reason).toContain("RED capacity outranks it");
  });
});

/**
 * INTENT-ARBITRATION-001 (direct owner ruling, 2026-09-15): a new
 * OBLIGATION_DUE kind, ranked at the bottom of the stack — above only
 * NO_ACTION_REQUIRED, below every other existing kind — triggered only by
 * hasEligibleObligationDueOrOverdue (the application layer's pre-computed
 * OVERDUE/DUE_TODAY eligibility gate; the Engine never sees Obligation
 * records themselves).
 */
describe("evaluate — OBLIGATION_DUE (INTENT-ARBITRATION-001)", () => {
  it("an eligible obligation with otherwise plain GREEN/no-planned-work state -> OBLIGATION_DUE", () => {
    const result = evaluate(input({ hasEligibleObligationDueOrOverdue: true }));
    expect(result.kind).toBe("OBLIGATION_DUE");
    expect(result.priority).toBe(5);
    expect(result.suggestedCommand).toBe("REVIEW_OBLIGATIONS");
    expect(result.statusAtIssue).toBe("ACTION");
  });

  it("no eligible obligation and nothing else applies -> NO_ACTION_REQUIRED, unchanged", () => {
    const result = evaluate(input({ hasEligibleObligationDueOrOverdue: false }));
    expect(result.kind).toBe("NO_ACTION_REQUIRED");
  });

  it("RED capacity still outranks an eligible obligation", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }), hasEligibleObligationDueOrOverdue: true }));
    expect(result.kind).toBe("STABILIZE");
  });

  it("an unresolved post-shift fact still outranks an eligible obligation", () => {
    const result = evaluate(input({ hasUnresolvedPostShift: true, hasEligibleObligationDueOrOverdue: true }));
    expect(result.kind).toBe("POST_SHIFT_TRANSITION");
  });

  it("YELLOW capacity's RECOVER still outranks an eligible obligation", () => {
    const result = evaluate(input({ checkIn: checkIn({ stress: 4 }), hasEligibleObligationDueOrOverdue: true }));
    expect(result.kind).toBe("RECOVER");
  });

  it("GREEN capacity with planned work still outranks an eligible obligation", () => {
    const result = evaluate(input({ hasPlannedWork: true, hasEligibleObligationDueOrOverdue: true }));
    expect(result.kind).toBe("EXECUTE_PLANNED_WORK");
  });

  it("trace records hasEligibleObligationDueOrOverdue as an explicit decision input", () => {
    const result = evaluate(input({ hasEligibleObligationDueOrOverdue: true }));
    expect(result.trace.inputs).toContainEqual({ key: "hasEligibleObligationDueOrOverdue", value: true });
  });

  it("trace shows OBLIGATION_DUE matched only once every higher-ranked rule did not", () => {
    const result = evaluate(input({ hasEligibleObligationDueOrOverdue: true }));
    expect(result.trace.selectedRecommendation).toBe("OBLIGATION_DUE");
    const obligationRule = result.trace.matchedRules.find((r) => r.ruleId === "OBLIGATION_DUE");
    expect(obligationRule?.result).toBe(true);
    for (const ruleId of ["STABILIZE", "POST_SHIFT_TRANSITION", "RECOVER", "EXECUTE_PLANNED_WORK"]) {
      expect(result.trace.matchedRules.find((r) => r.ruleId === ruleId)?.result).toBe(false);
    }
  });

  it("trace truthfully explains a higher-priority rule outranking an eligible obligation", () => {
    const result = evaluate(input({ checkIn: checkIn({ energy: 1 }), hasEligibleObligationDueOrOverdue: true }));
    const obligationRule = result.trace.matchedRules.find((r) => r.ruleId === "OBLIGATION_DUE");
    expect(obligationRule?.result).toBe(false);
    expect(obligationRule?.reason).toContain("outranks");
  });
});
