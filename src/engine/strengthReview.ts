import type { MuscleGroup } from "../domain/workout/exerciseLibrary";

export type MovementClass = "PUSH" | "PULL";
export interface StrengthObservation { sessionId: string; exerciseId: string; at: string; weight: number; reps: number; muscleGroup?: MuscleGroup; movement?: MovementClass; bodyweightLbs?: number }
export interface BestSet { weight: number; reps: number; estimatedMax: number }
export interface LiftStrengthReview {
  exerciseId: string; recentSessions: number; previousSessions: number;
  recentBest: BestSet | undefined; previousBest: BestSet | undefined;
  bestSetChangePercent: number | undefined; recentVolume: number; previousVolume: number;
  volumeChangePercent: number | undefined; estimatedMaxChangePercent: number | undefined;
  relativeStrength: number | undefined; indexChangePercent: number | undefined;
  status: "IMPROVING" | "STEADY" | "LOWER" | "BUILDING";
}
export interface StrengthReview {
  lifts: LiftStrengthReview[]; comparableLifts: number; strengthIndexChangePercent: number | undefined;
  weeklyVolumeGrowthPercent: number | undefined; recentVolumePerWeek: number; previousVolumePerWeek: number;
  muscleSetsPerWeek: Partial<Record<MuscleGroup, number>>;
  balance: { push: number; pull: number; upper: number; lower: number; unclassified: number };
  records: StrengthObservation[];
}

const DAY = 86_400_000;
const estimatedMax = (weight: number, reps: number) => weight * (1 + reps / 30);
const percent = (current: number, previous: number) => previous > 0 ? (current / previous - 1) * 100 : undefined;
const best = (rows: readonly StrengthObservation[]): BestSet | undefined => {
  const row = rows.slice().sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  return row ? { weight: row.weight, reps: row.reps, estimatedMax: estimatedMax(row.weight, row.reps) } : undefined;
};

/** Read-only REVIEW-001 projection. Callers provide canonical, already-filtered working sets. */
export function projectStrengthReview(observations: readonly StrengthObservation[], now: Date): StrengthReview {
  const end = now.getTime(), recentStart = end - 28 * DAY, previousStart = end - 56 * DAY;
  const valid = observations.filter((row) => Number.isFinite(row.weight) && row.weight > 0 && Number.isFinite(row.reps) && row.reps > 0 && row.reps <= 30 && Date.parse(row.at) >= previousStart && Date.parse(row.at) < end);
  const ids = [...new Set(valid.map((row) => row.exerciseId))];
  const lifts = ids.map((exerciseId): LiftStrengthReview => {
    const mine = valid.filter((row) => row.exerciseId === exerciseId);
    const recent = mine.filter((row) => Date.parse(row.at) >= recentStart);
    const previous = mine.filter((row) => Date.parse(row.at) < recentStart);
    const recentSessions = new Set(recent.map((row) => row.sessionId)).size;
    const previousSessions = new Set(previous.map((row) => row.sessionId)).size;
    const recentBest = best(recent), previousBest = best(previous);
    const recentVolume = recent.reduce((sum, row) => sum + row.weight * row.reps, 0);
    const previousVolume = previous.reduce((sum, row) => sum + row.weight * row.reps, 0);
    const comparable = recentSessions >= 2 && previousSessions >= 2 && recentBest !== undefined && previousBest !== undefined;
    const bestSetChangePercent = comparable ? percent(recentBest.weight, previousBest.weight) : undefined;
    const volumeChangePercent = comparable ? percent(recentVolume, previousVolume) : undefined;
    const estimatedMaxChangePercent = comparable ? percent(recentBest.estimatedMax, previousBest.estimatedMax) : undefined;
    const indexChangePercent = bestSetChangePercent === undefined || volumeChangePercent === undefined ? undefined : (bestSetChangePercent + volumeChangePercent) / 2;
    const status = indexChangePercent === undefined ? "BUILDING" : indexChangePercent > 2 ? "IMPROVING" : indexChangePercent < -2 ? "LOWER" : "STEADY";
    const relativeRow = recent.slice().sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    const relativeStrength = relativeRow?.bodyweightLbs && relativeRow.bodyweightLbs > 0 ? relativeRow.weight / relativeRow.bodyweightLbs : undefined;
    return { exerciseId, recentSessions, previousSessions, recentBest, previousBest, bestSetChangePercent, recentVolume, previousVolume, volumeChangePercent, estimatedMaxChangePercent, relativeStrength, indexChangePercent, status };
  }).sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  const changes = lifts.flatMap((lift) => lift.indexChangePercent === undefined ? [] : [lift.indexChangePercent]);
  const strengthIndexChangePercent = changes.length >= 2 ? changes.reduce((sum, value) => sum + value, 0) / changes.length : undefined;
  const recentVolume = valid.filter((row) => Date.parse(row.at) >= recentStart).reduce((sum, row) => sum + row.weight * row.reps, 0);
  const previousVolume = valid.filter((row) => Date.parse(row.at) < recentStart).reduce((sum, row) => sum + row.weight * row.reps, 0);
  const recentVolumePerWeek = recentVolume / 4, previousVolumePerWeek = previousVolume / 4;
  const weeklyVolumeGrowthPercent = changes.length >= 2 ? percent(recentVolumePerWeek, previousVolumePerWeek) : undefined;
  const muscleSetsPerWeek: Partial<Record<MuscleGroup, number>> = {};
  for (const row of valid.filter((item) => Date.parse(item.at) >= recentStart && item.muscleGroup)) muscleSetsPerWeek[row.muscleGroup!] = (muscleSetsPerWeek[row.muscleGroup!] ?? 0) + .25;
  const balance = { push: 0, pull: 0, upper: 0, lower: 0, unclassified: 0 };
  for (const row of valid.filter((item) => Date.parse(item.at) >= recentStart)) {
    if (row.movement === "PUSH") balance.push += .25;
    else if (row.movement === "PULL") balance.pull += .25;
    else balance.unclassified += .25;
    if (["Chest", "Back", "Shoulders", "Arms"].includes(row.muscleGroup ?? "")) balance.upper += .25;
    else if (row.muscleGroup === "Legs" || row.muscleGroup === "Glutes") balance.lower += .25;
  }
  return { lifts, comparableLifts: changes.length, strengthIndexChangePercent, weeklyVolumeGrowthPercent, recentVolumePerWeek, previousVolumePerWeek, muscleSetsPerWeek, balance, records: valid.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) };
}
