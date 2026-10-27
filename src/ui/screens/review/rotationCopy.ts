import type { PictureRow } from "../../../application/wholePictureProjection";
import { RUN_MEAN_FLOOR, type RunPosition } from "../../../application/rotationProjection";
import { unlockGoal } from "../../unlockGoal";

/** ROTATION-002 copy: counts and recorded values, never a cause, a score or an instruction. */
export const shortDate = (at: string) => new Date(at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export const clockAfter = (start: string, minutes: number) =>
  new Date(Date.parse(start) + minutes * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const duration = (hours: number) => { const m = Math.round(hours * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };

export function positionName(place: Pick<RunPosition, "context" | "position">): string {
  return place.context === "WORK" ? `Shift ${place.position}` : `Day off ${place.position}`;
}

/** "Sleep 6:10 avg (5 days) · energy 3.2 (4) · trained 1 of 5" — or how many more days a mean needs. */
export function describePosition(place: RunPosition): string {
  // DELTA-004: below the floor, say what fills it in (future runs only; the past stays as recorded).
  const more = (have: number) => RUN_MEAN_FLOOR - have;
  const sleep = place.sleep.mean !== undefined ? `sleep ${duration(place.sleep.mean)} avg (${place.sleep.days} days)` : `sleep avg after ${more(place.sleep.days)} more logged (${place.sleep.days} of ${RUN_MEAN_FLOOR})`;
  const energy = place.energy.mean !== undefined ? `energy ${place.energy.mean.toFixed(1)} avg (${place.energy.days})` : `energy avg after ${more(place.energy.days)} more check-${more(place.energy.days) === 1 ? "in" : "ins"} (${place.energy.days} of ${RUN_MEAN_FLOOR})`;
  return `${sleep} · ${energy} · trained on ${place.trained.days} of ${place.trained.of}`;
}

/** "Usually asleep 08:05–14:40 (4 Garmin nights)" from medians in the lived-day frame. */
export function describeTiming(place: RunPosition, reference: string): string | null {
  return place.timing ? `Usually asleep ${clockAfter(reference, place.timing.start)}–${clockAfter(reference, place.timing.end)} (${place.timing.days} Garmin-timed days)` : null;
}

/** The single most-trained day off, when runs support saying so; ties and thin samples stay silent. */
export function mostTrainedDayOff(positions: readonly RunPosition[]): RunPosition | null {
  const off = positions.filter((place) => place.context === "OFF" && place.trained.of >= RUN_MEAN_FLOOR && place.trained.days > 0);
  const best = [...off].sort((a, b) => b.trained.days / b.trained.of - a.trained.days / a.trained.of);
  if (!best[0] || (best[1] && best[1].trained.days / best[1].trained.of === best[0].trained.days / best[0].trained.of)) return null;
  return best[0];
}

/** Days since the last finished lived day with a counted workout, from the records shown. */
export function lastWorkout(rows: readonly PictureRow[], readAt: string): { start: string; daysAgo: number } | null {
  const row = [...rows].reverse().find((candidate) => candidate.sessions > 0);
  if (!row) return null;
  return { start: row.start, daysAgo: Math.max(1, Math.floor((Date.parse(readAt) - Date.parse(row.start)) / 86400000)) };
}

/** DELTA-004: what turns "patterns need N runs" into patterns. Null once there are enough runs. */
export function patternsGoal(runs: number): string | null {
  return unlockGoal([{ more: RUN_MEAN_FLOOR - runs, action: (n) => `mark each day work or off and log main sleep and a check-in through ${n} more work ${n === 1 ? "run" : "runs"}` }],
    "show shift-by-shift patterns") ?? null;
}
