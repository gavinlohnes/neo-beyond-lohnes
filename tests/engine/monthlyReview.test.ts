import { describe, expect, it } from "vitest";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { isMonthlyReviewWeek, measurementChanges, monthlyWindow, photoComparisons, weeksBetween, weeksUntilMonthly, windowWeightChange } from "../../src/engine/monthlyReview";
import type { ReviewRow } from "../../src/engine/reviewOverview";

const weekAt = (date: Date) => latestReviewWeek(date);
const row = (start: Date, weight?: number): ReviewRow => ({ start: start.toISOString(), dayIds: [start.toISOString()], context: "OFF", weights: [], ambiguousSleep: false, sessions: 0, ...(weight !== undefined ? { weight } : {}) });

describe("monthly review cadence", () => {
  const first = weekAt(new Date(2026, 9, 19, 17)); // week of Oct 12–18, first saved review
  it("has no monthly review before any weekly review is saved", () => {
    expect(isMonthlyReviewWeek(first, null)).toBe(false);
    expect(weeksUntilMonthly(first, null)).toBeNull();
  });
  it("is monthly every 4th week counted from the first saved review, never the first week itself", () => {
    const results = [0, 1, 2, 3, 4, 5, 8, 12].map((n) => {
      const week = weekAt(new Date(2026, 9, 19 + n * 7, 17));
      return [n, isMonthlyReviewWeek(week, first.start), weeksUntilMonthly(week, first.start)];
    });
    expect(results).toEqual([[0, false, 4], [1, false, 3], [2, false, 2], [3, false, 1], [4, true, 0], [5, false, 3], [8, true, 0], [12, true, 0]]);
  });
  it("counts whole weeks across the November DST change", () => {
    const later = weekAt(new Date(2026, 10, 16, 17)); // spans Nov 1 fall-back
    expect(weeksBetween(first.start, later.start)).toBe(4);
    expect(isMonthlyReviewWeek(later, first.start)).toBe(true);
  });
  it("covers the 28 lived days ending with the reviewed week", () => {
    const week = weekAt(new Date(2026, 10, 16, 17));
    const window = monthlyWindow(week);
    expect(window.end).toBe(week.end);
    expect(new Date(window.start)).toEqual(new Date(2026, 9, 19, 16, 30)); // 28 lived days before Nov 16 16:30
  });
});

describe("monthly body composition", () => {
  const window = { start: new Date(2026, 9, 12, 16, 30).toISOString(), end: new Date(2026, 10, 9, 16, 30).toISOString() };
  it("reports weight first-to-last inside the window only, and needs two weighed days", () => {
    const rows = [row(new Date(2026, 9, 5, 16, 30), 200), row(new Date(2026, 9, 13, 16, 30), 198.4), row(new Date(2026, 9, 20, 16, 30)), row(new Date(2026, 10, 7, 16, 30), 196.2)];
    const change = windowWeightChange(rows, window);
    expect(change.days).toBe(2);
    expect(change.change).toBeCloseTo(-2.2, 5);
    expect(windowWeightChange(rows.slice(0, 2), window)).toEqual({ days: 1, change: undefined });
  });
  it("gives each measured site its first and last reading in the window, with no change from one reading", () => {
    const entries = [
      { site: "WAIST", inches: 36, measuredOn: "2026-10-01" },
      { site: "WAIST", inches: 35.5, measuredOn: "2026-10-14" },
      { site: "WAIST", inches: 34.75, measuredOn: "2026-11-08" },
      { site: "CHEST", inches: 42, measuredOn: "2026-10-20" },
    ];
    expect(measurementChanges(entries, "2026-10-12", "2026-11-08", ["WAIST", "CHEST", "HIPS"])).toEqual([
      { site: "WAIST", count: 2, first: entries[1], last: entries[2], change: -0.75 },
      { site: "CHEST", count: 1, first: entries[3], last: entries[3], change: undefined },
    ]);
  });
  it("pairs same-pose photos inside the window, falls back to the latest before it, and skips hidden ones", () => {
    const photos = [
      { id: "f0", pose: "FRONT", takenOn: "2026-09-30" },
      { id: "f1", pose: "FRONT", takenOn: "2026-10-20" },
      { id: "s0", pose: "SIDE", takenOn: "2026-10-01" },
      { id: "s1", pose: "SIDE", takenOn: "2026-10-15" },
      { id: "s2", pose: "SIDE", takenOn: "2026-11-01" },
      { id: "b1", pose: "BACK", takenOn: "2026-10-25" },
      { id: "x", pose: "FRONT", takenOn: "2026-11-05", hiddenAt: "2026-11-06T00:00:00.000Z" },
    ];
    const pairs = photoComparisons(photos, "2026-10-12", "2026-11-08", ["FRONT", "SIDE", "BACK"]);
    expect(pairs.map((pair) => [pair.pose, pair.earlier.id, pair.later.id])).toEqual([["FRONT", "f0", "f1"], ["SIDE", "s1", "s2"]]);
  });
});
