import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import { logMeasurement } from "../../src/application/measurementCommands";
import { getMonthlyCadence, getMonthlyReview } from "../../src/application/monthlyReviewQueries";
import { latestReviewWeek } from "../../src/engine/weeklyReview";

/** REVIEW-001 monthly review: cadence from the first saved weekly review; body composition read only. */
function clock(at: Date) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at); }
afterEach(() => vi.useRealTimers());

async function saveReview(at: Date) {
  clock(at);
  const week = latestReviewWeek(at);
  return saveWeeklyReview({ weekStart: week.start, weekEnd: week.end, note: "Week noted", focus: null, expectedPreviousId: null });
}
async function weighedDay(start: Date, lbs: number) {
  clock(start);
  const day = await startDay();
  await logBodyweight(day.id, lbs);
  clock(new Date(start.getTime() + 60 * 60_000));
  await endDay(day.id);
}

it("has no monthly review until a weekly review exists, then every 4th week from it", async () => {
  clock(new Date(2026, 9, 19, 20));
  expect(await getMonthlyCadence(latestReviewWeek(new Date()))).toEqual({ monthly: false, weeksUntil: null });
  await startDay();
  await saveReview(new Date(2026, 9, 19, 20)); // reviews Oct 12–18
  for (const [weeks, monthly, until] of [[1, false, 3], [3, false, 1], [4, true, 0], [8, true, 0]] as const) {
    const week = latestReviewWeek(new Date(2026, 9, 19 + weeks * 7, 20));
    expect(await getMonthlyCadence(week)).toEqual({ monthly, weeksUntil: until });
  }
});

it("reads body composition for the 28 lived days ending with the monthly week, writing nothing", async () => {
  clock(new Date(2026, 9, 19, 20));
  const reviewDay = await startDay();
  await saveReview(new Date(2026, 9, 19, 20));
  clock(new Date(2026, 9, 19, 21));
  await endDay(reviewDay.id);
  await weighedDay(new Date(2026, 9, 10, 18), 201); // before the window
  await weighedDay(new Date(2026, 9, 20, 18), 199.5);
  await weighedDay(new Date(2026, 10, 14, 18), 197.25);
  clock(new Date(2026, 10, 16, 20));
  await logMeasurement({ site: "WAIST", inches: 36, measuredOn: "2026-10-05" });
  await logMeasurement({ site: "WAIST", inches: 35.5, measuredOn: "2026-10-21" });
  await logMeasurement({ site: "WAIST", inches: 35, measuredOn: "2026-11-15" });
  await logMeasurement({ site: "HIPS", inches: 40, measuredOn: "2026-11-01" });
  const before = await db.events.count();

  const review = await getMonthlyReview(latestReviewWeek(new Date()));
  expect(review.monthly).toBe(true);
  const body = review.body!;
  expect([body.fromDate, body.toDate]).toEqual(["2026-10-19", "2026-11-15"]);
  expect(body.weight.days).toBe(2);
  expect(body.weight.change).toBeCloseTo(-2.25, 5);
  expect(body.measurements.map((entry) => [entry.site, entry.count, entry.change])).toEqual([["WAIST", 2, -0.5], ["HIPS", 1, undefined]]);
  expect(body.photos).toEqual([]);
  expect(await db.events.count()).toBe(before);
});

it("does no body read on a weekly (non-monthly) week", async () => {
  clock(new Date(2026, 9, 19, 20));
  await startDay();
  await saveReview(new Date(2026, 9, 19, 20));
  const review = await getMonthlyReview(latestReviewWeek(new Date(2026, 9, 26, 20)));
  expect(review).toEqual({ monthly: false, weeksUntil: 3, body: null });
});
