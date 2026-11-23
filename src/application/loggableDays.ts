import { db } from "../persistence/db";
import type { BeyondDay } from "../domain/common/types";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { getSchedulePattern } from "./queries";

/**
 * GRAYSON WHEN upgrade (Gavin, 2026-11-23; amends LOG-TIME-001): which lived days a water or meal log may be placed
 * on. Today plus the lived days on record from the last week, newest first, each with its own shift (if it had one)
 * so the WHEN row can offer START / MID / END / AFTER SHIFT. A log placed on an earlier day is recorded on that day;
 * nothing is moved or rewritten, and that day's Engine advice is not re-run.
 */
export const LOGGABLE_DAYS_BACK = 7;

export interface LoggableDay {
  id: string;
  startedAt: string;
  createdAt: string;
  /** "Today", "Yesterday", or the lived day's weekday and date. */
  label: string;
  isToday: boolean;
  shift: { start: Date; end: Date } | null;
}

const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/**
 * Pure. Days to offer, newest first: the active day, then earlier ones within the window, one per lived day.
 * "Yesterday" and the window are counted from the active day's own lived day (or from now when none is open).
 */
export function deriveLoggableDays(days: readonly BeyondDay[], activeId: string | null, now: Date, shiftOf: (startedAt: string) => { start: Date; end: Date } | null): LoggableDay[] {
  const active = days.find((d) => d.id === activeId);
  const today = mostRecentBoundaryAtOrBefore(active ? new Date(active.startedAt) : now);
  const oldest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - LOGGABLE_DAYS_BACK, today.getHours(), today.getMinutes());
  const seen = new Set<number>();
  const out: LoggableDay[] = [];
  const ordered = [...days].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : b.startedAt.localeCompare(a.startedAt)));
  for (const d of ordered) {
    const lived = mostRecentBoundaryAtOrBefore(new Date(d.startedAt));
    if (lived.getTime() < oldest.getTime() || lived.getTime() > today.getTime() || seen.has(lived.getTime())) continue;
    seen.add(lived.getTime());
    const isToday = d.id === activeId;
    const back = Math.round((today.getTime() - lived.getTime()) / 86_400_000);
    out.push({ id: d.id, startedAt: d.startedAt, createdAt: d.createdAt, isToday,
      shift: d.workContext === "OFF" ? null : shiftOf(d.startedAt),
      label: isToday ? "Today" : back <= 1 ? "Yesterday" : dayLabel(lived) });
  }
  return out;
}

/** Read only. */
export async function getLoggableDays(now: Date = new Date()): Promise<LoggableDay[]> {
  const [pattern, days] = await Promise.all([getSchedulePattern(), db.beyondDays.toArray()]);
  const active = days.find((d) => d.status === "ACTIVE") ?? null;
  return deriveLoggableDays(days, active?.id ?? null, now, (startedAt) => livedDayShiftWindow(new Date(startedAt), pattern));
}
