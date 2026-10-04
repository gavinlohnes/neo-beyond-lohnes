import { db } from "../persistence/db";
import {
  describeMilestone,
  formatShortDate,
  getBodyweightHistory,
  projectGoalDate,
  trendDirection,
  type WeighIn,
} from "./bodyTrendQueries";
import { getNutritionTargets } from "./nutritionTargetQueries";
import { describePersonalRecord, getAllRecords, type RecordCard } from "./personalRecordQueries";

/**
 * BODY-TIMELINE-001 (owner brief 2026-10-04): the transformation timeline in
 * BODY. Read only: weigh-ins over the last 90 days with events pinned on
 * them. Every label is the wording its source screen already uses: PRs as
 * the finish summary words them, weight milestones from describeMilestone,
 * the goal line from the weight trend, and clean days as a running count
 * (never a streak, so nothing resets). Nothing is stored.
 */
export type TimelineEventKind = "PR" | "CLEAN_DAY_MILESTONE" | "WEIGHT_MILESTONE" | "GOAL";

export interface TimelineEvent {
  kind: TimelineEventKind;
  /** ISO time the event happened (for GOAL, the projected date). */
  date: string;
  label: string;
}

export interface Timeline {
  windowStart: string;
  windowEnd: string;
  weighIns: WeighIn[];
  events: TimelineEvent[];
  goalWeightLbs?: number;
}

export const TIMELINE_DAYS = 90;
export const CLEAN_DAY_MILESTONES = [7, 30, 60, 90, 180, 365] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

interface TimelineInputs {
  history: readonly WeighIn[];
  goalWeightLbs: number | undefined;
  records: readonly RecordCard[];
  /** Start time of each clean day, one per day, any order. */
  cleanDayStarts: readonly string[];
  now: Date;
}

/** Pure: the timeline for the 90 days ending now. */
export function buildTimeline({ history, goalWeightLbs, records, cleanDayStarts, now }: TimelineInputs): Timeline {
  const end = now.getTime();
  const start = end - TIMELINE_DAYS * DAY_MS;
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start && t <= end;
  };
  const events: TimelineEvent[] = [];

  for (const r of records) {
    events.push({ kind: "PR", date: r.recordedAt, label: `${r.exerciseName}: ${describePersonalRecord(r.record).replace("NEW PR — ", "")}` });
  }

  const cleanSorted = [...cleanDayStarts].sort();
  for (const n of CLEAN_DAY_MILESTONES) {
    const reached = cleanSorted[n - 1];
    if (reached) events.push({ kind: "CLEAN_DAY_MILESTONE", date: reached, label: `${n} clean days` });
  }

  // A weight milestone each time the running total first reaches a new 5-lb step, worded exactly
  // as the weight trend words it at that weigh-in.
  const direction = trendDirection(history, goalWeightLbs);
  let lastStep = 0;
  for (let i = 1; i < history.length; i++) {
    const label = describeMilestone(history.slice(0, i + 1), direction);
    const step = label ? Number(/(\d+) lb/.exec(label)?.[1] ?? 0) : 0;
    if (label && step > lastStep) {
      events.push({ kind: "WEIGHT_MILESTONE", date: history[i]!.recordedAt, label });
      lastStep = step;
    }
  }

  const shownEvents = events.filter((e) => inWindow(e.date));
  const projection = projectGoalDate(history, goalWeightLbs);
  if (projection.kind === "DATE") {
    shownEvents.push({
      kind: "GOAL",
      date: projection.date.toISOString(),
      label: `Goal ${goalWeightLbs} lb — at this pace, about ${formatShortDate(projection.date)}`,
    });
  }
  shownEvents.sort((a, b) => a.date.localeCompare(b.date));

  return {
    windowStart: new Date(start).toISOString(),
    windowEnd: new Date(end).toISOString(),
    weighIns: history.filter((w) => inWindow(w.recordedAt)),
    events: shownEvents,
    ...(goalWeightLbs !== undefined ? { goalWeightLbs } : {}),
  };
}

/** The timeline from live data. */
export async function getTimeline(now: Date = new Date()): Promise<Timeline> {
  const [history, targets, records, cleanEvents] = await Promise.all([
    getBodyweightHistory(),
    getNutritionTargets(),
    getAllRecords(),
    db.events.where("type").equals("CLEAN_DAY_LOGGED").toArray(),
  ]);
  // Same counting as the quit tracker: one clean day per BeyondDay, dated by when that day began.
  const dayIds = [...new Set(cleanEvents.flatMap((e) => (e.beyondDayId ? [e.beyondDayId] : [])))];
  const days = await db.beyondDays.bulkGet(dayIds);
  const cleanDayStarts = days.flatMap((d) => (d ? [d.startedAt] : []));
  return buildTimeline({ history, goalWeightLbs: targets.goalWeightLbs, records, cleanDayStarts, now });
}
