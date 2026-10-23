import { describe, expect, it } from "vitest";
import { evaluate, type EvaluateInput } from "../../src/engine/evaluate";
import type { StateCheckIn } from "../../src/domain/common/types";
import { explainRecommendation } from "../../src/ui/screens/today/recommendationCopy";
import {
  DECLINE_LABEL,
  describeEvidenceBasis,
  describeRecommendationAction,
  describeRecommendationEffect,
  describeRecordedDecision,
  describeTraceLabel,
  describeTraceValue,
  describePriorOutcomeMemory,
  describeRecommendationHandoff,
} from "../../src/ui/screens/today/recommendationCopy";
import type { RecommendationKind } from "../../src/domain/common/types";

const actionKinds: RecommendationKind[] = [
  "STABILIZE",
  "POST_SHIFT_TRANSITION",
  "RECOVER",
  "EXECUTE_PLANNED_WORK",
  "OBLIGATION_DUE",
];

describe("describeRecommendationHandoff", () => {
  it("uses open/go-to language that remains distinct from execution", () => {
    expect(describeRecommendationHandoff("SHIFT_DOWN")).toBe("GO TO SHIFT DOWN");
    expect(describeRecommendationHandoff("RECOVERY")).toBe("OPEN RECOVERY ON TRAIN");
    expect(describeRecommendationHandoff("WORKOUT")).toBe("OPEN WORKOUT ON TRAIN");
  });
});

describe("describeRecommendationAction", () => {
  it("uses the same label for every action-kind recommendation — there is only one real accept state", () => {
    for (const kind of actionKinds) {
      expect(describeRecommendationAction(kind)).toBe("I'll do this");
    }
  });

  it("uses a distinct label for NO_ACTION_REQUIRED", () => {
    expect(describeRecommendationAction("NO_ACTION_REQUIRED")).toBe("GOT IT");
  });
});

describe("describeRecommendationEffect", () => {
  it("tells the user recording STABILIZE does not itself start SHIFT DOWN", () => {
    const text = describeRecommendationEffect("STABILIZE");
    expect(text).toContain("doesn't start");
    expect(text).toContain("SHIFT DOWN");
  });

  it("tells the user recording RECOVER does not itself start a session", () => {
    const text = describeRecommendationEffect("RECOVER");
    expect(text).toContain("doesn't start");
    expect(text).toContain("TRAIN");
  });

  it("tells the user recording EXECUTE_PLANNED_WORK does not itself start the workout", () => {
    const text = describeRecommendationEffect("EXECUTE_PLANNED_WORK");
    expect(text).toContain("doesn't start");
    expect(text).toContain("TRAIN");
  });

  it("tells the user recording OBLIGATION_DUE does not itself resolve the obligation", () => {
    const text = describeRecommendationEffect("OBLIGATION_DUE");
    expect(text).toContain("doesn't resolve the commitment");
  });

  it("makes clear NO_ACTION_REQUIRED has nothing to start", () => {
    expect(describeRecommendationEffect("NO_ACTION_REQUIRED")).toContain("Nothing to start");
  });

  it("tells the user recording an action-kind decision won't change future recommendations", () => {
    for (const kind of actionKinds) {
      expect(describeRecommendationEffect(kind)).toContain("change future advice");
    }
  });
});

describe("DECLINE_LABEL", () => {
  it("matches the tone of the accept label", () => {
    expect(DECLINE_LABEL).toBe("Not doing this");
  });
});

describe("describeRecordedDecision", () => {
  it("shows a distinct label once a recommendation was declined", () => {
    expect(describeRecordedDecision("DECLINED")).toBe("NOT DOING THIS — RECORDED");
  });

  it("shows the plain RECORDED label for an accepted decision", () => {
    expect(describeRecordedDecision("ACCEPTED")).toBe("RECORDED");
  });

  it("shows the plain RECORDED label for an acknowledged no-action decision", () => {
    expect(describeRecordedDecision("NO_ACTION_RECORDED")).toBe("RECORDED");
  });
});

describe("describeEvidenceBasis", () => {
  it("returns null when a check-in exists — no caveat needed", () => {
    expect(describeEvidenceBasis(true)).toBeNull();
  });

  it("surfaces the missing-data caveat when there is no check-in yet", () => {
    const text = describeEvidenceBasis(false);
    expect(text).not.toBeNull();
    expect(text).toContain("No check-in yet");
  });
});

