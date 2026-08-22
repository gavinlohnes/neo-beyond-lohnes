import type { SchedulePattern } from "../domain/common/types";

/**
 * Work schedule / predictive context (Decision Register, "WORK SCHEDULE /
 * CONTEXT — SUPERSEDING REFINEMENT", 2026-08-19 authority reconciliation;
 * Path doc CHECKPOINT 6). Doctrine: PREDICTION IS NOT FACT — this module
 * only derives a SUGGESTED schedule phase from a SchedulePattern and the
 * current time. It never reads or writes persisted state and never
 * creates a historical work fact; that boundary is enforced by the
 * application layer (application/commands.ts's setWorkContext is the only
 * thing allowed to change BeyondDay.workContext, and only on explicit
 * confirmation).
 *
 * Drop 02a (Daily Intelligence / Context, first slice): this module used
 * to own the Week A/B pattern as hardcoded constants. It now takes a
 * SchedulePattern as an explicit argument instead — persistence retrieves
 * configuration (application/queries.ts's getSchedulePattern), this
 * engine module interprets it. deriveScheduledContext remains pure: same
 * (now, pattern) always derives the same context, no I/O, no module-level
 * mutable state.
 *
 * DEFAULT_SCHEDULE_PATTERN below is the exact production schedule this
 * module used to hardcode (Context & Safety Decisions, 2026-08-19: Monday-
 * Sunday weeks, Week A works Mon/Tue/Fri/Sat/Sun, Week B works Wed/Thu
 * only, alternating every 7 days, anchored so the week of Mon Aug 17 2026
 * is Week A, shift 18:00-06:00). It is the Dexie v4 migration seed (so an
 * upgrading install predicts identically before and after) and the
 * fallback when no valid pattern is stored.
 */

export type ScheduleWeek = "A" | "B";
export type SchedulePhase = "PRE_WORK" | "SCHEDULED_SHIFT" | "EXPECTED_POST_WORK" | "OFF";

export interface ScheduledContext {
  week: ScheduleWeek;
  todayIsScheduledWorkDay: boolean;
  phase: SchedulePhase;
}

export const DEFAULT_SCHEDULE_PATTERN: SchedulePattern = {
  id: "current",
  anchorMonday: "2026-08-17",
  weeks: [
    { workdays: [1, 2, 5, 6, 0] }, // Week A: Mon, Tue, Fri, Sat, Sun
    { workdays: [3, 4] }, // Week B: Wed, Thu
  ],
  shiftStartHour: 18,
  shiftEndHour: 6,
  // Was a fixed POST_WORK_TAIL_HOUR=12 (noon) constant; with a 6:00 shift
  // end that's a 6-hour tail. Expressed as a duration now so it stays
  // correct for any configured shift end time, not just 06:00.
  postWorkTailHours: 6,
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt: "2026-08-17T00:00:00.000Z",
};

function midnightOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOf(date: Date): Date {
  const d = midnightOf(date);
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/** Exported for engine/obligationRelevance.ts — same "local calendar date, no timezone conversion" need. */
export function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * UI helper (Drop 02a editor): the schedule editor asks "which week is
 * active right now?" rather than exposing anchorMonday directly, per
 * Decision Register/R&D guidance to keep the internal rotation anchor out
 * of user-facing language. Given today and which week index the user says
 * is active this week, derives the anchorMonday string that makes that
 * true. Any valid anchor works here (doesn't need to be the earliest
 * possible one) since only the offset from `today` matters to
 * deriveScheduledContext's modulo arithmetic.
 */
export function anchorMondayForCurrentWeek(today: Date, activeWeekIndex: number): string {
  const monday = mondayOf(today);
  monday.setDate(monday.getDate() - activeWeekIndex * 7);
  return formatLocalDate(monday);
}

// anchorMonday is stored as a local calendar date (YYYY-MM-DD) — parsed
// with the local Date constructor, matching how every other date in this
// module is built, so this stays correct regardless of which timezone the
// process runs in (never Date.parse's UTC-ish ISO interpretation).
function parseAnchorMonday(anchorMonday: string): Date {
  const parts = anchorMonday.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function weekIndexOf(date: Date, pattern: SchedulePattern): number {
  const cycleLength = pattern.weeks.length;
  const anchor = midnightOf(parseAnchorMonday(pattern.anchorMonday));
  const weeksSinceAnchor = Math.round(
    (mondayOf(date).getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return ((weeksSinceAnchor % cycleLength) + cycleLength) % cycleLength;
}

function weekOf(date: Date, pattern: SchedulePattern): ScheduleWeek {
  // 02a's editor only ever writes a 2-entry cycle; A/B labels only cover
  // that case. A future longer rotation would need a richer label, not a
  // storage change — see SchedulePattern's doc comment.
  return weekIndexOf(date, pattern) === 0 ? "A" : "B";
}

function isWorkDay(date: Date, pattern: SchedulePattern): boolean {
  const index = weekIndexOf(date, pattern);
  const week = pattern.weeks[index] ?? pattern.weeks[0] ?? { workdays: [] };
  return week.workdays.includes(date.getDay());
}

function at(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Shift end instant for a shift starting on `shiftStartDay`. Crosses
 * midnight (lands on the following day) whenever the configured end hour
 * is not strictly after the start hour — covers both the production
 * overnight shift (18:00-06:00) and an ordinary same-day shift (e.g.
 * 09:00-17:00) with the same formula.
 */
function shiftEndFor(shiftStartDay: Date, pattern: SchedulePattern): Date {
  const crossesMidnight = pattern.shiftEndHour <= pattern.shiftStartHour;
  const endDay = new Date(shiftStartDay);
  if (crossesMidnight) endDay.setDate(endDay.getDate() + 1);
  return at(endDay, pattern.shiftEndHour);
}

/** Pure: same (now, pattern) always derives the same context. Never touches persistence. */
export function deriveScheduledContext(now: Date, pattern: SchedulePattern): ScheduledContext {
  const today = midnightOf(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayIsWorkDay = isWorkDay(today, pattern);
  const yesterdayIsWorkDay = isWorkDay(yesterday, pattern);

  const yesterdayShiftStart = at(yesterday, pattern.shiftStartHour);
  const yesterdayShiftEnd = shiftEndFor(yesterday, pattern);
  const todayShiftStart = at(today, pattern.shiftStartHour);
  const todayShiftEnd = shiftEndFor(today, pattern);
  // Tied to YESTERDAY's shift end specifically, matching the only shift
  // shape 02a's editor actually configures (overnight, so "just got off
  // work" always means this morning). A same-day shift's own tail
  // (afternoon, after today's shift ends) isn't distinctly modeled — it
  // falls through to OFF below rather than EXPECTED_POST_WORK, a graceful
  // simplification rather than a wrong answer, since no real schedule
  // uses same-day hours yet. Revisit if that changes.
  const postWorkTailEnd = addHours(yesterdayShiftEnd, pattern.postWorkTailHours);

  let phase: SchedulePhase;
  if (yesterdayIsWorkDay && now >= yesterdayShiftStart && now < yesterdayShiftEnd) {
    phase = "SCHEDULED_SHIFT";
  } else if (todayIsWorkDay && now >= todayShiftStart && now < todayShiftEnd) {
    phase = "SCHEDULED_SHIFT";
  } else if (yesterdayIsWorkDay && now < postWorkTailEnd) {
    phase = "EXPECTED_POST_WORK";
  } else if (todayIsWorkDay && now < todayShiftStart) {
    phase = "PRE_WORK";
  } else {
    phase = "OFF";
  }

  return { week: weekOf(today, pattern), todayIsScheduledWorkDay: todayIsWorkDay, phase };
}
