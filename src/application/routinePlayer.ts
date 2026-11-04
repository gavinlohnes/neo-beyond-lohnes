import { db } from "../persistence/db";
import { parseRoutine } from "../persistence/routineValidation";
import { ROUTINE_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { getActiveDay, getSchedulePattern } from "./queries";
import { getRoutineTicks, setRoutineStep } from "./routineCommands";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { deriveScheduledContext, isOperatorSavedSchedule } from "../engine/scheduledContext";
import type { Routine, RoutineStep } from "../domain/routines";

export const routineVersion = (routine: Routine) => JSON.stringify([routine.updatedAt, routine.title, routine.moment, routine.status, routine.steps]);
export function routineEstimate(steps: readonly Pick<RoutineStep, "minutes">[]): string | null {
  const timed = steps.filter((s) => s.minutes !== undefined);
  if (!timed.length) return null;
  const total = timed.reduce((sum, s) => sum + s.minutes!, 0);
  return `About ${total} min${timed.length === steps.length ? "" : " + untimed steps"}`;
}

export interface RoutinePlayback {
  routine: Routine;
  version: string;
  dayId: string | null;
  boundary: string;
  dayBlocked: boolean;
  ticks: Set<string>;
  scheduledShiftStart: string | null;
}

/** Reads only: PLAY, SKIP and timers never create a day or a tick. */
export async function getRoutinePlayback(routineId: string, now = new Date()): Promise<RoutinePlayback> {
  const [raw, day, schedule] = await Promise.all([db.routines.get(routineId), getActiveDay(), getSchedulePattern()]);
  const routine = parseRoutine(raw);
  if (!routine || routine.status !== "ACTIVE") throw new Error("This routine is no longer in use. Close the player and check your routines.");
  const boundary = mostRecentBoundaryAtOrBefore(now).toISOString();
  const dayBlocked = Boolean(day && Date.parse(day.startedAt) < Date.parse(boundary));
  const phase = deriveScheduledContext(now, schedule);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.shiftStartHour);
  const scheduledShiftStart = routine.moment === "BEFORE_SHIFT" && isOperatorSavedSchedule(schedule)
    && phase.phase === "PRE_WORK" && phase.todayIsScheduledWorkDay && day?.workContext !== "OFF" && start > now
    ? start.toISOString() : null;
  return { routine, version: routineVersion(routine), dayId: day?.id ?? null, boundary, dayBlocked,
    ticks: day ? await getRoutineTicks(day.id) : new Set(), scheduledShiftStart };
}

/** Atomic playback guards; the actual tick still uses the canonical command. */
export async function completePlayedRoutineStep(playback: RoutinePlayback, stepId: string): Promise<boolean> {
  return writeAtomically(ROUTINE_WRITE_TABLES, async () => {
    const [raw, day] = await Promise.all([db.routines.get(playback.routine.id), getActiveDay()]);
    const routine = parseRoutine(raw);
    if (!routine || routine.status !== "ACTIVE" || routineVersion(routine) !== playback.version) {
      throw new Error("The routine changed. Reload the player before saving another step.");
    }
    const boundary = mostRecentBoundaryAtOrBefore(new Date()).toISOString();
    if (!day || day.id !== playback.dayId || boundary !== playback.boundary || Date.parse(day.startedAt) < Date.parse(boundary)) {
      throw new Error("Your lived day changed. Open TODAY to settle the day, then reload the player. No tick was saved.");
    }
    return setRoutineStep(day.id, routine.id, stepId, true);
  });
}
