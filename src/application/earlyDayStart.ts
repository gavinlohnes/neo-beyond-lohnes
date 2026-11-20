import { db } from "../persistence/db";
import type { BeyondDay } from "../domain/common/types";
import { earlyDayStartBoundary, livedDayShiftWindow } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";

/**
 * EARLY-DAY-START-001 (Gavin, 2026-11-20). A START DAY tap between his post-shift tail and 16:30 opens the
 * lived day that begins at 16:30, stamped at that boundary the same way the automatic roll stamps the days it
 * creates. Its `createdAt` keeps the real tap instant, so such a day is recognisable as opened early.
 */
export interface EarlyDayStart {
  /** The 16:30 boundary the tap opens. */
  boundary: Date;
  /** The scheduled shift that day owns, or null on a scheduled day off. */
  shift: { start: Date; end: Date } | null;
}

/**
 * Read only. The early start a tap would make now, or null when there's nothing to open early: outside the
 * window, or the active day already is (or is after) the 16:30 day.
 */
export async function getEarlyDayStart(now: Date = new Date()): Promise<EarlyDayStart | null> {
  const pattern = await getSchedulePattern();
  const boundary = earlyDayStartBoundary(now, pattern);
  if (!boundary) return null;
  const active = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
  if (active && Date.parse(active.startedAt) >= boundary.getTime()) return null;
  return { boundary, shift: livedDayShiftWindow(boundary, pattern) };
}

/**
 * The instant to read "which lived day is it" from. Normally `now`; for a day opened early, its own start,
 * so TODAY reads tonight's run, state and NEXT instead of the day it replaced.
 */
export function livedReadAt(day: Pick<BeyondDay, "startedAt"> | null | undefined, now: Date): Date {
  const started = day ? Date.parse(day.startedAt) : NaN;
  return Number.isFinite(started) && started > now.getTime() ? new Date(started) : now;
}
