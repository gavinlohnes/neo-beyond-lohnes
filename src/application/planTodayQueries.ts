import type { Mission, Obligation } from "../domain/intent/types";
import { formatLocalDate } from "../engine/scheduledContext";
import { getCurrentlyEligibleUnresolvedObligations, getMissions } from "./intentQueries";

export interface TodayPlan {
  date: string;
  planned: Obligation[];
  due: Obligation[];
  missions: Mission[];
}

export interface TaskSmartLists {
  date: string;
  through: string;
  today: Obligation[];
  next7: Obligation[];
  /** GRAYSON-CARRY-001: open tasks whose planned day has passed (up to 7 days back) and that no list above shows. */
  plannedEarlier: Obligation[];
  /** No planned day and no due date; plus (CARRY-001) tasks planned more than 7 days ago that no other list shows. */
  noDate: Obligation[];
  /** WAITING-FOR-001 (APPS-PICKS-003 pick 7, after GTD): open tasks you marked Waiting on someone else. */
  waiting: Obligation[];
  missions: Mission[];
}

/** Existing local calendar-date task semantics; does not change lived-day ownership. */
export const taskListDate = (now = new Date()) => formatLocalDate(now);

/** Read-only filters, retaining the canonical query's ordering and eligibility.
 * Due dates and planned attention remain distinct; neither is moved or inferred.
 */
export async function getTaskSmartLists(now = new Date()): Promise<TaskSmartLists> {
  const date = taskListDate(now);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12);
  const through = taskListDate(end);
  const [obligations, missions] = await Promise.all([getCurrentlyEligibleUnresolvedObligations(), getMissions()]);
  const inToday = (item: Obligation) => item.plannedAt === date || (item.dueAt !== undefined && item.dueAt <= date);
  const inNext7 = (item: Obligation) => !inToday(item) && [item.plannedAt, item.dueAt].some((at) => at !== undefined && at > date && at <= through);
  // GRAYSON-CARRY-001: nothing he planned can vanish. A passed planned day shows in "Planned earlier" for 7 days, then
  // under No date (the screen shows its day). Precedence Today > Next 7 > Planned earlier > No date: nothing twice.
  const weekBack = taskListDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12));
  const pastPlanned = (item: Obligation) => item.plannedAt !== undefined && item.plannedAt < date && !inToday(item) && !inNext7(item);
  return {
    date, through, missions,
    today: obligations.filter(inToday),
    next7: obligations.filter(inNext7),
    plannedEarlier: obligations.filter((item) => pastPlanned(item) && item.plannedAt! >= weekBack),
    noDate: obligations.filter((item) => (item.plannedAt === undefined && item.dueAt === undefined) || (pastPlanned(item) && item.plannedAt! < weekBack)),
    waiting: obligations.filter((item) => item.status === "WAITING"),
  };
}

/** Explicit dates only. This view does not rank, schedule, recommend or write. */
export async function getTodayPlan(now = new Date()): Promise<TodayPlan> {
  const date = formatLocalDate(now);
  const [obligations, missions] = await Promise.all([getCurrentlyEligibleUnresolvedObligations(), getMissions()]);
  return {
    date,
    planned: obligations.filter((item) => item.plannedAt === date),
    due: obligations.filter((item) => item.plannedAt !== date && item.dueAt !== undefined && item.dueAt <= date),
    missions,
  };
}
