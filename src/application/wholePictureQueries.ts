import { db } from "../persistence/db";
import type { StateCheckIn } from "../domain/common/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import { getDaySummaries } from "./dayLedgerQueries";
import { getBodyweightHistoryWithSources } from "./bodyTrendQueries";
import { getMissions, getObligations, getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getReviewedDecisionJournalEntries } from "./journalQueries";
import { getUndoneSetIds } from "./trainQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";
import { getWeekAhead } from "./weekAheadQueries";
import { getWeeklyReviewRecords, findWeekReview } from "./weeklyReviewQueries";
import { getActiveDay } from "./queries";
import { latestReviewWeek } from "../engine/weeklyReview";
import { projectReviewRows } from "../engine/reviewOverview";
import { attachPictureCheckIns } from "./wholePictureProjection";
import { finishedLivedDays, livedDayBoundary } from "../engine/livedDaySeries";
import { restingByPeriod, stepsByPeriod } from "../domain/health/measuredSeries";
import type { Period } from "../domain/health/activityImport";
import type { PerformedSet } from "../domain/workout/types";

export interface PictureStory {
  id: string; kind: "COMMITMENT" | "LESSON"; at: string; title: string;
  status: string; mission: string | undefined; note: string | undefined;
  entry: DecisionJournalEntry | undefined;
}
export interface PictureLift {
  exerciseId: string; name: string;
  sets: { id: string; sessionId: string; dayId: string; at: string; weight: number; reps: number }[];
}
/** One consistent read transaction; no writes, day creation, source repair, provider or persisted rollup. */
export async function getWholePicture(now = new Date()) {
  return db.transaction("r", db.tables, async () => {
    const [summaries, weights, checkIns, hours, resting, missions, obligations, journal, sets, undone, names, weekAhead, reviews, activeDay, eligible] = await Promise.all([
      getDaySummaries(), getBodyweightHistoryWithSources(), db.checkIns.toArray(),
      db.externalActivityHours.toArray(), db.externalRestingHeartRates.toArray(),
      getMissions(), getObligations(), getReviewedDecisionJournalEntries(),
      db.performedSets.toArray(), getUndoneSetIds(), getExerciseNames(),
      getWeekAhead(now), getWeeklyReviewRecords(), getActiveDay(), getCurrentlyEligibleUnresolvedObligations(),
    ]);
    const window = finishedLivedDays(now, 0, 56);
    const baseRows = projectReviewRows(summaries, weights.flatMap((weight) => weight.beyondDayId ? [{ dayId: weight.beyondDayId, lbs: weight.weightLbs, at: weight.recordedAt, rootId: weight.rootEventId }] : []), window.from, 56);
    const rows = attachPictureCheckIns(baseRows, checkIns as StateCheckIn[]);
    const periods: Period[] = rows.map((row) => ({ from: Date.parse(row.start), to: livedDayBoundary(new Date(row.start), -1).getTime(), dayId: row.dayIds[0] ?? null }));
    const stepValues = stepsByPeriod(periods, hours, now.getTime());
    const restingValues = restingByPeriod(periods, resting, now.getTime());
    rows.forEach((row, index) => {
      row.steps = stepValues[index]!.value ?? undefined; row.resting = restingValues[index]!.value ?? undefined;
      row.measuredHours = hours.filter((hour) => Date.parse(hour.startTime) >= periods[index]!.from && Date.parse(hour.startTime) < periods[index]!.to && hour.steps !== null).length;
    });
    const missionNames = new Map(missions.map((mission) => [mission.id, mission.title]));
    const stories: PictureStory[] = [
      ...obligations.flatMap((item): PictureStory[] => item.resolvedAt && (item.status === "SATISFIED" || item.status === "RELEASED") ? [{ id: item.id, kind: "COMMITMENT", at: item.resolvedAt, title: item.title, status: item.status, mission: item.missionId ? missionNames.get(item.missionId) : undefined, note: item.resolutionNote, entry: undefined }] : []),
      ...journal.flatMap((entry): PictureStory[] => entry.reviewedAt ? [{ id: entry.id, kind: "LESSON", at: entry.reviewedAt, title: entry.title, status: "REVIEWED", mission: undefined, note: entry.lesson, entry }] : []),
    ].filter((story) => Date.parse(story.at) >= window.from.getTime() && Date.parse(story.at) < window.to.getTime())
      .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
    const countedSessions = new Map(summaries.flatMap((day) => day.workouts.filter((session) => (session.status === "COMPLETED" || session.status === "PARTIAL") && (session.sessionType === "STANDARD" || session.sessionType === "REDUCED"))
      .map((session) => [session.sessionId, { at: session.startedAt, dayId: day.beyondDayId }])));
    const validDayIds = new Set(rows.flatMap((row) => row.dayIds));
    const best = new Map<string, { set: PerformedSet; at: string; dayId: string }>();
    for (const raw of sets) {
      const set = raw as unknown as PerformedSet, session = countedSessions.get(set.sessionId);
      if (!session || !validDayIds.has(session.dayId) || undone.has(set.id) || set.skipped || set.substitutedName || !Number.isFinite(set.weight) || !Number.isFinite(set.reps) || set.reps <= 0) continue;
      const key = `${set.sessionId}:${set.exerciseId}`, previous = best.get(key);
      if (!previous || set.weight > previous.set.weight || (set.weight === previous.set.weight && set.reps > previous.set.reps)) best.set(key, { set, ...session });
    }
    const liftsById = new Map<string, PictureLift>();
    for (const { set, at, dayId } of best.values()) {
      const lift = liftsById.get(set.exerciseId) ?? { exerciseId: set.exerciseId, name: names[set.exerciseId] ?? set.exerciseId, sets: [] };
      lift.sets.push({ id: set.id, sessionId: set.sessionId, dayId, at, weight: set.weight, reps: set.reps }); liftsById.set(set.exerciseId, lift);
    }
    const lifts = [...liftsById.values()].map((lift) => ({ ...lift, sets: lift.sets.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)) })).sort((a, b) => b.sets.length - a.sets.length || a.name.localeCompare(b.name));
    const measurements = Object.fromEntries(periods.map((period, index) => [rows[index]!.start, {
      hours: hours.filter((hour) => Date.parse(hour.startTime) >= period.from && Date.parse(hour.startTime) < period.to),
      resting: resting.filter((reading) => Date.parse(reading.time) >= period.from && Date.parse(reading.time) < period.to),
    }]));
    const week = latestReviewWeek(now);
    return { readAt: now.toISOString(), rows, measurements, stories, lifts, weekAhead, week, savedReview: findWeekReview(reviews, week), canSave: Boolean(activeDay), eligibleCommitments: eligible };
  });
}
export type WholePictureData = Awaited<ReturnType<typeof getWholePicture>>;
