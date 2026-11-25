import { db } from "../persistence/db";
import type { DomainEvent, StateCheckIn } from "../domain/common/types";
import { projectHabitAnswers, type Habit, type HabitAnswer } from "../domain/habits";
import type { Period } from "../domain/health/activityImport";
import { restingByPeriod } from "../domain/health/measuredSeries";
import { finishedLivedDays, livedDayBoundary } from "../engine/livedDaySeries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { projectReviewRows } from "../engine/reviewOverview";
import { getDaySummaries } from "./dayLedgerQueries";
import { getActiveHabits } from "./habitQueries";
import { getEffectiveCheckIns } from "./queries";
import { diffVerdict, meanDiffInterval, type DiffVerdict } from "./tryExperiment";
import { attachPictureCheckIns } from "./wholePictureProjection";
import type { WhatMovesWindow } from "../persistence/whatMovesPreference";

export {
  DEFAULT_WHAT_MOVES_PREFERENCE, getWhatMovesPreference, setWhatMovesPreference,
  type WhatMovesPreference, type WhatMovesWindow,
} from "../persistence/whatMovesPreference";

/**
 * GRAYSON-WHAT-MOVES-001 (Gavin, 2026-11-24): what lines up with his next-day sleep, energy and resting heart rate.
 * Each active habit (DONE days against NOT DONE days; days with no answer sit on neither side), training days against
 * the rest, and work days against days off, each compared with the next lived day (16:30 to 16:30, DST-safe) by the
 * same Welch 95% interval as Try experiments. A line needs 5 days a side with the measure recorded. Missing is
 * missing, never zero. Read only: nothing here feeds Delta, Weekly, TODAY, a recommendation or the Engine, and it
 * says what lines up, never a cause.
 *
 * Gavin, 2026-11-24 ("Same projections"): Whole Picture holds 56 days, so this reads the same pure projections it
 * uses (projectReviewRows, attachPictureCheckIns, restingByPeriod) over the chosen window. Whole Picture is unchanged.
 */

export type WhatMovesMeasure = "SLEEP" | "ENERGY" | "RESTING";
export type CauseKind = "HABIT" | "TRAINED" | "WORK";
export interface Cause { id: string; kind: CauseKind; name: string }

/** One finished lived day: what he did, and the next lived day's numbers. */
export interface WhatMovesDay {
  start: string;
  habits: Record<string, "DONE" | "NOT_DONE">;
  trained: boolean;
  context: "WORK" | "OFF" | "UNKNOWN";
  next: { sleepMinutes?: number; energy?: number; resting?: number };
}

export const MIN_DAYS_A_SIDE = 5;
/** What counts as "about the same": 15 minutes of sleep, half a point of energy, 2 bpm. */
export const SAME_BAND: Record<WhatMovesMeasure, number> = { SLEEP: 15, ENERGY: 0.5, RESTING: 2 };
const MEASURES: readonly WhatMovesMeasure[] = ["SLEEP", "ENERGY", "RESTING"];

export interface WhatMovesLine {
  /** cause id and measure: what Hide remembers. */
  id: string;
  cause: Cause;
  measure: WhatMovesMeasure;
  verdict: DiffVerdict;
  /** Days on the "with" side (did it, trained, work) and the other side. */
  nWith: number;
  nWithout: number;
  meanWith: number;
  meanWithout: number;
  diff: number;
  lo: number;
  hi: number;
}

export interface WhatMoves {
  window: WhatMovesWindow;
  days: number;
  /** A clear direction, most certain first. */
  clear: WhatMovesLine[];
  same: WhatMovesLine[];
  unsure: WhatMovesLine[];
  hidden: WhatMovesLine[];
}

interface Row { start: string; dayIds: string[]; context: "WORK" | "OFF" | "UNKNOWN"; sessions: number; sleepHours?: number | undefined; energy?: number | undefined; resting?: number | undefined }

/**
 * Pure: the next-day join. Each row's next lived day is the one starting at its own end (DST-safe), never just the
 * next row recorded: after a gap the next-day values are missing. Habit answers are merged across the lived day's
 * BEYOND days; UNRECORDED is no answer.
 */
export function whatMovesDayFacts(rows: readonly Row[], habitAnswersByDay: ReadonlyMap<string, ReadonlyMap<string, HabitAnswer>>): WhatMovesDay[] {
  const byStart = new Map(rows.map((r) => [Date.parse(r.start), r]));
  return rows.map((row) => {
    const next = byStart.get(livedDayBoundary(new Date(row.start), -1).getTime());
    const habits: Record<string, "DONE" | "NOT_DONE"> = {};
    for (const dayId of row.dayIds) {
      for (const [habitId, answer] of habitAnswersByDay.get(dayId) ?? []) {
        if (answer === "DONE" || answer === "NOT_DONE") habits[habitId] = answer;
        else delete habits[habitId];
      }
    }
    const nextValues: WhatMovesDay["next"] = {};
    if (next?.sleepHours !== undefined && Number.isFinite(next.sleepHours)) nextValues.sleepMinutes = next.sleepHours * 60;
    if (next?.energy !== undefined && Number.isFinite(next.energy)) nextValues.energy = next.energy;
    if (next?.resting !== undefined && Number.isFinite(next.resting)) nextValues.resting = next.resting;
    return { start: row.start, habits, trained: row.sessions > 0, context: row.context, next: nextValues };
  });
}

const valueOf = (day: WhatMovesDay, measure: WhatMovesMeasure) =>
  measure === "SLEEP" ? day.next.sleepMinutes : measure === "ENERGY" ? day.next.energy : day.next.resting;

