import { describe, expect, it } from "vitest";
import { describeProgressionAdvisory, describeRecommendationLabel } from "../../src/ui/screens/train/trainCopy";
import { describeSelectionReason, describeTraceValue } from "../../src/ui/screens/today/recommendationCopy";
import type { ProgressionSuggestion } from "../../src/engine/progression";

/** CLEANUP-003: walk-through findings 5, 6 and 8, plain words on screen; the Engine's strings unchanged. */

const hold = (reason: string) => ({ recommendation: "HOLD", reason }) as unknown as ProgressionSuggestion;

describe("plain words", () => {
  it("finding 5: a first-time lift reads 'first time'", () => {
    expect(describeRecommendationLabel("NO_HISTORY")).toBe("first time");
  });

  it("finding 6: TRAIN's advice reasons read plainly; unknown ones show as written", () => {
    expect(describeProgressionAdvisory(hold("Incomplete evidence last time (fewer sets performed than prescribed, or one was skipped)."))).toBe(
      "Last time a set was skipped or short, so keep the same weight.",
    );
    expect(describeProgressionAdvisory(hold("Mixed weights across sets last time — not clean evidence either way."))).toBe(
      "Last time the weight changed between sets, so keep it the same.",
    );
    expect(describeProgressionAdvisory(hold("Something new."))).toBe("Something new.");
  });

  it("finding 8: the decision panel uses the plain capacity words and selection reason", () => {
    expect(describeTraceValue("no severe or constrained condition")).toBe("nothing in your check-in needs care");
    expect(describeTraceValue("GREEN")).toBe("GREEN");
    expect(describeTraceValue(true)).toBe("Yes");
    expect(describeSelectionReason("No higher-priority rule matched.")).toBe("Nothing else needed attention first.");
    expect(describeSelectionReason("RED capacity → STABILIZE.")).toBe("RED capacity → STABILIZE.");
  });
});
