import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import type { TrainingHistoryEntry } from "./trainHistoryQueries";

/**
 * VISUAL-FOUNDATION-002: TRAIN's weekly numbers, from its own history. A week runs Monday to Sunday by lived day (a
 * 01:00 workout after a Sunday night shift counts for Sunday), as Habits count weeks. Only finished strength sessions
 * with at least one working set count (REAL-DATA-001: a session with no sets isn't training). Read only.
 */
export interface TrainWeek { sessions: number; sets: number }

const mondayOf = (date: Date) => { const copy = new Date(date); copy.setHours(12, 0, 0, 0); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; };
const weekKey = (d: Date) => mondayOf(d).toDateString();

/** The last `weeks` weeks, oldest first; the last entry is this week. */
export function trainingWeeks(entries: readonly Pick<TrainingHistoryEntry, "status" | "startedAt" | "workingSetCount">[], now: Date, weeks = 8): TrainWeek[] {
  const thisMonday = mondayOf(mostRecentBoundaryAtOrBefore(now));
  const keys = Array.from({ length: weeks }, (_, i) => { const d = new Date(thisMonday); d.setDate(d.getDate() - (weeks - 1 - i) * 7); return weekKey(d); });
  const out = keys.map(() => ({ sessions: 0, sets: 0 }));
  for (const e of entries) {
    if ((e.status !== "COMPLETED" && e.status !== "PARTIAL") || e.workingSetCount <= 0) continue;
    const i = keys.indexOf(weekKey(mostRecentBoundaryAtOrBefore(new Date(e.startedAt))));
    if (i >= 0) { out[i]!.sessions += 1; out[i]!.sets += e.workingSetCount; }
  }
  return out;
}
