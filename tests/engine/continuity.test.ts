import { describe, expect, it } from "vitest";
import {
  deriveRecommendationDisposition,
  isMateriallyNewEvidence,
  resolveContinuity,
  type ContinuityInput,
} from "../../src/engine/continuity";
import type { DecisionTrace } from "../../src/domain/common/types";

/**
 * FOUNDATION-1B — pure unit tests for the Continuity Engine (DROP/DEFER/
 * REINTRODUCE) and the Recommendation Lifecycle helpers it shares a module
 * with. No Dexie, no fake-indexeddb.
 */

function continuityInput(overrides: Partial<ContinuityInput> = {}): ContinuityInput {
  return {
    priorKind: "EXECUTE_PLANNED_WORK",
    priorDecision: undefined,
    todayCapacity: "GREEN",
    todayHasUnresolvedPostShift: false,
    ...overrides,
  };
}

describe("resolveContinuity", () => {
  it("prior kind NO_ACTION_REQUIRED -> DROP, regardless of decision or today's state", () => {
    expect(
      resolveContinuity(continuityInput({ priorKind: "NO_ACTION_REQUIRED", todayCapacity: "GREEN" })),
    ).toBe("DROP");
  });

  it("prior decision DECLINED -> DROP (Scenario E: closes cleanly, never re-litigated)", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: "DECLINED" }))).toBe("DROP");
  });

  it("prior decision ACCEPTED -> DROP (already resolved by the operator's own action)", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: "ACCEPTED" }))).toBe("DROP");
  });

  it("prior decision NO_ACTION_RECORDED -> DROP", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: "NO_ACTION_RECORDED" }))).toBe("DROP");
  });

  it("Scenario D: never decided, today GREEN and no unresolved post-shift -> REINTRODUCE", () => {
    expect(
      resolveContinuity(
        continuityInput({ priorDecision: undefined, todayCapacity: "GREEN", todayHasUnresolvedPostShift: false }),
      ),
    ).toBe("REINTRODUCE");
  });

  it("never decided, today RED -> DEFER (STABILIZE already has authority)", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: undefined, todayCapacity: "RED" }))).toBe("DEFER");
  });

  it("never decided, today YELLOW -> DEFER (RECOVER already has authority)", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: undefined, todayCapacity: "YELLOW" }))).toBe("DEFER");
  });

  it("never decided, unresolved post-shift -> DEFER, even with GREEN capacity", () => {
    expect(
      resolveContinuity(
        continuityInput({ priorDecision: undefined, todayCapacity: "GREEN", todayHasUnresolvedPostShift: true }),
      ),
    ).toBe("DEFER");
  });

  it("never decided, no check-in yet today (capacity null) -> REINTRODUCE (nothing constrained has been proven)", () => {
    expect(resolveContinuity(continuityInput({ priorDecision: undefined, todayCapacity: null }))).toBe(
      "REINTRODUCE",
    );
  });

  it("deterministic: same input -> same output", () => {
    const i = continuityInput({ priorDecision: undefined, todayCapacity: "GREEN" });
    expect(resolveContinuity(i)).toBe(resolveContinuity(i));
  });
});

describe("deriveRecommendationDisposition", () => {
  it("DECLINED -> DISMISSED", () => {
    expect(deriveRecommendationDisposition("DECLINED", false, "ACTIVE")).toBe("DISMISSED");
  });

  it("ACCEPTED -> COMPLETED", () => {
    expect(deriveRecommendationDisposition("ACCEPTED", false, "ACTIVE")).toBe("COMPLETED");
  });

  it("NO_ACTION_RECORDED -> COMPLETED", () => {
    expect(deriveRecommendationDisposition("NO_ACTION_RECORDED", false, "ACTIVE")).toBe("COMPLETED");
  });

  it("never decided, a later recommendation exists the same day -> SUPERSEDED", () => {
    expect(deriveRecommendationDisposition(undefined, true, "ACTIVE")).toBe("SUPERSEDED");
  });

  it("never decided, no later recommendation, day ENDED -> EXPIRED", () => {
    expect(deriveRecommendationDisposition(undefined, false, "ENDED")).toBe("EXPIRED");
  });

  it("never decided, no later recommendation, day still ACTIVE -> PENDING", () => {
    expect(deriveRecommendationDisposition(undefined, false, "ACTIVE")).toBe("PENDING");
  });

  it("a later recommendation existing outranks the day having ended (SUPERSEDED, not EXPIRED)", () => {
    expect(deriveRecommendationDisposition(undefined, true, "ENDED")).toBe("SUPERSEDED");
  });
});

function trace(overrides: Partial<DecisionTrace> = {}): DecisionTrace {
  return {
    engineVersion: "0.1.0",
    evaluatedAt: "2026-09-20T08:00:00.000Z",
    inputs: [
      { key: "hasCheckIn", value: true },
      { key: "hasPlannedWork", value: false },
      { key: "hasUnresolvedPostShift", value: false },
      { key: "hasEligibleObligationDueOrOverdue", value: false },
    ],
    derived: [
      { key: "capacity", value: "RED" },
      { key: "reasonCodes", value: "energy == 1" },
    ],
    matchedRules: [],
    selectedRecommendation: "STABILIZE",
    selectionReason: "STABILIZE matched on RED capacity.",
    ...overrides,
  };
}

describe("isMateriallyNewEvidence (Scenario E)", () => {
  it("identical trace (kind + inputs + derived) -> not materially new", () => {
    expect(isMateriallyNewEvidence(trace(), trace())).toBe(false);
  });

  it("different selected kind -> materially new", () => {
    expect(isMateriallyNewEvidence(trace(), trace({ selectedRecommendation: "RECOVER" }))).toBe(true);
  });

  it("a changed input value (e.g. hasPlannedWork flips) -> materially new", () => {
    const changed = trace({
      inputs: [
        { key: "hasCheckIn", value: true },
        { key: "hasPlannedWork", value: true },
        { key: "hasUnresolvedPostShift", value: false },
        { key: "hasEligibleObligationDueOrOverdue", value: false },
      ],
    });
    expect(isMateriallyNewEvidence(trace(), changed)).toBe(true);
  });

  it("a changed derived value (e.g. reasonCodes) -> materially new", () => {
    const changed = trace({ derived: [{ key: "capacity", value: "RED" }, { key: "reasonCodes", value: "mood == 1" }] });
    expect(isMateriallyNewEvidence(trace(), changed)).toBe(true);
  });

  it("evaluatedAt/selectionReason differing alone does not count — only inputs/derived/kind matter", () => {
    const later = trace({ evaluatedAt: "2026-09-21T08:00:00.000Z", selectionReason: "different prose, same facts" });
    expect(isMateriallyNewEvidence(trace(), later)).toBe(false);
  });

  it("symmetric: order of arguments does not change the verdict for identical traces", () => {
    expect(isMateriallyNewEvidence(trace(), trace())).toBe(isMateriallyNewEvidence(trace(), trace()));
  });
});
