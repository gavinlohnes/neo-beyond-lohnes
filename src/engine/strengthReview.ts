import type { MuscleGroup } from "../domain/workout/exerciseLibrary";

export interface StrengthObservation {
  sessionId: string;
  exerciseId: string;
  at: string;
  weight: number;
  reps: number;
  muscleGroup?: MuscleGroup;
}

export interface LiftStrengthReview {
  exerciseId: string;
  recentSessions: number;
  previousSessions: number;
  recentBest: number | undefined;
  previousBest: number | undefined;
  changePercent: number | undefined;
  status: "IMPROVING" | "STEADY" | "LOWER" | "BUILDING";
}

export interface StrengthReview {
  lifts: LiftStrengthReview[];
  comparableLifts: number;
  overallChangePercent: number | undefined;
  muscleSetsPerWeek: Partial<Record<MuscleGroup, number>>;
  balance: { push: number; pull: number; upper: number; lower: number; unclassified: number };
}

const DAY = 86_400_000;
const estimatedMax = (weight: number, reps: number) => weight * (1 + reps / 30);

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
    const recentBest = recent.length ? Math.max(...recent.map((row) => estimatedMax(row.weight, row.reps))) : undefined;
    const previousBest = previous.length ? Math.max(...previous.map((row) => estimatedMax(row.weight, row.reps))) : undefined;
    const comparable = recentSessions >= 2 && previousSessions >= 2 && recentBest !== undefined && previousBest !== undefined;
    const changePercent = comparable ? (recentBest / previousBest - 1) * 100 : undefined;
    const status = changePercent === undefined ? "BUILDING" : changePercent > 2 ? "IMPROVING" : changePercent < -2 ? "LOWER" : "STEADY";
    return { exerciseId, recentSessions, previousSessions, recentBest, previousBest, changePercent, status };
  }).sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  const changes = lifts.flatMap((lift) => lift.changePercent === undefined ? [] : [lift.changePercent]);
  const overallChangePercent = changes.length >= 2 ? changes.reduce((sum, value) => sum + value, 0) / changes.length : undefined;
  const muscleSetsPerWeek: Partial<Record<MuscleGroup, number>> = {};
  for (const row of valid.filter((item) => Date.parse(item.at) >= recentStart && item.muscleGroup)) muscleSetsPerWeek[row.muscleGroup!] = (muscleSetsPerWeek[row.muscleGroup!] ?? 0) + .25;
  const balance = { push: 0, pull: 0, upper: 0, lower: 0, unclassified: 0 };
  for (const row of valid.filter((item) => Date.parse(item.at) >= recentStart)) {
    if (row.muscleGroup === "Chest" || row.muscleGroup === "Shoulders") balance.push += .25;
    else if (row.muscleGroup === "Back") balance.pull += .25;
    else balance.unclassified += .25;
    if (["Chest", "Back", "Shoulders", "Arms"].includes(row.muscleGroup ?? "")) balance.upper += .25;
    else if (row.muscleGroup === "Legs" || row.muscleGroup === "Glutes") balance.lower += .25;
  }
  return { lifts, comparableLifts: changes.length, overallChangePercent, muscleSetsPerWeek, balance };
}
