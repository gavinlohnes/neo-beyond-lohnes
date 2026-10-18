import { describe, expect, it } from "vitest";
import { CONTEXT_FLOOR_DAYS, reviewWeekBack, weekHeadline, weekPattern, weekWeightChange } from "../../src/engine/weeklyDashboard";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import type { ReviewRow } from "../../src/engine/reviewOverview";

/** REVIEW-001 Weekly Review dashboard: pure weekly arithmetic, counts only, missing stays missing. */

function row(day: number, fields: Partial<ReviewRow> = {}): ReviewRow {
  return {
    start: new Date(2026, 9, day, 16, 30).toISOString(),
    dayIds: [`d${day}`],
    context: "UNKNOWN",
    weights: [],
    ambiguousSleep: false,
    sessions: 0,
    ...fields,
  };
}

describe("reviewWeekBack", () => {
  it("steps back whole Monday–Sunday lived-day weeks from the latest closed week", () => {
    const now = new Date(2026, 9, 19, 20);
    expect(reviewWeekBack(now, 0)).toEqual(latestReviewWeek(now));
    const earlier = reviewWeekBack(now, 1);
    expect(new Date(earlier.start)).toEqual(new Date(2026, 9, 5, 16, 30));
    expect(new Date(earlier.end)).toEqual(new Date(2026, 9, 12, 16, 30));
  });

  it("keeps 16:30 boundaries across the November DST change", () => {
    const week = reviewWeekBack(new Date(2026, 10, 9, 20), 0);
    expect(new Date(week.start).getHours()).toBe(16);
    expect(new Date(week.end).getHours()).toBe(16);
  });
});

describe("weekWeightChange", () => {
  it("needs two weighed days and reports first to last recorded day", () => {
    expect(weekWeightChange([row(12, { weight: 200 })])).toBeUndefined();
    const change = weekWeightChange([row(12, { weight: 201 }), row(13), row(15, { weight: 199.5 })]);
    expect(change).toMatchObject({ firstLbs: 201, lastLbs: 199.5, change: -1.5 });
  });
});

describe("weekHeadline", () => {
  it("averages only recorded days and abstains on a context below the floor", () => {
    const rows = [
      row(12, { context: "WORK", sleepHours: 6, protein: 100, sessions: 1 }),
      row(13, { context: "WORK", sleepHours: 5 }),
      row(14, { context: "OFF", sleepHours: 8, water: 40 }),
      row(15, { context: "OFF", sleepHours: 8 }),
      row(16, { context: "OFF", sleepHours: 7, sessions: 1 }),
      row(17, { dayIds: [] }),
    ];
    const headline = weekHeadline(rows);
    expect(headline.recordedDays).toBe(5);
    expect(headline.sleep).toMatchObject({ days: 5, mean: 6.8 });
    expect(headline.sleep.work).toEqual({ days: 2, mean: undefined });
    expect(headline.sleep.off).toMatchObject({ days: CONTEXT_FLOOR_DAYS, mean: 23 / 3 });
    expect(headline.protein).toEqual({ days: 1, mean: 100 });
    expect(headline.water).toEqual({ days: 1, mean: 40 });
    expect(headline).toMatchObject({ sessions: 2, trainingDays: 2, weight: undefined });
  });
});

describe("weekPattern", () => {
  it("ALL uses every recorded day; WORK/OFF use declared context with the floor", () => {
    const rows = [
      row(12, { context: "WORK", protein: 120 }),
      row(13, { context: "WORK", protein: 140 }),
      row(14, { context: "WORK", protein: 130 }),
      row(15, { context: "OFF", protein: 160 }),
      row(16, { context: "UNKNOWN", protein: 999 }),
    ];
    expect(weekPattern(rows, "ALL")).toMatchObject({ days: 5, protein: { days: 5 } });
    expect(weekPattern(rows, "WORK")).toMatchObject({ days: 3, protein: { days: 3, mean: 130 } });
    expect(weekPattern(rows, "OFF")).toMatchObject({ days: 1, protein: { days: 1, mean: undefined } });
  });
});
