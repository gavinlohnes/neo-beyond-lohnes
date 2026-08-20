import { describe, expect, it } from "vitest";
import {
  DECLINE_LABEL,
  describeEvidenceBasis,
  describeRecommendationAction,
  describeRecommendationEffect,
  describeRecordedDecision,
} from "../../src/ui/screens/today/recommendationCopy";
import type { RecommendationKind } from "../../src/domain/common/types";

const actionKinds: RecommendationKind[] = ["STABILIZE", "RECOVER", "EXECUTE_PLANNED_WORK"];

describe("describeRecommendationAction", () => {
  it("uses the same label for every action-kind recommendation — there is only one real accept state", () => {
    for (const kind of actionKinds) {
      expect(describeRecommendationAction(kind)).toBe("I'll do this");
    }
  });

  it("uses a distinct label for NO_ACTION_REQUIRED", () => {
    expect(describeRecommendationAction("NO_ACTION_REQUIRED")).toBe("No action needed");
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

  it("makes clear NO_ACTION_REQUIRED has nothing to start", () => {
    expect(describeRecommendationEffect("NO_ACTION_REQUIRED")).toContain("Nothing to start");
  });

  it("tells the user recording an action-kind decision won't change future recommendations", () => {
    for (const kind of actionKinds) {
      expect(describeRecommendationEffect(kind)).toContain("won't change what BEYOND recommends next time");
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
