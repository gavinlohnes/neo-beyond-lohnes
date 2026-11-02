import { expect, it } from "vitest";
import { deriveWeekInNumbers } from "../../src/application/weeklyDebrief";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import type { ReviewRow } from "../../src/engine/reviewOverview";
const row = (changes: Partial<ReviewRow> = {}): ReviewRow => ({ start: "2026-10-26T16:30:00.000Z", dayIds: ["synthetic"], context: "OFF", weights: [], sessions: 0, ambiguousSleep: false, ...changes });
it("closes Monday through Sunday at Monday 16:30, including the boundary", () => {
  const before = latestReviewWeek(new Date(2026, 10, 2, 16, 29));
  const after = latestReviewWeek(new Date(2026, 10, 2, 16, 30));
  expect(new Date(before.end).getDate()).toBe(26);
  expect(new Date(after.end).getDate()).toBe(2);
  expect(new Date(after.start).getDay()).toBe(1);
  expect(new Date(after.start).getHours()).toBe(16);
  expect(new Date(after.start).getMinutes()).toBe(30);
});
it("splits main sleep by recorded work/off context without assigning unknown days", () => {
  const result = deriveWeekInNumbers([row({ context: "WORK", sleepHours: 6 }), row({ sleepHours: 8 }), row({ context: "UNKNOWN", sleepHours: 10 })], []);
  expect(result.workSleep).toEqual({ average: 6, days: 1 });
  expect(result.offSleep).toEqual({ average: 8, days: 1 });
  expect(result.sleep).toEqual({ average: 8, days: 3 });
});
it("does not fill missing logs with zero and keeps a recorded zero", () => {
  const result = deriveWeekInNumbers([row(), row({ calories: 0 }), row({ calories: 1800, protein: 100, water: 64 })], []);
  expect(result.calories).toEqual({ average: 900, days: 2 });
  expect(result.protein).toEqual({ average: 100, days: 1 });
  expect(result.water).toEqual({ average: 64, days: 1 });
  expect(result.sleep).toEqual({ average: null, days: 0 });
  expect(result.comparison).toContain("Not enough logged data");
});
it("reports the largest comparable proportional change with evidence counts and no advice", () => {
  const result = deriveWeekInNumbers([row({ sleepHours: 8, water: 60 })], [row({ sleepHours: 4, water: 50 })]);
  expect(result.comparison).toContain("main sleep was 8.0 h on 1 day");
  expect(result.comparison).toContain("4.0 h on 1 day the week before");
  expect(result.comparison).not.toMatch(/should|better|worse|score|grade/);
});
