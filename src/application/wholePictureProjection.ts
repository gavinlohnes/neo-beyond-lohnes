import type { StateCheckIn } from "../domain/common/types";
import type { ReviewRow } from "../engine/reviewOverview";
import { reviewMean } from "../engine/reviewOverview";

/** WHOLE-PICTURE-001: read-only projections; never an input to primary arbitration. */
export type PictureScope = "ALL" | "WORK" | "OFF";
export type PictureMeasure = "sleepHours" | "energy" | "stress" | "mood" | "soreness" | "alcoholUrge" | "sessions" | "resting" | "steps";
export interface PictureRow extends ReviewRow {
  checkIn: StateCheckIn | undefined;
  checkInCount: number;
  energy: number | undefined;
  stress: number | undefined;
  mood: number | undefined;
  soreness: number | undefined;
  alcoholUrge: number | undefined;
  resting: number | undefined;
  steps: number | undefined;
  measuredHours: number;
  /** ROTATION-002: main sleep's Garmin start/end, minutes after the lived day's start; absent unless Garmin times back that day's single main sleep. */
  sleepWindow?: { start: number; end: number } | undefined;
  /** ROTATION-002: the scheduled shift on a recorded work day, minutes after the lived day's start. Scheduled, not clocked. */
  shiftWindow?: { start: number; end: number } | undefined;
}
export function pictureScope(rows: readonly PictureRow[], scope: PictureScope): PictureRow[] {
  return rows.filter((row) => scope === "ALL" || row.context === scope);
}
/** One submitted observation per completed window; repeated check-ins never inflate day counts. */
export function attachPictureCheckIns(rows: readonly ReviewRow[], checkIns: readonly StateCheckIn[]): PictureRow[] {
  const byDay = new Map<string, StateCheckIn[]>();
  for (const checkIn of checkIns) {
    const values = byDay.get(checkIn.beyondDayId) ?? [];
    values.push(checkIn); byDay.set(checkIn.beyondDayId, values);
  }
  return rows.map((row) => {
    const observations = row.dayIds.flatMap((id) => byDay.get(id) ?? []).sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt) || (b.seq ?? 0) - (a.seq ?? 0) || a.id.localeCompare(b.id));
    const checkIn = observations[0];
    return { ...row, checkIn, checkInCount: observations.length,
      energy: checkIn?.energy, stress: checkIn?.stress, mood: checkIn?.mood,
      soreness: checkIn?.soreness, alcoholUrge: checkIn?.alcoholUrge,
      resting: undefined, steps: undefined, measuredHours: 0 };
  });
}
export function pictureValues(rows: readonly PictureRow[], key: PictureMeasure | "protein" | "calories" | "weight"): number[] {
  return rows.flatMap((row) => {
    // A missing source day cannot establish zero training. Logged zero remains a real value.
    if (key === "sessions" && !row.dayIds.length) return [];
    const value = row[key];
    return value === undefined || !Number.isFinite(value) ? [] : [value];
  });
}
export const PICTURE_MEAN_FLOOR = 3;
export function pictureMean(values: readonly number[]): number | undefined {
  return values.length >= PICTURE_MEAN_FLOOR ? reviewMean([...values]) : undefined;
}
export function pictureLowEnergy(rows: readonly PictureRow[]) {
  const values = pictureValues(rows, "energy"); return { count: values.filter((value) => value <= 2).length, days: values.length };
}
export function pictureHighStress(rows: readonly PictureRow[]) {
  const values = pictureValues(rows, "stress"); return { count: values.filter((value) => value >= 4).length, days: values.length };
}
/** Counts and qualified means only; no assertion about cause, readiness, or the operator's identity. */
export function describePicture(rows: readonly PictureRow[], previous: readonly PictureRow[]) {
  const sleep = pictureMean(pictureValues(rows, "sleepHours"));
  const prior = pictureMean(pictureValues(previous, "sleepHours"));
  const low = pictureLowEnergy(rows);
  if (!rows.some((row) => row.dayIds.length || row.steps !== undefined || row.resting !== undefined)) {
    return { title: "Your record starts with what you choose to record.", body: "No completed source days or measured activity in this view. Missing history is not a verdict about your life." };
  }
  if (sleep === undefined || prior === undefined) return {
    title: "A picture still taking shape.",
    body: `A sleep comparison needs at least ${PICTURE_MEAN_FLOOR} unambiguous recorded days in each period. Energy was reported at 1 or 2 on ${low.count} of ${low.days} check-in days. No cause is inferred.`,
  };
  const minutes = Math.round((sleep - prior) * 60);
  return { title: minutes < 0 ? "Sleep was shorter. Look at the days around it." : minutes > 0 ? "More recorded sleep. Look at the circumstances." : "Similar sleep. The circumstances still matter.",
    body: `Main sleep averaged ${Math.floor(Math.round(sleep * 60) / 60)}h ${Math.round(sleep * 60) % 60}m, ${Math.abs(minutes)} minutes ${minutes < 0 ? "shorter" : minutes > 0 ? "longer" : "different"} than the previous matching period. Low energy was reported on ${low.count} of ${low.days} check-in days. These observations do not establish a cause.` };
}
