import { describe, expect, it } from "vitest";
import { estimateSessionMinutes, type TimeFitSession } from "../../src/engine/timeFit";

/** Drop 2 — Time-Fit: a display-only duration estimate from finished sessions. */
const session = (templateId: string, sessionType: string, status: string, day: number, minutes: number): TimeFitSession => {
  const start = new Date(2026, 9, day, 7, 0);
  return { templateId, sessionType, status, startedAt: start.toISOString(), endedAt: new Date(start.getTime() + minutes * 60_000).toISOString() };
};

describe("estimateSessionMinutes", () => {
  it("needs 3 completed sessions of that exact template + variant", () => {
    const two = [session("B", "STANDARD", "COMPLETED", 1, 45), session("B", "STANDARD", "COMPLETED", 2, 50)];
    expect(estimateSessionMinutes(two, "B", "STANDARD")).toBeUndefined();
    const withOthers = [
      ...two,
      session("B", "REDUCED", "COMPLETED", 3, 20),
      session("C", "STANDARD", "COMPLETED", 4, 60),
      session("B", "STANDARD", "PARTIAL", 5, 30),
      session("B", "STANDARD", "ABANDONED", 6, 2),
    ];
    expect(estimateSessionMinutes(withOthers, "B", "STANDARD")).toBeUndefined();
  });

  it("is the median of the most recent 5, rounded to whole minutes", () => {
    const sessions = [
      session("B", "STANDARD", "COMPLETED", 1, 120), // oldest — outside the recent 5
      session("B", "STANDARD", "COMPLETED", 2, 44),
      session("B", "STANDARD", "COMPLETED", 3, 48),
      session("B", "STANDARD", "COMPLETED", 4, 90), // one long session doesn't drag the median
      session("B", "STANDARD", "COMPLETED", 5, 47.6),
      session("B", "STANDARD", "COMPLETED", 6, 50),
    ];
    expect(estimateSessionMinutes(sessions, "B", "STANDARD")).toBe(48);
  });

  it("averages the middle two for an even count", () => {
    const sessions = [44, 46, 50, 52].map((m, i) => session("A", "REDUCED", "COMPLETED", i + 1, m));
    expect(estimateSessionMinutes(sessions, "A", "REDUCED")).toBe(48);
  });

  it("skips a completed session with no end time", () => {
    const sessions = [
      session("A", "STANDARD", "COMPLETED", 1, 40),
      session("A", "STANDARD", "COMPLETED", 2, 42),
      { templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: new Date(2026, 9, 3).toISOString() },
    ];
    expect(estimateSessionMinutes(sessions, "A", "STANDARD")).toBeUndefined();
  });
});
