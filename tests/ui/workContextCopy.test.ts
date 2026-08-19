import { describe, expect, it } from "vitest";
import { describeSchedulePrediction } from "../../src/ui/screens/today/workContextCopy";
import type { ScheduledContext } from "../../src/engine/scheduledContext";

describe("describeSchedulePrediction", () => {
  it("describes a predicted work day, mid-shift", () => {
    const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "SCHEDULED_SHIFT" };
    expect(describeSchedulePrediction(ctx)).toBe(
      "Your schedule (Week A) predicts a work day today — right now looks like during your scheduled shift. This is a prediction, not a fact, until you confirm.",
    );
  });

  it("describes a predicted day off", () => {
    const ctx: ScheduledContext = { week: "B", todayIsScheduledWorkDay: false, phase: "OFF" };
    expect(describeSchedulePrediction(ctx)).toBe(
      "Your schedule (Week B) predicts a day off today — right now looks like off hours. This is a prediction, not a fact, until you confirm.",
    );
  });

  it("always frames the schedule as a prediction, never a fact, regardless of phase", () => {
    const phases: ScheduledContext["phase"][] = ["PRE_WORK", "SCHEDULED_SHIFT", "EXPECTED_POST_WORK", "OFF"];
    for (const phase of phases) {
      const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase };
      expect(describeSchedulePrediction(ctx)).toContain("This is a prediction, not a fact, until you confirm.");
    }
  });
});
