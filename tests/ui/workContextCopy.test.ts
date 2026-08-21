import { describe, expect, it } from "vitest";
import {
  describeContextStrip,
  describeSchedulePrediction,
  resolveWorkContextSource,
} from "../../src/ui/screens/today/workContextCopy";
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

describe("resolveWorkContextSource", () => {
  it("is SCHEDULE_SUGGESTION_ACCEPTED when the answer agrees with a predicted work day", () => {
    expect(resolveWorkContextSource(true, "WORK")).toBe("SCHEDULE_SUGGESTION_ACCEPTED");
  });

  it("is SCHEDULE_SUGGESTION_ACCEPTED when the answer agrees with a predicted day off", () => {
    expect(resolveWorkContextSource(false, "OFF")).toBe("SCHEDULE_SUGGESTION_ACCEPTED");
  });

  it("is MANUAL when the answer overrides a predicted work day with OFF", () => {
    expect(resolveWorkContextSource(true, "OFF")).toBe("MANUAL");
  });

  it("is MANUAL when the answer overrides a predicted day off with WORK", () => {
    expect(resolveWorkContextSource(false, "WORK")).toBe("MANUAL");
  });
});

describe("describeContextStrip — Priority 3 (Daily Intelligence follow-on)", () => {
  it("confirmed WORK with a resolved phase, no unresolved post-shift fact", () => {
    const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "SCHEDULED_SHIFT" };
    expect(describeContextStrip("WORK", ctx, false)).toBe("Working today — during your scheduled shift");
  });

  it("confirmed WORK with an unresolved post-shift fact preempts the generic phase label", () => {
    const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "EXPECTED_POST_WORK" };
    expect(describeContextStrip("WORK", ctx, true)).toBe("Working today — shift ended, not yet shifted down");
  });

  it("a work-ended fact that has since been cleared by SHIFT_DOWN_COMPLETED reverts to the generic phase label", () => {
    // hasUnresolvedPostShift is false once cleared, even though a
    // WORK_PERIOD_ENDED fact exists somewhere in history — this function
    // only ever receives the already-resolved boolean, never the raw fact.
    const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "EXPECTED_POST_WORK" };
    expect(describeContextStrip("WORK", ctx, false)).toBe("Working today — just after your shift");
  });

  it("confirmed WORK with no scheduledContext yet falls back to the plain fact", () => {
    expect(describeContextStrip("WORK", null, false)).toBe("Working today");
  });

  it("confirmed OFF ignores any predicted phase — manual fact beats prediction", () => {
    const ctx: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "SCHEDULED_SHIFT" };
    expect(describeContextStrip("OFF", ctx, false)).toBe("Off today");
  });

  it("UNKNOWN with a schedule available states the prediction explicitly, never as fact", () => {
    const ctx: ScheduledContext = { week: "B", todayIsScheduledWorkDay: false, phase: "OFF" };
    expect(describeContextStrip("UNKNOWN", ctx, false)).toBe(
      "Not confirmed yet — schedule predicts a day off (off hours)",
    );
  });

  it("UNKNOWN with no scheduledContext at all", () => {
    expect(describeContextStrip("UNKNOWN", null, false)).toBe("Context not set yet");
  });
});
