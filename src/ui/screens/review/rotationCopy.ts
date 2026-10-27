import type { PictureRow } from "../../../application/wholePictureProjection";
import { RUN_MEAN_FLOOR, type RunPosition, type flipSummary } from "../../../application/rotationProjection";
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

type FlipSummaryView = ReturnType<typeof flipSummary>;
const windowText = (reference: string, w: { start: number; end: number; days: number } | undefined) =>
  w ? `${clockAfter(reference, w.start)}–${clockAfter(reference, w.end)} (${w.days} days)` : null;

/** ROTATION-003: one line of usual sleep times around a flip; each needs RUN_MEAN_FLOOR Garmin-timed days. */
export function describeFlipTiming(summary: FlipSummaryView, reference: string): string {
  const parts = summary.kind === "INTO_WORK"
    ? [["day before", summary.before], ["shift 1", summary.first], ["shift 2", summary.second]] as const
    : [["last shift", summary.before], ["day off 1", summary.first], ["day off 2", summary.second]] as const;
  const known = parts.flatMap(([label, w]) => windowText(reference, w) ? [`${label} ${windowText(reference, w)}`] : []);
  return known.length ? `Usually asleep: ${known.join(" · ")}.` : `Usual sleep times need ${RUN_MEAN_FLOOR} Garmin-timed days at each point.`;
}

/** Naps on the day before a flip into work, and the comparison only once both sides have enough flips. */
export function describeFlipNaps(summary: FlipSummaryView): string | null {
  if (summary.kind !== "INTO_WORK" || !(summary.naps.napped + summary.naps.none)) return null;
  const total = summary.naps.napped + summary.naps.none;
  const head = `Napped the day before on ${summary.naps.napped} of ${total} ${total === 1 ? "flip" : "flips"}.`;
  if (!summary.comparison) return `${head} A comparison needs ${RUN_MEAN_FLOOR} flips each way (napped ${summary.naps.napped}, didn't ${summary.naps.none}).`;
  const side = (s: NonNullable<FlipSummaryView["comparison"]>["napped"]) =>
    `sleep ${s.sleep.mean === undefined ? "—" : duration(s.sleep.mean)}, energy ${s.energy.mean === undefined ? "—" : s.energy.mean.toFixed(1)} (${s.flips} flips)`;
  return `${head} Shifts 1–2 after a nap: ${side(summary.comparison.napped)}; without: ${side(summary.comparison.none)}. A pattern in your records, not proof.`;
}