/** Which side of a cause a day is on: true (with), false (without) or null (neither). */
function sideOf(day: WhatMovesDay, cause: Cause): boolean | null {
  if (cause.kind === "TRAINED") return day.trained;
  if (cause.kind === "WORK") return day.context === "UNKNOWN" ? null : day.context === "WORK";
  const answer = day.habits[cause.id.slice("habit:".length)];
  return answer === undefined ? null : answer === "DONE";
}

/** The first lived day inside the window ending at `now`'s lived day; null for All. */
export function windowStart(now: Date, window: WhatMovesWindow): Date | null {
  return window === "ALL" ? null : finishedLivedDays(now, 0, window).from;
}

/** Pure: every comparison with at least 5 days a side, sorted into clear, same and can't tell; hidden kept apart. */
export function compareCauses(days: readonly WhatMovesDay[], options: {
  now: Date; window: WhatMovesWindow; habits: readonly Pick<Habit, "id" | "name">[]; hidden?: readonly string[];
}): WhatMoves {
  const from = windowStart(options.now, options.window);
  const current = mostRecentBoundaryAtOrBefore(options.now).getTime();
  const inWindow = days.filter((d) => Date.parse(d.start) < current && (!from || Date.parse(d.start) >= from.getTime()));
  const causes: Cause[] = [
    ...options.habits.map((h) => ({ id: `habit:${h.id}`, kind: "HABIT" as const, name: h.name })),
    { id: "trained", kind: "TRAINED", name: "Trained" },
    { id: "work", kind: "WORK", name: "Work day" },
  ];
  const hidden = new Set(options.hidden ?? []);
  const result: WhatMoves = { window: options.window, days: inWindow.length, clear: [], same: [], unsure: [], hidden: [] };
  for (const cause of causes) {
    for (const measure of MEASURES) {
      const withValues: number[] = [], withoutValues: number[] = [];
      for (const day of inWindow) {
        const side = sideOf(day, cause), value = valueOf(day, measure);
        if (side === null || value === undefined) continue;
        (side ? withValues : withoutValues).push(value);
      }
      if (withValues.length < MIN_DAYS_A_SIDE || withoutValues.length < MIN_DAYS_A_SIDE) continue;
      const interval = meanDiffInterval(withValues, withoutValues);
      if (!interval) continue;
      const verdict = diffVerdict(interval.diff, interval.lo, interval.hi, SAME_BAND[measure]);
      const line: WhatMovesLine = {
        id: `${cause.id}|${measure}`, cause, measure, verdict, nWith: interval.nA, nWithout: interval.nB,
        meanWith: interval.meanA, meanWithout: interval.meanB, diff: interval.diff, lo: interval.lo, hi: interval.hi,
      };
      if (hidden.has(line.id)) result.hidden.push(line);
      else if (verdict === "up" || verdict === "down") result.clear.push(line);
      else if (verdict === "same") result.same.push(line);
      else result.unsure.push(line);
    }
  }
  // Most certain first: the narrowest interval for its measure's band.
  const width = (l: WhatMovesLine) => (l.hi - l.lo) / SAME_BAND[l.measure];
  result.clear.sort((a, b) => width(a) - width(b));
  result.same.sort((a, b) => width(a) - width(b));
  return result;
}

/** How many lived days the window reads, plus the current one (for the last finished day's next day). */
function windowDays(now: Date, window: WhatMovesWindow, earliest: string | undefined): number {
  if (window !== "ALL") return window;
  if (!earliest) return 1;
  const current = mostRecentBoundaryAtOrBefore(now);
  const first = mostRecentBoundaryAtOrBefore(new Date(earliest)).getTime();
  let count = 0;
  for (let at = current; at.getTime() > first && count < 3660; at = livedDayBoundary(at, 1)) count += 1;
  return Math.max(1, count);
}

/** Read only: the joined days for the window (with the current day only as the last day's "next"), and his habits. */
export async function getWhatMovesDays(now: Date, window: WhatMovesWindow): Promise<{ days: WhatMovesDay[]; habits: Habit[] }> {
  const [summaries, checkIns, resting, habits, habitEvents] = await Promise.all([
    getDaySummaries(), getEffectiveCheckIns(), db.externalRestingHeartRates.toArray(), getActiveHabits(),
    db.events.where("type").equals("HABIT_SET").toArray(),
  ]);
  const earliest = summaries.map((s) => s.livedDayStart).sort()[0];
  const count = windowDays(now, window, earliest);
  // `count` finished days and the current one, whose numbers are the last finished day's "next day".
  const span = finishedLivedDays(now, -1, count + 1);
  const rows = attachPictureCheckIns(projectReviewRows(summaries, [], span.from, count + 1), checkIns as StateCheckIn[]);
  const periods: Period[] = rows.map((row) => ({ from: Date.parse(row.start), to: livedDayBoundary(new Date(row.start), -1).getTime(), dayId: row.dayIds[0] ?? null }));
  const restingValues = restingByPeriod(periods, resting, now.getTime());
  const withResting = rows.map((row, i) => ({ ...row, resting: restingValues[i]!.value ?? undefined }));
  const byDay = new Map<string, DomainEvent[]>();
  for (const e of habitEvents as DomainEvent[]) if (e.beyondDayId) byDay.set(e.beyondDayId, [...(byDay.get(e.beyondDayId) ?? []), e]);
  const answers = new Map([...byDay].map(([dayId, events]) => [dayId, projectHabitAnswers(events)]));
  return { days: whatMovesDayFacts(withResting, answers), habits };
}

/** Read only: the comparisons for the chosen window. */
export async function getWhatMoves(now: Date, window: WhatMovesWindow, hidden: readonly string[] = []): Promise<WhatMoves> {
  const { days, habits } = await getWhatMovesDays(now, window);
  return compareCauses(days, { now, window, habits, hidden });
}
