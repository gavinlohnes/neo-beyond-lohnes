import { db } from "../persistence/db";
import { isWorkingSet, type PerformedSet } from "../domain/workout/types";
import { getStrengthReview } from "./strengthReviewQueries";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { getBodyweightHistoryWithSources } from "./bodyTrendQueries";
import { getUndoneSetIds } from "./trainQueries";
import { deriveTrainProgress, type FinishedSession, type Form, type TrainProgress } from "./trainProgress";

const SIT_UPS = new Set(["one-minute-sit-up-practice", "sit-up-practice"]);

/** Read only. TRAIN → PROGRESS. */
export async function getTrainProgress(now: Date = new Date()): Promise<TrainProgress> {
  const [review, view, sessions, sets, undone, weights] = await Promise.all([
    getStrengthReview(now), getProgrammeView(now).catch(() => null), db.workoutSessions.toArray(), db.performedSets.toArray(),
    getUndoneSetIds(), getBodyweightHistoryWithSources(),
  ]);
  const formOf = (s: (typeof sessions)[number]): Form =>
    s.programmeContext?.form ?? (s.sessionType === "REDUCED" ? "MINIMUM" : s.sessionType === "RECOVERY" ? "RECOVERY" : "FULL");
  const finished: FinishedSession[] = sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .map((s) => ({ at: s.endedAt ?? s.startedAt, form: formOf(s), status: s.status as "COMPLETED" | "PARTIAL" }));
  const bench = review.lifts.find((l) => l.exerciseId === "barbell-bench-press");
  const benchRow = bench ? review.records.filter((r) => r.exerciseId === "barbell-bench-press" && r.bodyweightLbs && now.getTime() - Date.parse(r.at) < 28 * 86_400_000)
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0] : undefined;
  const sitUps = (sets as unknown as PerformedSet[]).filter((s) => SIT_UPS.has(s.exerciseId) && !undone.has(s.id) && isWorkingSet(s) && s.reps > 0);
  const next = view?.sequence?.nextMember ? `${view.sequence.nextMember.key} · ${view.sequence.nextMember.name}` : null;
  return deriveTrainProgress({
    now, next, sessions: finished, lifts: review.lifts, names: review.names,
    strengthIndexChangePercent: review.strengthIndexChangePercent, comparableLifts: review.comparableLifts,
    bodyweights: weights.map((w) => ({ recordedAt: w.recordedAt, weightLbs: w.weightLbs })),
    benchRelative: benchRow ? { weight: benchRow.weight, reps: benchRow.reps, bodyweightLbs: benchRow.bodyweightLbs! } : null,
    sitUpBestReps: sitUps.length ? Math.max(...sitUps.map((s) => s.reps)) : null,
  });
}