/** TODAY // SUIT LAYER 01 (DEC-003): labels/values for the WHY panel's exposed DecisionTrace fields. */
describe("describeTraceLabel", () => {
  it("gives a human label for every key engine/evaluate.ts actually produces", () => {
    expect(describeTraceLabel("hasCheckIn")).toBe("Check-in recorded");
    expect(describeTraceLabel("hasPlannedWork")).toBe("Planned work today");
    expect(describeTraceLabel("capacity")).toBe("Capacity");
    expect(describeTraceLabel("reasonCodes")).toBe("Reason codes");
    expect(describeTraceLabel("hasEligibleObligationDueOrOverdue")).toBe("Obligation overdue or due today");
  });

  it("falls back to the raw key for anything unrecognized, rather than hiding it", () => {
    expect(describeTraceLabel("somethingNew")).toBe("somethingNew");
  });
});

describe("describeTraceValue", () => {
  it("renders booleans as Yes/No", () => {
    expect(describeTraceValue(true)).toBe("Yes");
    expect(describeTraceValue(false)).toBe("No");
  });

  it("renders an empty string as an explicit em dash, not a blank cell", () => {
    expect(describeTraceValue("")).toBe("—");
  });

  it("renders any other real value verbatim", () => {
    expect(describeTraceValue("GREEN")).toBe("GREEN");
    expect(describeTraceValue("energy == 1, stress == 5")).toBe("energy == 1, stress == 5");
  });
});

describe("describePriorOutcomeMemory", () => {
  it.each(["GOOD", "NEUTRAL", "BAD"] as const)("renders an explicit %s rating faithfully", (rating) => {
    const issuedAt = "2026-08-20T14:30:00.000Z";
    expect(describePriorOutcomeMemory("ACCEPTED", rating, issuedAt)).toBe(
      `Last time this recommendation was recorded (${new Date(issuedAt).toLocaleDateString()}): ACCEPTED · ${rating}`,
    );
  });

  it("preserves a no-action decision as observational history", () => {
    expect(describePriorOutcomeMemory("NO_ACTION_RECORDED", "GOOD", "2026-08-19T00:00:00.000Z")).toContain(
      "NO ACTION RECORDED · GOOD",
    );
  });
});

describe("DELTA-002 slice 1 — explainRecommendation (plain-words why, from the trace)", () => {
  const check = (values: Partial<StateCheckIn>): StateCheckIn =>
    ({ id: "c", beyondDayId: "d", recordedAt: "2026-10-23T02:00:00.000Z", energy: 3, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0, ...values } as StateCheckIn);
  const run = (checkIn: StateCheckIn | null, flags: Partial<Pick<EvaluateInput, "hasPlannedWork" | "hasUnresolvedPostShift" | "hasEligibleObligationDueOrOverdue">> = {}) => {
    const recommendation = evaluate({ beyondDayId: "d", checkIn, hasPlannedWork: false, hasUnresolvedPostShift: false, hasEligibleObligationDueOrOverdue: false, ...flags } as EvaluateInput);
    return { kind: recommendation.kind, lines: explainRecommendation(recommendation, checkIn) };
  };
  const limits = "BEYOND decides from your check-in, plan, shift and commitments. It doesn't use sleep, weight or training here.";

  it("names the check-in answers that put capacity at RED, and that it outranks shifting down", () => {
    const { kind, lines } = run(check({ energy: 1, stress: 5 }), { hasUnresolvedPostShift: true });
    expect(kind).toBe("STABILIZE");
    expect(lines).toEqual([
      "Your check-in put capacity at RED: energy is critically low (1 of 5) and stress is very high (5 of 5).",
      "Shifting down after work can wait; low capacity comes first.",
      limits,
    ]);
  });

  it("explains YELLOW, post-shift, planned work, a due commitment and the all-clear", () => {
    expect(run(check({ energy: 2 }))).toEqual({ kind: "RECOVER", lines: ["Your check-in put capacity at YELLOW: energy is low (2 of 5).", limits] });
    expect(run(check({}), { hasUnresolvedPostShift: true }).lines.slice(0, 2)).toEqual([
      "Your shift has ended and you haven't shifted down yet.", "Your check-in is GREEN, so coming down from work comes before anything else."]);
    expect(run(check({}), { hasPlannedWork: true, hasEligibleObligationDueOrOverdue: true }).lines.slice(0, 2)).toEqual([
      "Your check-in is GREEN and you have work planned today.", "A commitment is also due; your plan comes first."]);
    expect(run(check({}), { hasEligibleObligationDueOrOverdue: true }).lines[0]).toBe("A commitment is due or overdue, and nothing more urgent came first.");
    expect(run(null).lines[0]).toBe("No check-in yet, and your plan, shift and commitments don't call for anything.");
  });

  it("always ends by saying what the Engine does not consider", () => {
    for (const c of [check({ mood: 1 }), check({ soreness: 4 }), check({}), null]) expect(run(c).lines.at(-1)).toBe(limits);
  });
});
