import { getTaskSmartLists } from "./planTodayQueries";
import { getProjectViews } from "./projectQueries";
import { getRoutines, getRoutineTicks } from "./routineCommands";
import { getPeopleView } from "./peopleCommands";
import { getHomeView } from "./homeCommands";
import { getDailyNoteWorkspace } from "./dailyNoteQueries";
import { getActiveWorkoutSession } from "./trainQueries";
import { getActiveDay } from "./queries";

async function routineDay() {
  const day = await getActiveDay();
  return { startedAt: day?.startedAt ?? null, ticks: day ? await getRoutineTicks(day.id) : new Set<string>() };
}

export type LifeRead<T> = { state: "ready"; value: T } | { state: "unavailable" };
async function read<T>(query: () => Promise<T>): Promise<LifeRead<T>> {
  try { return { state: "ready", value: await query() }; }
  catch { return { state: "unavailable" }; }
}

/** Read-only composition of existing records. No new ranking, scheduling or inferred priorities.
 * Calendar task dates and lived-day note ownership deliberately remain distinct.
 * Each source fails independently; unread is never represented as empty.
 */
export async function getWholeLife(now = new Date()) {
  const [plan, projects, routines, people, home, note, workout, routineProgress] = await Promise.all([
    read(() => getTaskSmartLists(now)), read(getProjectViews), read(getRoutines),
    read(() => getPeopleView(now)), read(() => getHomeView(now)),
    read(() => getDailyNoteWorkspace()), read(() => getActiveWorkoutSession()), read(routineDay),
  ]);
  return { readAt: now.toISOString(), plan, projects, routines, people, home, note, workout, routineProgress };
}
export type WholeLife = Awaited<ReturnType<typeof getWholeLife>>;
