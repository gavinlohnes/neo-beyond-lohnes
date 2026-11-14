import type { HabitAnswer } from "../domain/habits";
import type { BeyondDay, SchedulePattern } from "../domain/common/types";
import { getHabitWorkspace } from "./habitQueries";
import { getMeasuredSnapshot, type MeasuredSnapshot } from "./measuredQueries";
import { getPaceHistories, type PaceHistories } from "./pace";
import { getSchedulePattern } from "./queries";
import { getQuitSummary, type QuitSummary } from "./quitQueries";

/**
 * BODY-DASH-001: what DATA's dashboard reads beyond the logs BODY already holds, each from its existing query: Garmin's
 * measurements and your usual (GARMIN-003/004/005), your water pace history (SUIT-ALIVE S5), today's habits and the
 * quit tracker, and the saved schedule for the day's shift. Read only. A part that can't be read is null, never a guess.
 */
export interface BodyDashboardExtras {
  measured: MeasuredSnapshot | null;
  pace: PaceHistories | null;
  habits: { name: string; done: boolean; answer?: HabitAnswer }[] | null;
  quit: QuitSummary | null;
  schedule: SchedulePattern | null;
}

export async function getBodyDashboardExtras(day: BeyondDay | null, now: Date = new Date()): Promise<BodyDashboardExtras> {
  const [measured, pace, workspace, quit, schedule] = await Promise.all([
    getMeasuredSnapshot(now.getTime()).catch(() => null),
    day ? getPaceHistories(day, now).catch(() => null) : Promise.resolve(null),
    getHabitWorkspace(now).catch(() => null),
    getQuitSummary(day?.id, now).catch(() => undefined),
    getSchedulePattern().catch(() => null),
  ]);
  return {
    measured, pace, schedule, quit: quit ?? null,
    habits: workspace ? workspace.habits.filter((h) => h.applies).map((h) => ({ name: h.habit.name, done: h.done, answer: h.answer })) : null,
  };
}
