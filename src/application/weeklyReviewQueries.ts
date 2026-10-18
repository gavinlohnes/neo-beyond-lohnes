import { z } from "zod";
import { db } from "../persistence/db";
import { getReviewOverview } from "./reviewOverviewQueries";
import { byTimeThenSeq } from "./queries";
import { latestReviewWeek, rowsForReviewWeek, summarizeReviewWeek, weeklyFocusOptions, countWeeklyFocus } from "../engine/weeklyReview";
import type { ReviewWeek, WeeklyReviewRecord } from "../domain/review/types";

const text = z.string().trim().max(1000);
export const weeklyFocusSchema = z.union([
  z.object({ kind: z.enum(["WEIGHT_DAYS", "PROTEIN_DAYS"]), target: z.number().int().min(1).max(7), text: text.min(1) }),
  z.object({ kind: z.literal("TRAINING_SESSIONS"), target: z.number().int().min(1).max(14), text: text.min(1) }),
  z.object({ kind: z.literal("CUSTOM"), text: text.min(1) }),
]);
export const weeklyReviewPayloadSchema = z.object({
  weekStart: z.string().datetime(), weekEnd: z.string().datetime(), note: z.string().trim().max(4000),
  focus: weeklyFocusSchema.nullable(), supersedes: z.string().min(1).optional(),
}).refine((payload) => {
  const hours = (Date.parse(payload.weekEnd) - Date.parse(payload.weekStart)) / 3_600_000;
  return hours >= 166 && hours <= 170;
}, "A review must cover one calendar week.");
export async function getWeeklyReviewRecords(): Promise<WeeklyReviewRecord[]> {
  const events = await db.events.where("type").equals("WEEKLY_REVIEW_SAVED").toArray();
  return events.sort((a, b) => byTimeThenSeq(b.recordedAt, b.seq, a.recordedAt, a.seq) || a.id.localeCompare(b.id)).map((event) => {
    const parsed = weeklyReviewPayloadSchema.safeParse(event.payload);
    if (!parsed.success) throw new Error("A saved weekly review could not be read. Your records have not been changed.");
    const { supersedes, ...payload } = parsed.data;
    return { ...payload, ...(supersedes ? { supersedes } : {}), id: event.id, recordedAt: event.recordedAt, ...(event.seq !== undefined ? { seq: event.seq } : {}) };
  });
}
export function findWeekReview(records: readonly WeeklyReviewRecord[], week: ReviewWeek) {
  return records.find((record) => record.weekStart === week.start && record.weekEnd === week.end);
}
/** A cheap readiness read: no full-history ledger calculation on TODAY. */
export async function getWeeklyReviewReadiness(now = new Date()) {
  const week = latestReviewWeek(now);
  const [records, days] = await Promise.all([getWeeklyReviewRecords(), db.beyondDays.where("startedAt").between(week.start, week.end, true, false).toArray()]);
  return { week, saved: findWeekReview(records, week), ready: !findWeekReview(records, week) && days.some((day) => day.status === "ENDED") };
}
export async function getWeeklyReviewState(now = new Date()) {
  const week = latestReviewWeek(now);
  const [overview, records] = await Promise.all([getReviewOverview(now), getWeeklyReviewRecords()]);
  const rows = rowsForReviewWeek(overview.rows, week);
  const previous = records.find((record) => record.weekEnd === week.start);
  const summary = summarizeReviewWeek(rows);
  return { week, rows, summary, saved: findWeekReview(records, week), options: weeklyFocusOptions(rows),
    previousFocus: previous?.focus ?? null,
    previousFocusCount: previous?.focus ? countWeeklyFocus(previous.focus, rows) : undefined,
    history: records.filter((record, index) => records.findIndex((other) => other.weekStart === record.weekStart) === index),
  };
}
export type WeeklyReviewState = Awaited<ReturnType<typeof getWeeklyReviewState>>;
