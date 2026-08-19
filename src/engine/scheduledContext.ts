/**
 * Work schedule / predictive context (Decision Register, "WORK SCHEDULE /
 * CONTEXT — SUPERSEDING REFINEMENT", 2026-08-19 authority reconciliation;
 * Path doc CHECKPOINT 6). Doctrine: PREDICTION IS NOT FACT — this module
 * only derives a SUGGESTED schedule phase from the approved Week A/B
 * pattern and current time. It never reads or writes persisted state and
 * never creates a historical work fact; that boundary is enforced by the
 * application layer (application/commands.ts's setWorkContext is the only
 * thing allowed to change BeyondDay.workContext, and only on explicit
 * confirmation).
 *
 * Locked schedule rule (Context & Safety Decisions, 2026-08-19):
 * Monday-Sunday weeks. Week A (work): Mon/Tue/Fri/Sat/Sun. Week B (work):
 * Wed/Thu only. Alternates every 7 days. Anchor: the week of
 * Mon Aug 17 2026 - Sun Aug 23 2026 is Week A. Shift hours 18:00-06:00,
 * crossing midnight.
 */

export type ScheduleWeek = "A" | "B";
export type SchedulePhase = "PRE_WORK" | "SCHEDULED_SHIFT" | "EXPECTED_POST_WORK" | "OFF";

export interface ScheduledContext {
  week: ScheduleWeek;
  todayIsScheduledWorkDay: boolean;
  phase: SchedulePhase;
}

// Local midnight of the anchor Monday. Deliberately built with the local
// Date constructor (not Date.UTC / an ISO string) — every computation in
// this module uses local wall-clock arithmetic consistently, so results
// are correct regardless of which timezone the process actually runs in.
const ANCHOR_MONDAY = new Date(2026, 7, 17);

const WEEK_A_WORKDAYS = new Set([1, 2, 5, 6, 0]); // Mon, Tue, Fri, Sat, Sun
const WEEK_B_WORKDAYS = new Set([3, 4]); // Wed, Thu

const SHIFT_START_HOUR = 18;
const SHIFT_END_HOUR = 6;

/**
 * How long "just got off work" (EXPECTED_POST_WORK) lasts before it's
 * treated as ordinary off time (or PRE_WORK, if today is also a work
 * day) — NOT a value specified by the locked schedule rule itself, which
 * only fixes the 18:00-06:00 shift window. Noon is a reasonable
 * implementation default for "the rest of the morning after a night
 * shift"; revisit if real use suggests otherwise.
 */
const POST_WORK_TAIL_HOUR = 12;

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

function weekOf(date: Date): ScheduleWeek {
  const weeksSinceAnchor = Math.round(
    (mondayOf(date).getTime() - ANCHOR_MONDAY.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const parity = ((weeksSinceAnchor % 2) + 2) % 2;
  return parity === 0 ? "A" : "B";
}

function isWorkDay(date: Date): boolean {
  const workdays = weekOf(date) === "A" ? WEEK_A_WORKDAYS : WEEK_B_WORKDAYS;
  return workdays.has(date.getDay());
}

function at(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
}

/** Pure: same `now` always derives the same context. Never touches persistence. */
export function deriveScheduledContext(now: Date): ScheduledContext {
  const today = midnightOf(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayIsWorkDay = isWorkDay(today);
  const yesterdayIsWorkDay = isWorkDay(yesterday);

  const yesterdayShiftStart = at(yesterday, SHIFT_START_HOUR);
  const yesterdayShiftEnd = at(today, SHIFT_END_HOUR);
  const todayShiftStart = at(today, SHIFT_START_HOUR);
  const todayShiftEnd = at(tomorrow, SHIFT_END_HOUR);
  const postWorkTailEnd = at(today, POST_WORK_TAIL_HOUR);

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

  return { week: weekOf(today), todayIsScheduledWorkDay: todayIsWorkDay, phase };
}
