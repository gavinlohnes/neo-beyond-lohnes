import { describe, expect, it } from "vitest";
import {
  describeRecommendationAction,
  describeRecommendationEffect,
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
});
