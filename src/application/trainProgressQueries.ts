import { db } from "../persistence/db";
import { isWorkingSet, type PerformedSet } from "../domain/workout/types";
import { getStrengthReview } from "./strengthReviewQueries";
import { getProgrammeView } from "./trainingProgrammeQueries";
import { getBodyweightHistoryWithSources } from "./bodyTrendQueries";
import { getUndoneSetIds } from "./trainQueries";
import { getStandardResults, readStandardTargets } from "./standardTestQueries";
import { deriveTrainProgress, type FinishedSession, type Form, type NextState, type TrainProgress } from "./trainProgress";

const SIT_UPS = new Set(["one-minute-sit-up-practice", "sit-up-practice"]);

/** Read only. TRAIN → PROGRESS. */
export async function getTrainProgress(now: Date = new Date()): Promise<TrainProgress> {
  const [review, view, sessions, sets, undone, weights, standardResults] = await Promise.all([
    getStrengthReview(now), getProgrammeView(now).catch(() => null), db.workoutSessions.toArray(), db.performedSets.toArray(),
    getUndoneSetIds(), getBodyweightHistoryWithSources(), getStandardResults(),
  ]);
  const formOf = (s: (typeof sessions)[number]): Form =>
    s.programmeContext?.form ?? (s.sessionType === "REDUCED" ? "MINIMUM" : s.sessionType === "RECOVERY" ? "RECOVERY" : "FULL");
  const finished: FinishedSession[] = sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .map((s) => ({ at: s.endedAt ?? s.startedAt, form: formOf(s), status: s.status as "COMPLETED" | "PARTIAL" }));
  const bench = review.lifts.find((l) => l.exerciseId === "barbell-bench-press");
  // The bodyweight beside a bench set must be from within 2 weeks before it, not any older weigh-in.
  const weighInNear = (at: string) => weights.filter((w) => Date.parse(w.recordedAt) <= Date.parse(at) && Date.parse(at) - Date.parse(w.recordedAt) <= 14 * 86_400_000)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1)?.weightLbs;
  const benchRow = bench ? review.records.filter((r) => r.exerciseId === "barbell-bench-press" && now.getTime() - Date.parse(r.at) < 28 * 86_400_000 && weighInNear(r.at) !== undefined)
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0] : undefined;
  const sitUps = (sets as unknown as PerformedSet[]).filter((s) => SIT_UPS.has(s.exerciseId) && !undone.has(s.id) && isWorkingSet(s) && s.reps > 0);
  // NONE only when no A → B → C is active; a sequence whose next member can't be named, or an unreadable programme,
  // is UNKNOWN with its reason (review on #625: never "no sequence" when one exists).
  const seq = view === null ? undefined : view.sequence;
  const next: NextState = view === null ? { kind: "UNKNOWN", why: "The programme couldn't be read." }
    : !seq ? { kind: "NONE" }
    : seq.status === "UNKNOWN" || !seq.nextMember ? { kind: "UNKNOWN", why: seq.why }
    : { kind: "KNOWN", label: `${seq.nextMember.key} · ${seq.nextMember.name}` };
  return deriveTrainProgress({
    now, next, sessions: finished, lifts: review.lifts, names: review.names,
    strengthIndexChangePercent: review.strengthIndexChangePercent, comparableLifts: review.comparableLifts,
    bodyweights: weights.map((w) => ({ recordedAt: w.recordedAt, weightLbs: w.weightLbs })),
    benchRelative: benchRow ? { weight: benchRow.weight, reps: benchRow.reps, bodyweightLbs: weighInNear(benchRow.at)! } : null,
    sitUpBestReps: sitUps.length ? Math.max(...sitUps.map((s) => s.reps)) : null,
    standardResults, standardTargets: readStandardTargets(),
  });
}
