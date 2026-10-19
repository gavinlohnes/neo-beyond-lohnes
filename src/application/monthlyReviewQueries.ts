import { getDaySummaries } from "./dayLedgerQueries";
import { getBodyweightEntries } from "./queries";
import { getMeasurements } from "./measurementQueries";
import { getProgressPhotos } from "./progressPhotoQueries";
import { getWeeklyReviewRecords } from "./weeklyReviewQueries";
import { projectReviewRows, type ReviewWeight } from "../engine/reviewOverview";
import {
  isMonthlyReviewWeek, measurementChanges, monthlyWindow, MONTHLY_WINDOW_DAYS, photoComparisons, weeksUntilMonthly, windowWeightChange,
} from "../engine/monthlyReview";
import { MEASUREMENT_SITES, PHOTO_POSES } from "../domain/body/types";
import type { ReviewWeek, WeeklyReviewRecord } from "../domain/review/types";

/** Local calendar date (YYYY-MM-DD), the unit measurements and photos are dated in. */
function calendarDate(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
}

/** The first week anyone saved a review for: the monthly count starts there. */
export function firstReviewedWeekStart(records: readonly WeeklyReviewRecord[]): string | null {
  return records.reduce<string | null>((first, record) => (first === null || record.weekStart < first ? record.weekStart : first), null);
}

/** A cheap read for the TODAY line and the review header: is this week the monthly one? */
export async function getMonthlyCadence(week: ReviewWeek) {
  const first = firstReviewedWeekStart(await getWeeklyReviewRecords());
  return { monthly: isMonthlyReviewWeek(week, first), weeksUntil: weeksUntilMonthly(week, first) };
}

/**
 * REVIEW-001 monthly review: body composition over the 28 lived days ending
 * with the reviewed week. Read only, from the existing BODY queries; facts and
 * differences only, missing stays missing. Not a monthly week → no body read.
 */
export async function getMonthlyReview(week: ReviewWeek) {
  const cadence = await getMonthlyCadence(week);
  if (!cadence.monthly) return { ...cadence, body: null };
  const window = monthlyWindow(week);
  const from = Date.parse(window.start), to = Date.parse(window.end);
  const fromDate = calendarDate(new Date(window.start));
  const toDate = calendarDate(new Date(to - 86_400_000));

  const summaries = await getDaySummaries();
  const inWindow = summaries.filter((day) => day.endedAt !== undefined && Date.parse(day.livedDayStart) >= from && Date.parse(day.livedDayStart) < to);
  const weights: ReviewWeight[] = (await Promise.all(inWindow.map(async (day) =>
    (await getBodyweightEntries(day.beyondDayId)).map((entry) => ({ dayId: day.beyondDayId, lbs: entry.effectiveWeightLbs, at: entry.recordedAt, rootId: entry.rootEventId })),
  ))).flat();
  const rows = projectReviewRows(summaries, weights, new Date(window.start), MONTHLY_WINDOW_DAYS);
  const [measurements, photos] = await Promise.all([getMeasurements(), getProgressPhotos()]);

  return {
    ...cadence,
    body: {
      window, fromDate, toDate,
      weight: windowWeightChange(rows, window),
      measurements: measurementChanges(measurements, fromDate, toDate, MEASUREMENT_SITES),
      photos: photoComparisons(photos, fromDate, toDate, PHOTO_POSES),
    },
  };
}
export type MonthlyReview = Awaited<ReturnType<typeof getMonthlyReview>>;
