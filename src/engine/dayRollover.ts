/**
 * DAY-ROLLOVER-001 (direct owner mission + doctrine-override ruling,
 * 2026-09-21): BeyondDay's boundary becomes 16:30 local time, automatic.
 * Pure boundary math only — no I/O, no persistence import, same posture
 * as engine/scheduledContext.ts. application/commands.ts's
 * performDueDayRollover is the one caller that turns this into an actual
 * close-and-reopen.
 *
 * DST safety: every boundary candidate is constructed from local calendar
 * components (`new Date(y, m, d, 16, 30, 0, 0)`), then compared purely via
 * epoch milliseconds (`.getTime()`) — never by adding a fixed millisecond
 * offset to a previous instant. A 23- or 25-hour local day (a DST
 * transition) never enters this arithmetic at all, so it needs no special
 * case, the same reasoning engine/obligationRelevance.ts's daysBetween
 * documents for calendar-day differences.
 */

export const DAY_ROLLOVER_HOUR = 16;
export const DAY_ROLLOVER_MINUTE = 30;

function boundaryOnCalendarDateOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
}

/** The most recent 16:30 local-time instant at or before `now`. */
function mostRecentBoundaryAtOrBefore(now: Date): Date {
  const todaysBoundary = boundaryOnCalendarDateOf(now);
  if (todaysBoundary.getTime() <= now.getTime()) return todaysBoundary;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return boundaryOnCalendarDateOf(yesterday);
}

/**
 * Pure: the same (dayStartedAt, now) pair always derives the same result.
 * Returns the boundary instant a rollover is due at, or null if the
 * currently active day (started at dayStartedAt) hasn't crossed a 16:30
 * boundary yet.
 *
 * Always returns at most the single most recent elapsed boundary, never a
 * list of every boundary missed while the app was closed — an unattended
 * stretch across several 16:30s collapses to one rollover representing
 * "now," never several fabricated empty historical days.
 *
 * A day that itself started exactly at a boundary instant (e.g. one just
 * created by a rollover) is not immediately due again: the strict `>`
 * below requires a boundary strictly after dayStartedAt, not merely
 * at-or-after it.
 */
export function computeDueRollover(dayStartedAt: Date, now: Date): Date | null {
  const boundary = mostRecentBoundaryAtOrBefore(now);
  if (boundary.getTime() > dayStartedAt.getTime()) return boundary;
  return null;
}

/**
 * Sleep/Day-Ownership Model doctrine ("lived days, not calendar days")
 * exists specifically so an overnight shift worker's PRIMARY sleep still
 * correctly closes out one lived day. An automatic 16:30 rollover can now
 * beat that PRIMARY sleep log to the punch — the operator falls asleep
 * before 16:30, the boundary passes while they're still asleep, and their
 * eventual PRIMARY sleep log lands on the NEW (rollover-created) day
 * instead of the one it was really meant to close. Never guessed/silently
 * resolved either way (which lived day it "really" belongs to is a real
 * ambiguity this module cannot know) — only flagged, via an AdvisoryNote
 * (engine/advisory.ts's composeAdvisoryNoteFromDayRolloverAmbiguity).
 *
 * Pure: same input facts always derive the same result. The facts
 * themselves (was this day rollover-created; is a PRIMARY sleep logged on
 * it) are supplied already-computed by application/queries.ts, same
 * "engine never derives its own current-state facts" discipline every
 * other advisory producer follows.
 */
export interface DayRolloverAmbiguityInput {
  dayWasRolloverCreated: boolean;
  hasPrimarySleepLogged: boolean;
}

export interface DayRolloverAmbiguity {
  readonly kind: "PRIMARY_SLEEP_ON_ROLLOVER_DAY";
}

export function evaluateDayRolloverAmbiguity(input: DayRolloverAmbiguityInput): DayRolloverAmbiguity | null {
  if (input.dayWasRolloverCreated && input.hasPrimarySleepLogged) {
    return { kind: "PRIMARY_SLEEP_ON_ROLLOVER_DAY" };
  }
  return null;
}
