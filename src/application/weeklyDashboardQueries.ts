import { db } from "../persistence/db";
import { getDaySummaries } from "./dayLedgerQueries";
import { getBodyweightEntries, getSchedulePattern } from "./queries";
import { getUndoneSetIds } from "./trainQueries";
import { getAllRecords, type RecordCard } from "./personalRecordQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";
import { findWeekReview, getWeeklyReviewRecords } from "./weeklyReviewQueries";
import { projectReviewRows, type ReviewRow, type ReviewWeight } from "../engine/reviewOverview";
import { reviewWeekBack, weekHeadline, type WeekHeadline } from "../engine/weeklyDashboard";
import { projectFindings, type FindingsResult } from "../engine/findings";
import type { PerformedSet } from "../domain/workout/types";
import type { ReviewWeek, WeeklyReviewRecord } from "../domain/review/types";

/**
 * REVIEW-001 Weekly Review dashboard (owner-approved 2026-10-18; Claude Code):
 * one closed Monday–Sunday week, read the same way as the question hub — the
 * same lived-day rows, effective (corrected) weigh-ins, records and findings.
 * Read only: nothing is written and nothing reaches the Engine's evaluation.
 */
export interface WeeklyDashboard {
  week: ReviewWeek;
  weeksBack: number;
  /** Whether an earlier week holds any recorded day, so PREVIOUS has somewhere to go. */
  hasEarlier: boolean;
  rows: ReviewRow[];
  headline: WeekHeadline;
  /** Personal records set during the week, in the order they were set. */
  records: RecordCard[];
  /** The existing read-only findings, as they stood when the week closed. */
  findings: FindingsResult & { exerciseNames: Record<string, string> };
  /** The saved review for this week, if any. */
  saved?: WeeklyReviewRecord | undefined;
}

export async function getWeeklyDashboard(weeksBack: number, now: Date = new Date()): Promise<WeeklyDashboard> {
  const week = reviewWeekBack(now, weeksBack);
  const from = Date.parse(week.start);
  const to = Date.parse(week.end);
  const inWeek = (iso: string) => {
    const t = Date.parse(iso);
    return t >= from && t < to;
  };

  const summaries = await getDaySummaries();
  const weekDays = summaries.filter((day) => day.endedAt !== undefined && inWeek(day.livedDayStart));
  const weights: ReviewWeight[] = (
    await Promise.all(
      weekDays.map(async (day) =>
        (await getBodyweightEntries(day.beyondDayId)).map((entry) => ({
          dayId: day.beyondDayId,
          lbs: entry.effectiveWeightLbs,
          at: entry.recordedAt,
          rootId: entry.rootEventId,
        })),
      ),
    )
  ).flat();
  const rows = projectReviewRows(summaries, weights, new Date(week.start), 7);

  const [allRecords, undone, setRows, names, schedule, reviews] = await Promise.all([
    getAllRecords(),
    getUndoneSetIds(),
    db.performedSets.toArray(),
    getExerciseNames(),
    getSchedulePattern(),
    getWeeklyReviewRecords(),
  ]);
  const records = allRecords.filter((record) => inWeek(record.recordedAt)).reverse();
  const sets = (setRows as unknown as PerformedSet[]).filter((set) => !undone.has(set.id));
  const findings = projectFindings({ summaries, sets, schedule, now: new Date(week.end) });
  const exerciseNames: Record<string, string> = {};
  for (const finding of findings.findings) {
    if (finding.kind === "STALL" || finding.kind === "EXERCISE_STORY") exerciseNames[finding.exerciseId] = names[finding.exerciseId] ?? finding.exerciseId;
  }

  return {
    week,
    weeksBack: Math.max(0, weeksBack),
    hasEarlier: summaries.some((day) => Date.parse(day.livedDayStart) < from),
    rows,
    headline: weekHeadline(rows),
    records,
    findings: { ...findings, exerciseNames },
    saved: findWeekReview(reviews, week),
  };
}
