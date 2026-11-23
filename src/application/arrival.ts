import { db } from "../persistence/db";
import type { Routine } from "../domain/routines";
import { getRoutineTicks, getRoutines, stepKey } from "./routineCommands";
import { getShiftHandoffState, type ShiftHandoffNote } from "./shiftHandoffQueries";

/**
 * GRAYSON C2.1 · Arrival in two taps (Gavin, 2026-11-23: "1, yes 2 yes"). PREFLIGHT, the existing pre-shift moment,
 * gains two lines: the note he left himself at the end of the last shift, and the one BEFORE SHIFT routine step
 * that's easiest to forget. STARTED WORK then marks work started and that note read in one tap.
 *
 * ROUTINES-001 stays true on screen: no counts, no "missed", no streak. Recent skips are read only to choose which
 * single step to show (Gavin's ruling on C2.1), and the step is shown by its own words alone.
 */

/** How far back "lately" reaches: the last 14 lived days. */
export const FORGET_WINDOW_DAYS = 14;
/** A step must have been passed over at least this many times to be worth naming. */
export const FORGET_MIN_SKIPS = 2;

export interface ForgetItem { routineId: string; stepId: string; text: string }
export interface Arrival { handoff: ShiftHandoffNote | null; forget: ForgetItem | null }

/**
 * Pure. The BEFORE SHIFT step he passed over most on days he did that routine (at least one of its steps ticked),
 * if it was passed over at least FORGET_MIN_SKIPS times; ties go to the routine's own order. Days he didn't do the
 * routine at all don't count, so not using routines never produces a reminder.
 */
export function easyToForget(routines: readonly Routine[], ticksByDay: readonly ReadonlySet<string>[]): ForgetItem | null {
  let best: { item: ForgetItem; skips: number } | null = null;
  for (const routine of routines) {
    if (routine.status !== "ACTIVE" || routine.moment !== "BEFORE_SHIFT") continue;
    const days = ticksByDay.filter((ticks) => routine.steps.some((s) => ticks.has(stepKey(routine.id, s.id))));
    for (const step of routine.steps) {
      const skips = days.filter((ticks) => !ticks.has(stepKey(routine.id, step.id))).length;
      if (skips >= FORGET_MIN_SKIPS && (!best || skips > best.skips)) best = { item: { routineId: routine.id, stepId: step.id, text: step.text }, skips };
    }
  }
  return best?.item ?? null;
}

/** Read only. What PREFLIGHT adds for the active day. Either part may be absent; a failed read shows nothing extra. */
export async function getArrival(dayId: string, now: Date = new Date()): Promise<Arrival> {
  const [handoffState, routines, days] = await Promise.all([
    getShiftHandoffState().catch(() => null),
    getRoutines().catch(() => [] as Routine[]),
    db.beyondDays.where("startedAt").aboveOrEqual(new Date(now.getTime() - FORGET_WINDOW_DAYS * 24 * 3_600_000).toISOString()).toArray().catch(() => []),
  ]);
  const handoff = handoffState && handoffState.activeDayId === dayId ? handoffState.unread ?? null : null;
  let forget: ForgetItem | null = null;
  if (routines.some((r) => r.status === "ACTIVE" && r.moment === "BEFORE_SHIFT")) {
    const earlier = days.filter((d) => d.id !== dayId);
    const ticks = await Promise.all(earlier.map((d) => getRoutineTicks(d.id).catch(() => new Set<string>())));
    forget = easyToForget(routines, ticks);
  }
  return { handoff, forget };
}
