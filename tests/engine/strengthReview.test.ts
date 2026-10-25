import { describe, expect, it } from "vitest";
import { projectStrengthReview, type StrengthObservation } from "../../src/engine/strengthReview";

const now = new Date("2026-10-24T12:00:00.000Z");
const row = (exerciseId: string, sessionId: string, daysBack: number, weight: number, reps = 10, muscleGroup: StrengthObservation["muscleGroup"] = "Chest"): StrengthObservation => ({
  exerciseId, sessionId, at: new Date(now.getTime() - daysBack * 86_400_000).toISOString(), weight, reps, muscleGroup,
});

describe("REVIEW-001 strength projection", () => {
  it("abstains until the same lift has two sessions in each 28-day window", () => {
    const result = projectStrengthReview([row("press", "r1", 2, 110), row("press", "p1", 30, 100)], now);
    expect(result.lifts[0]).toMatchObject({ status: "BUILDING", recentSessions: 1, previousSessions: 1, changePercent: undefined });
    expect(result.overallChangePercent).toBeUndefined();
  });
  it("compares estimated-max evidence only within the same lift", () => {
    const result = projectStrengthReview([
      row("press", "r1", 2, 110), row("press", "r2", 12, 108), row("press", "p1", 30, 100), row("press", "p2", 40, 98),
      row("row", "rr1", 3, 90, 8, "Back"), row("row", "rr2", 13, 90, 8, "Back"), row("row", "rp1", 31, 90, 8, "Back"), row("row", "rp2", 41, 90, 8, "Back"),
    ], now);
    expect(result.lifts.find((lift) => lift.exerciseId === "press")?.status).toBe("IMPROVING");
    expect(result.lifts.find((lift) => lift.exerciseId === "row")?.status).toBe("STEADY");
    expect(result.comparableLifts).toBe(2); expect(result.overallChangePercent).toBeDefined();
  });
  it("counts recent valid working sets per week and ignores invalid/out-of-window evidence", () => {
    const result = projectStrengthReview([row("press", "a", 2, 100), row("press", "b", 3, 0), row("row", "c", 4, 80, 10, "Back"), row("old", "d", 60, 100)], now);
    expect(result.muscleSetsPerWeek).toEqual({ Chest: .25, Back: .25 });
    expect(result.balance).toEqual({ push: .25, pull: .25, upper: .5, lower: 0, unclassified: 0 });
  });
  it("keeps arms and unmapped work out of push/pull instead of inventing a split", () => {
    const result = projectStrengthReview([row("curl", "a", 2, 40, 10, "Arms"), row("leg", "b", 3, 100, 10, "Legs"), { sessionId: "c", exerciseId: "unknown", at: new Date(now.getTime() - 4 * 86_400_000).toISOString(), weight: 50, reps: 10 }], now);
    expect(result.balance).toEqual({ push: 0, pull: 0, upper: .25, lower: .25, unclassified: .75 });
  });
});
