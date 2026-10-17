import { describe, expect, it } from "vitest";
import { latestReviewWeek, rowsForReviewWeek, summarizeReviewWeek, weeklyFocusOptions, countWeeklyFocus } from "../../src/engine/weeklyReview";
import type { ReviewRow } from "../../src/engine/reviewOverview";
function row(start: Date, overrides: Partial<ReviewRow> = {}): ReviewRow {
  return { start: start.toISOString(), dayIds: [start.toISOString()], context: "OFF", weights: [], ambiguousSleep: false, sessions: 0, ...overrides };
}
describe("weekly review calendar and focus counts", () => {
  it("does not offer Sunday's unfinished lived day before Monday16:30; flips exactly at the boundary", () => {
    const before = latestReviewWeek(new Date(2026, 9, 19, 16, 29, 59));
    expect(new Date(before.start)).toEqual(new Date(2026, 9, 5, 16, 30));
    const after = latestReviewWeek(new Date(2026, 9, 19, 16, 30));
    expect(new Date(after.start)).toEqual(new Date(2026, 9, 12, 16, 30));
    expect(new Date(after.end)).toEqual(new Date(2026, 9, 19, 16, 30));
  });
  it.each([new Date(2026, 2, 9, 16, 30), new Date(2026, 10, 2, 16, 30)])("uses local calendar weeks through DST (%s)", (now) => {
    const week = latestReviewWeek(now);
    expect(new Date(week.start).getDay()).toBe(1);
    expect(new Date(week.start).getHours()).toBe(16);
    expect(new Date(week.end).getHours()).toBe(16);
    expect(new Date(week.start).getMinutes()).toBe(30);
    expect(Math.abs((Date.parse(week.end) - Date.parse(week.start)) / 3_600_000 - 168)).toBeLessThanOrEqual(1);
  });
  it("includes Sunday-started lived days, excludes the next Monday and never fills missing data", () => {
    const week = latestReviewWeek(new Date(2026, 9, 19, 20));
    const rows = rowsForReviewWeek([
      row(new Date(2026, 9, 18, 16, 30), { protein: 0 }),
      row(new Date(2026, 9, 19, 16, 30), { protein: 100 }),
    ], week);
    expect(rows).toHaveLength(1);
    expect(summarizeReviewWeek(rows)).toMatchObject({ proteinDays: 1, proteinMean: 0, weightDays: 0, weightMean: undefined });
  });
  it("offers only options that restate recorded counts, and never judges a written focus", () => {
    const rows = [row(new Date(2026, 9, 12, 16, 30), { weight: 180, protein: 30, sessions: 2 })];
    expect(weeklyFocusOptions(rows).map((focus) => "target" in focus && focus.target)).toEqual([1, 1, 2]);
    expect(countWeeklyFocus({ kind: "WEIGHT_DAYS", target: 5, text: "Log weight on 5 days" }, rows)).toBe(1);
    expect(countWeeklyFocus({ kind: "CUSTOM", text: "Spend time outside" }, rows)).toBeUndefined();
    expect(weeklyFocusOptions([])).toEqual([]);
  });
});
