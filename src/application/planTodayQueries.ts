import type { Mission, Obligation } from "../domain/intent/types";
import { formatLocalDate } from "../engine/scheduledContext";
import { getCurrentlyEligibleUnresolvedObligations, getMissions } from "./intentQueries";

export interface TodayPlan {
  date: string;
  planned: Obligation[];
  due: Obligation[];
  missions: Mission[];
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
