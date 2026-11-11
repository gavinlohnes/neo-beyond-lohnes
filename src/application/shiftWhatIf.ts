import type { PictureRow } from "./wholePictureProjection";
import { groupRuns, RUN_MEAN_FLOOR } from "./rotationProjection";
import type { SchedulePattern } from "../domain/common/types";
import type { WorkoutTemplateId } from "../domain/workout/types";
import { formatLocalDate, livedDayShiftWindow } from "../engine/scheduledContext";
import { deriveWeekAhead, getWeekTasks, type WeekAheadDay, type WeekTasksDay } from "./weekAheadQueries";
import type { GoogleCalendarEvent } from "./googleCalendar";
import { getSchedulePattern } from "./queries";
import { suggestTemplateForNextWorkout } from "./trainQueries";
import { getWholePicture } from "./wholePictureQueries";

/**
 * BIG-IDEAS-001 item 1 — shift what-if (approved 2026-11-09). "What if my run is N shifts?" Look back at your own
 * complete work runs of exactly N recorded shifts (a run followed by recorded days off) and say what followed:
 * energy on the last shift, and main sleep on the first two days off, each with its day count. Silent under
 * RUN_MEAN_FLOOR comparable runs. A pattern from your records, never a prediction or advice. Read only.
 */
export interface WhatIfSide { mean: number | undefined; days: number }
export interface ShiftWhatIf { shifts: number; runs: number; lastShiftEnergy: WhatIfSide; offDay1Sleep: WhatIfSide; offDay2Sleep: WhatIfSide; enough: boolean }

const side = (values: (number | undefined)[]): WhatIfSide => {
  const v = values.filter((x): x is number => x !== undefined);
  return { mean: v.length >= RUN_MEAN_FLOOR ? v.reduce((a, b) => a + b, 0) / v.length : undefined, days: v.length };
};

export function shiftWhatIf(rows: readonly PictureRow[], shifts: number): ShiftWhatIf {
  const runs = groupRuns(rows);
  const matches = runs.flatMap((run, i) => {
    const before = runs[i - 1], next = runs[i + 1];
    // A run's length is known only with recorded days off on both sides. The first run may be clipped by the
    // start of the history window, and an unrecorded (UNKNOWN) day could hide more of the run (review of #475).
    return before?.context === "OFF" && run.context === "WORK" && run.rows.length === shifts && next?.context === "OFF" ? [{ run, off: next }] : [];
  });
  return {
    shifts,
    runs: matches.length,
    lastShiftEnergy: side(matches.map((m) => m.run.rows.at(-1)!.energy)),
    offDay1Sleep: side(matches.map((m) => m.off.rows[0]?.sleepHours)),
    offDay2Sleep: side(matches.map((m) => m.off.rows[1]?.sleepHours)),
    enough: matches.length >= RUN_MEAN_FLOOR,
  };
}

/**
 * SHIFT-WHAT-IF (Gavin, 2026-11-11: "Implement Shift What-If"). "What if this day were a shift / a day off?"
 * One day in the Week Ahead flips; everything else is the saved schedule. It says what moves: the days-off
 * stretch, the off-duty window around that day (the next sleep opportunity), Week Ahead's workout suggestions,
 * the commitments on that day, and what your own past runs of the new length looked like. Pure and read only:
 * it never saves, moves a commitment, changes the schedule or feeds the Engine.
 */
export type WorkOrOff = "WORK" | "OFF";
export interface WhatIfChange { date: string; to: WorkOrOff }
export interface WhatIfStretch { from: string; to: string; days: number; /** Runs past the 3-week horizon. */ open: boolean }
export interface WhatIfWindow { from: string | null; to: string | null; hours: number | null }
export interface WhatIfRun extends WhatIfStretch { /** Began before the horizon, so its length is a floor. */ clipped: boolean }
export interface WhatIfTrainingChange { date: string; before: WeekAheadDay["suggestedTemplate"]; beforeAfterShift: boolean; after: WeekAheadDay["suggestedTemplate"]; afterAfterShift: boolean }
export interface WhatIfCommitment { kind: "PLANNED" | "DUE" | "CALENDAR"; title: string; date: string; /** A timed calendar event that falls inside the shift this change adds or removes. */ duringShift: boolean }
export interface ShiftWhatIfImpact {
  change: WhatIfChange;
  from: WorkOrOff;
  /** The shift this change adds (picking up) or removes (dropping). */
  shift: { start: string; end: string };
  recovery: { before: WhatIfStretch | null; after: WhatIfStretch | null };
  sleepWindow: { before: WhatIfWindow; after: WhatIfWindow };
  run: { before: WhatIfRun | null; after: WhatIfRun | null };
  history: { before: ShiftWhatIf | null; after: ShiftWhatIf | null };
  training: WhatIfTrainingChange[];
  commitments: WhatIfCommitment[];
}

