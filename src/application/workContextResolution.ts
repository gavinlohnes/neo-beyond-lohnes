import type { SchedulePattern, WorkContextSource } from "../domain/common/types";
import { isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { getWorkContextSource } from "./queries";

/**
 * CONTEXT-INTEGRATION-001 (Gavin, 2026-11-13): one read-only answer to "was / is / will this lived day be work or off,
 * and how do we know?", shared by Week Ahead, the energy forecast, Life State's WHY, Alfred's context and the free
 * helper, so they agree with TODAY.
 *
 *   RECORDED   a lived-day record says WORK or OFF. `by` says who set it: the operator (MANUAL, or a schedule
 *              suggestion they accepted) or the saved schedule at day start (SCHEDULE_STANDING, the owner-approved
 *              DROP 0 exception). Recorded reality wins when describing a day that has a record.
 *   CONFIRMED  an operator-confirmed future exception (SCHEDULE-EXCEPTIONS-001, `scheduleExceptions`). Beats the
 *              rotation for planning; never says the day was worked. Once the day starts it is recorded (by EXCEPTION).
 *   PREDICTED  the saved standing rotation's forecast. Never becomes a record by itself.
 *   UNKNOWN    no record and no saved schedule. Never silently treated as work or off.
 *
 * Shift What-If stays outside this: it is hypothetical and is applied only by its own view. A lived day runs from
 * 16:30 on its date to 16:30 the next day, so an overnight shift belongs to the day it starts. Never an Engine input.
 */
export type ContextBasis = "RECORDED" | "CONFIRMED" | "PREDICTED" | "UNKNOWN";
export interface ResolvedContext {
  kind: "WORK" | "OFF" | null;
  basis: ContextBasis;
  /** For RECORDED: who set it (the operator, the rotation at day start, or a confirmed exception at day start). */
  by?: "OPERATOR" | "SCHEDULE" | "EXCEPTION";
}
export interface RecordedContext { kind: "WORK" | "OFF"; by: "OPERATOR" | "SCHEDULE" | "EXCEPTION" }

/** The lived day that starts on this local date (yyyy-mm-dd), at 16:30. */
export function livedDayOn(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 16, 30, 0, 0);
}

export function recordedBy(source: WorkContextSource | undefined): "OPERATOR" | "SCHEDULE" | "EXCEPTION" {
  return source === "SCHEDULE_STANDING" ? "SCHEDULE" : source === "SCHEDULE_EXCEPTION" ? "EXCEPTION" : "OPERATOR";
}

/** Recorded first, then a confirmed exception, then the saved schedule's prediction, else unknown. */
export function resolveWorkContext(livedDayStart: Date, pattern: SchedulePattern, recorded?: RecordedContext | null, confirmed?: "WORK" | "OFF" | null): ResolvedContext {
  if (recorded) return { kind: recorded.kind, basis: "RECORDED", by: recorded.by };
  if (confirmed) return { kind: confirmed, basis: "CONFIRMED" };
  if (isOperatorSavedSchedule(pattern)) return { kind: scheduledWorkContextForLivedDay(livedDayStart, pattern), basis: "PREDICTED" };
  return { kind: null, basis: "UNKNOWN" };
}

/** Plain words for where a day's context came from, for WHY lines and Alfred. */
export function describeBasis(resolved: ResolvedContext): string {
  const what = resolved.kind === "WORK" ? "a work day" : resolved.kind === "OFF" ? "a day off" : "work or off not known";
  switch (resolved.basis) {
    case "RECORDED": return resolved.by === "SCHEDULE" ? `${what}, set from your saved schedule when the day started`
      : resolved.by === "EXCEPTION" ? `${what}, set from a schedule change you confirmed, when the day started` : `recorded by you as ${what}`;
    case "CONFIRMED": return `${what}, a schedule change you confirmed`;
    case "PREDICTED": return `${what} on your saved schedule (a forecast)`;
    default: return "work or off not known: nothing recorded and no saved schedule";
  }
}

/**
 * Read only: the recorded work context for each of these dates' lived days, keyed by date. Days not yet started, or
 * with no WORK/OFF recorded, are left out. A restarted lived day with any recorded work counts as work.
 */
export async function getRecordedContexts(dates: readonly string[]): Promise<Map<string, RecordedContext>> {
  const result = new Map<string, RecordedContext>();
  for (const date of dates) {
    const from = livedDayOn(date), to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 16, 30, 0, 0);
    const days = await db.beyondDays.where("startedAt").between(from.toISOString(), to.toISOString(), true, false).toArray();
    const known = days.filter((d) => d.workContext === "WORK" || d.workContext === "OFF").sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const pick = known.find((d) => d.workContext === "WORK") ?? known[0];
    if (pick) result.set(date, { kind: pick.workContext as "WORK" | "OFF", by: recordedBy(await getWorkContextSource(pick.id)) });
  }
  return result;
}

