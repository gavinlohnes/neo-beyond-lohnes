import type { ReviewWeek } from "../domain/review/types";
import type { ReviewRow } from "./reviewOverview";
import { livedDayBoundary } from "./livedDaySeries";

/**
 * REVIEW-001 Phase 1a — the monthly review (approved plan): every 4th Monday,
 * counted from the first completed weekly review, the week's review becomes
 * the monthly one and adds body composition over the last four weeks. Pure,
 * read only and never used by `evaluate`. Facts and differences only — no
 * score, verdict or inferred progress; missing stays missing.
 */
export const MONTHLY_EVERY_WEEKS = 4;
export const MONTHLY_WINDOW_DAYS = MONTHLY_EVERY_WEEKS * 7;

const WEEK_MS = 7 * 86_400_000;

/** Whole weeks between two lived-day week starts; rounding absorbs a DST hour. */
export function weeksBetween(fromWeekStart: string, toWeekStart: string): number {
  return Math.round((Date.parse(toWeekStart) - Date.parse(fromWeekStart)) / WEEK_MS);
}

/**
 * The first saved review's week counts as week 0; weeks 4, 8, 12… are monthly.
 * Before any weekly review is saved there is no count, so no monthly review.
 */
export function isMonthlyReviewWeek(week: ReviewWeek, firstReviewedWeekStart: string | null): boolean {
  if (!firstReviewedWeekStart) return false;
  const weeks = weeksBetween(firstReviewedWeekStart, week.start);
  return weeks > 0 && weeks % MONTHLY_EVERY_WEEKS === 0;
}

/** Weeks until the next monthly review after `week`, or null before the first saved review. */
export function weeksUntilMonthly(week: ReviewWeek, firstReviewedWeekStart: string | null): number | null {
  if (!firstReviewedWeekStart) return null;
  const weeks = Math.max(0, weeksBetween(firstReviewedWeekStart, week.start));
  const remainder = weeks % MONTHLY_EVERY_WEEKS;
  return weeks > 0 && remainder === 0 ? 0 : MONTHLY_EVERY_WEEKS - remainder;
}

/** The 28 lived days ending with the reviewed week. */
export function monthlyWindow(week: ReviewWeek): ReviewWeek {
  return { start: livedDayBoundary(new Date(week.end), MONTHLY_WINDOW_DAYS).toISOString(), end: week.end };
}

/** Weight from the window's first recorded weigh-in day to its last; needs two weighed days. */
export function windowWeightChange(rows: readonly ReviewRow[], window: ReviewWeek) {
  const start = Date.parse(window.start), end = Date.parse(window.end);
  const weighed = rows.filter((row) => row.weight !== undefined && Date.parse(row.start) >= start && Date.parse(row.start) < end)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (weighed.length < 2) return { days: weighed.length, change: undefined };
  const first = weighed[0]!, last = weighed.at(-1)!;
  return { days: weighed.length, firstDay: first.start, lastDay: last.start, first: first.weight!, last: last.weight!, change: last.weight! - first.weight! };
}

/** A calendar-dated measurement (YYYY-MM-DD) in the shape the BODY query returns. */
export interface DatedMeasurement { site: string; inches: number; measuredOn: string }

/**
 * Per site: the first and last measurement dated inside the window (inclusive
 * calendar dates). One measurement gives a reading but no change. Order follows
 * the caller's list, which is oldest measurement date first.
 */
export function measurementChanges<T extends DatedMeasurement>(entries: readonly T[], fromDate: string, toDate: string, sites: readonly string[]) {
  return sites.flatMap((site) => {
    const inside = entries.filter((entry) => entry.site === site && entry.measuredOn >= fromDate && entry.measuredOn <= toDate);
    if (!inside.length) return [];
    const first = inside[0]!, last = inside.at(-1)!;
    return [{ site, count: inside.length, first, last, change: inside.length > 1 ? Math.round((last.inches - first.inches) * 100) / 100 : undefined }];
  });
}

/** A visible, calendar-dated photo in the shape the BODY query returns. */
export interface DatedPhoto { id: string; pose: string; takenOn: string; hiddenAt?: string | undefined }

/**
 * Per pose: the latest visible photo dated inside the window, compared with the
 * earliest one inside it — or, when the window holds only one, the latest one
 * before it. No pair without two distinct photos. Never inferred progress.
 */
export function photoComparisons<T extends DatedPhoto>(photos: readonly T[], fromDate: string, toDate: string, poses: readonly string[]) {
  return poses.flatMap((pose) => {
    const visible = photos.filter((photo) => photo.pose === pose && !photo.hiddenAt).sort((a, b) => a.takenOn.localeCompare(b.takenOn));
    const inside = visible.filter((photo) => photo.takenOn >= fromDate && photo.takenOn <= toDate);
    const later = inside.at(-1);
    if (!later) return [];
    const earlier = inside.length > 1 ? inside[0]! : visible.filter((photo) => photo.takenOn < fromDate).at(-1);
    return earlier && earlier.id !== later.id ? [{ pose, earlier, later }] : [];
  });
}