export interface ShiftWhatIfInput {
  now: Date;
  pattern: SchedulePattern;
  firstTemplate: WorkoutTemplateId;
  change: WhatIfChange;
  rows: readonly PictureRow[];
  tasks: readonly WeekTasksDay[];
  events: readonly GoogleCalendarEvent[];
}

const PAST = 14, AHEAD = 21;
const dateAt = (now: Date, offset: number, hour = 12, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
// The lived day for a date runs 16:30 → 16:30, as Week Ahead reads it (scheduledContext's rollover boundary).
const livedStart = (now: Date, offset: number) => dateAt(now, offset, 16, 30);

/**
 * The shift a picked-up day would hold, by the Engine's own overlap rule (livedDayShiftWindow): the day's own
 * usual shift if it overlaps the lived day (16:30 → next 16:30), otherwise the next date's.
 */
function usualShift(now: Date, offset: number, pattern: SchedulePattern): { start: Date; end: Date } {
  const shiftOn = (k: number) => {
    const start = dateAt(now, k, pattern.shiftStartHour);
    const end = dateAt(now, k + (pattern.shiftEndHour <= pattern.shiftStartHour ? 1 : 0), pattern.shiftEndHour);
    return { start, end };
  };
  const own = shiftOn(offset);
  return own.start < livedStart(now, offset + 1) && own.end > livedStart(now, offset) ? own : shiftOn(offset + 1);
}

interface Day { offset: number; date: string; work: WorkOrOff; shift: { start: Date; end: Date } | null }

function stretchAt(days: readonly Day[], index: number, kind: WorkOrOff): { first: number; last: number } | null {
  if (days[index]?.work !== kind) return null;
  let first = index, last = index;
  while (first > 0 && days[first - 1]!.work === kind) first--;
  while (last < days.length - 1 && days[last + 1]!.work === kind) last++;
  return { first, last };
}

function recoveryFrom(days: readonly Day[], index: number): WhatIfStretch | null {
  const start = days.findIndex((day, i) => i >= index && day.work === "OFF");
  const s = start === -1 ? null : stretchAt(days, start, "OFF");
  if (!s) return null;
  // The whole stretch, even when it began before the day.
  return { from: days[s.first]!.date, to: days[s.last]!.date, days: s.last - s.first + 1, open: s.last === days.length - 1 };
}

/** The work run on the day, or else the one just before it, or else the one just after it. */
function runAround(days: readonly Day[], index: number): WhatIfRun | null {
  const s = stretchAt(days, index, "WORK") ?? stretchAt(days, index - 1, "WORK") ?? stretchAt(days, index + 1, "WORK");
  if (!s) return null;
  return { from: days[s.first]!.date, to: days[s.last]!.date, days: s.last - s.first + 1, open: s.last === days.length - 1, clipped: s.first === 0 };
}

/** The off-duty window after the day's shift, or (on a day off) the one the day sits in. */
function windowAround(days: readonly Day[], index: number, now: Date): WhatIfWindow {
  const day = days[index]!;
  const at = day.shift ? day.shift.end.getTime() : livedStart(now, day.offset).getTime();
  const shifts = days.flatMap((d) => d.shift ? [d.shift] : []);
  const ends = shifts.map((s) => s.end.getTime()).filter((t) => t <= at);
  const starts = shifts.map((s) => s.start.getTime()).filter((t) => t >= at);
  const from = ends.length ? Math.max(...ends) : null, to = starts.length ? Math.min(...starts) : null;
  return { from: from === null ? null : new Date(from).toISOString(), to: to === null ? null : new Date(to).toISOString(), hours: from !== null && to !== null ? (to - from) / 3600000 : null };
}

export function deriveShiftWhatIf(input: ShiftWhatIfInput): ShiftWhatIfImpact | null {
  const { now, pattern, firstTemplate, change, rows, tasks, events } = input;
  const base: Day[] = [];
  for (let offset = -PAST; offset < AHEAD; offset++) {
    const lived = livedStart(now, offset);
    const shift = livedDayShiftWindow(lived, pattern);
    base.push({ offset, date: formatLocalDate(dateAt(now, offset)), work: shift ? "WORK" : "OFF", shift });
  }
  const index = base.findIndex((day) => day.date === change.date);
  // Only the seven Week Ahead days can be asked about, and only a real change.
  if (index < PAST || index >= PAST + 7 || base[index]!.work === change.to) return null;
  const changed = base.map((day, i) => i !== index ? day : { ...day, work: change.to, shift: change.to === "WORK" ? usualShift(now, day.offset, pattern) : null });
  const shift = (change.to === "WORK" ? changed : base)[index]!.shift!;

  const run = { before: runAround(base, index), after: runAround(changed, index) };
  const historyFor = (r: WhatIfRun | null) => r && !r.clipped && !r.open ? shiftWhatIf(rows, r.days) : null;

  const weekBefore = deriveWeekAhead(now, pattern, firstTemplate).days;
  const weekAfter = deriveWeekAhead(now, pattern, firstTemplate, { [change.date]: change.to }).days;
  const training = weekAfter.flatMap((after, i) => {
    const before = weekBefore[i]!;
    return before.suggestedTemplate === after.suggestedTemplate && before.afterShift === after.afterShift ? []
      : [{ date: after.date, before: before.suggestedTemplate, beforeAfterShift: before.afterShift, after: after.suggestedTemplate, afterAfterShift: after.afterShift }];
  });

  const nextDate = base[index + 1]!.date;
  // A timed event's day is its local date; an all-day event carries its date as written.
  const eventDate = (e: GoogleCalendarEvent) => e.allDay ? e.start.slice(0, 10) : formatLocalDate(new Date(e.start));
  const during = (e: GoogleCalendarEvent) => !e.allDay && Date.parse(e.start) < shift.end.getTime() && Date.parse(e.end) > shift.start.getTime();
  const day = tasks.find((t) => t.date === change.date);
  const commitments: WhatIfCommitment[] = [
    ...(day?.planned ?? []).map((o) => ({ kind: "PLANNED" as const, title: o.title, date: change.date, duringShift: false })),
    ...(day?.due ?? []).map((o) => ({ kind: "DUE" as const, title: o.title, date: change.date, duringShift: false })),
    ...events.filter((e) => eventDate(e) === change.date || (eventDate(e) === nextDate && during(e)))
      .map((e) => ({ kind: "CALENDAR" as const, title: e.title, date: eventDate(e), duringShift: during(e) })),
  ];

  return {
    change, from: base[index]!.work,
    shift: { start: shift.start.toISOString(), end: shift.end.toISOString() },
    recovery: { before: recoveryFrom(base, index), after: recoveryFrom(changed, index) },
    sleepWindow: { before: windowAround(base, index, now), after: windowAround(changed, index, now) },
    run, history: { before: historyFor(run.before), after: historyFor(run.after) },
    training, commitments,
  };
}

/** Loads the inputs for deriveShiftWhatIf. Calendar events come from the caller (the cached Google list). */
export async function getShiftWhatIf(change: WhatIfChange, events: readonly GoogleCalendarEvent[], now: Date = new Date()): Promise<ShiftWhatIfImpact | null> {
  const [pattern, firstTemplate, tasks, picture] = await Promise.all([getSchedulePattern(), suggestTemplateForNextWorkout(), getWeekTasks(now), getWholePicture(now)]);
  return deriveShiftWhatIf({ now, pattern, firstTemplate, change, rows: picture.rows, tasks, events });
}
