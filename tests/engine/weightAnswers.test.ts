import { describe, expect, it } from "vitest";
import { dailySwing, weeklyRate, weighInTiming } from "../../src/engine/weightAnswers";
import type { ReviewRow } from "../../src/engine/reviewOverview";

const row = (day: number, weight?: number): ReviewRow => ({ start: new Date(2026, 9, day, 16, 30).toISOString(), dayIds: [String(day)], context: "OFF", weights: [], ambiguousSleep: false, sessions: 0, ...(weight !== undefined ? { weight } : {}) });

describe("weight answers", () => {
  it("states the change between weekly means as lb and % of bodyweight per week", () => {
    const rate = weeklyRate({ change: -1.5, previousMean: 200 })!;
    expect(rate.lbPerWeek).toBe(-1.5);
    expect(rate.percentPerWeek).toBeCloseTo(-0.75, 6);
    expect(weeklyRate({ change: undefined, previousMean: 200 })).toBeUndefined();
  });
  it("takes the median swing of consecutive weighed days only, with a floor", () => {
    const rows = [row(1, 200), row(2, 201), row(3), row(4, 199), row(5, 199.5), row(6, 198.5), row(7, 199), row(8, 197)];
    // Pairs: 1→2 (1), 4→5 (.5), 5→6 (1), 6→7 (.5), 7→8 (2); day 3 breaks 2→4.
    expect(dailySwing(rows)).toEqual({ pairs: 5, median: 1 });
    expect(dailySwing(rows.slice(0, 5))).toEqual({ pairs: 2, median: undefined });
  });
  it("counts weigh-ins logged after that day's main-sleep log", () => {
    const at = (h: number) => new Date(2026, 9, 10, h).toISOString();
    expect(weighInTiming([
      { weighIns: [at(14)], mainSleepLoggedAt: at(13) },
      { weighIns: [at(9), at(15)], mainSleepLoggedAt: at(12) },
      { weighIns: [at(10)] },
    ])).toEqual({ weighIns: 4, afterSleep: 2 });
  });
});
