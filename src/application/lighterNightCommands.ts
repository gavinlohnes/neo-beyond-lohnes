import { readLighterNightDay, writeLighterNightDay, type LighterHomeMove } from "../persistence/lighterNightPreference";
import { setPlannedWork } from "./commands";
import { getPlannedWorkDeclaration } from "./queries";
import { moveWeekTask } from "./weekPlannerCommands";
import { getLighterNight, type LighterNightPlan } from "./lighterNightQueries";

/**
 * GRAYSON-LIGHTER-NIGHT-001: TAKE IT, each part's UNDO and NOT TONIGHT, through the commands that already exist:
 * `setPlannedWork` (the answer WorkoutCall records), Fits now's ordering mark, and the week planner's `moveWeekTask`.
 * No new event. The phone keeps what each UNDO needs, by lived day.
 */
export const STALE_LINE = "Tonight's plan changed since this card showed. Nothing was changed. Look again.";

const sameJobs = (a: LighterNightPlan["homeJobs"], b: LighterNightPlan["homeJobs"]) =>
  a.length === b.length && a.every((j, i) => j.id === b[i]!.id && j.updatedAt === b[i]!.updatedAt);

/**
 * One tap: the parts the card offered. It re-reads tonight's plan first; if the lift or the home jobs changed since
 * the card rendered, it refuses and writes nothing.
 */
export async function takeLighterNight(shown: LighterNightPlan, now: Date = new Date()): Promise<void> {
  const fresh = await getLighterNight(now);
  if (!fresh || fresh.view.kind !== "OFFER" || fresh.plan.dayId !== shown.dayId
    || (fresh.plan.lift?.name ?? null) !== (shown.lift?.name ?? null) || fresh.plan.food !== shown.food
    || !sameJobs(fresh.plan.homeJobs, shown.homeJobs)) throw new Error(STALE_LINE);
  const { plan, view } = fresh;
  const day = readLighterNightDay(plan.dayId);
  if (view.lines.lift && plan.lift) {
    const previous = await getPlannedWorkDeclaration(plan.dayId);
    await setPlannedWork(plan.dayId, true);
    day.lift = { name: plan.lift.name, form: plan.lift.form, previous: previous ?? null };
    writeLighterNightDay(plan.dayId, day);
  }
  if (view.lines.food && plan.food) {
    day.food = true;
    writeLighterNightDay(plan.dayId, day);
  }
  if (view.lines.home && plan.firstOff && plan.homeJobs.length) {
    const moves: LighterHomeMove[] = [];
    try {
      for (const job of plan.homeJobs) {
        const moved = await moveWeekTask(job.id, plan.firstOff, { updatedAt: job.updatedAt, plannedAt: job.plannedAt }, now);
        moves.push({ id: job.id, title: job.title, from: job.plannedAt, to: plan.firstOff, updatedAt: moved.updatedAt });
      }
    } finally {
      // Whatever moved keeps its UNDO, even if a later job refused.
      if (moves.length) { day.home = { moves, at: now.toISOString(), toLabel: plan.toLabel }; writeLighterNightDay(plan.dayId, day); }
    }
  }
}

/** UNDO the lift: the plan answer that was there before goes back. With none before, the SHORT form goes; the answer stays. */
export async function undoLighterLift(dayId: string): Promise<{ answerKept: boolean }> {
  const day = readLighterNightDay(dayId);
  if (!day.lift) return { answerKept: false };
  const previous = day.lift.previous;
  if (previous === false && (await getPlannedWorkDeclaration(dayId)) !== false) await setPlannedWork(dayId, false);
  delete day.lift;
  writeLighterNightDay(dayId, day);
  return { answerKept: previous === null };
}

/** UNDO the food part: Fits now goes back to its usual order. Nothing was logged, so nothing else changes. */
export function undoLighterFood(dayId: string): void {
  const day = readLighterNightDay(dayId);
  delete day.food;
  writeLighterNightDay(dayId, day);
}

/**
 * UNDO the home part: each job moves back to tonight with the same guard. A job changed since (edited, done, moved)
 * is left as it is and named.
 */
export async function undoLighterHome(dayId: string): Promise<{ changedElsewhere: string[] }> {
  const day = readLighterNightDay(dayId);
  if (!day.home) return { changedElsewhere: [] };
  const changedElsewhere: string[] = [];
  // The move back uses the seven-day plan as it stood when he took it, so tonight's date is still in it after midnight.
  const takenAt = new Date(day.home.at);
  for (const move of day.home.moves) {
    try {
      await moveWeekTask(move.id, move.from, { updatedAt: move.updatedAt, plannedAt: move.to }, takenAt);
    } catch {
      changedElsewhere.push(move.title.replace(/^Home: /, ""));
    }
  }
  delete day.home;
  writeLighterNightDay(dayId, day);
  return { changedElsewhere };
}

/** NOT TONIGHT: the card hides for this lived day. Nothing else is written. */
export function dismissLighterNight(dayId: string): void {
  writeLighterNightDay(dayId, { ...readLighterNightDay(dayId), dismissed: true });
}
