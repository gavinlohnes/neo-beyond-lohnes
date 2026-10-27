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
import { getActiveDay, getSchedulePattern } from "./queries";
import { livedDayShiftWindow } from "../engine/scheduledContext";
import type { DomainEvent, SleepLoggedPayload } from "../domain/common/types";
import type { ExternalSleepRevision } from "../domain/health/sleepImport";
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
    const [sleepEvents, revisions, pattern] = await Promise.all([
      db.events.where("type").anyOf(["SLEEP_LOGGED", "SLEEP_LOG_CORRECTED", "SLEEP_LOG_VOIDED"]).toArray(),
      db.externalSleepRevisions.toArray(), getSchedulePattern(),
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
    // ROTATION-002: times only where they are known — Garmin's record behind the day's one main sleep,
    // uncorrected by the owner — and the scheduled shift on a recorded work day.
    const timing = sleepTiming(sleepEvents as DomainEvent[], revisions);
    const naps = new Map(summaries.flatMap((day) => day.sleep.napMinutes === undefined ? [] : [[day.beyondDayId, day.sleep.napMinutes] as const]));
    for (const row of rows) {
      const napped = row.dayIds.flatMap((id) => naps.has(id) ? [naps.get(id)!] : []);
      row.napMinutes = napped.length ? napped.reduce((a, b) => a + b, 0) : undefined;
      const from = Date.parse(row.start), minutes = (t: number) => Math.round((t - from) / 60000);
      const window = row.sleepHours !== undefined && row.dayIds.length === 1 ? timing.get(row.dayIds[0]!) : undefined;
      row.sleepWindow = window ? { start: minutes(window.start), end: minutes(window.end) } : undefined;
      const shift = row.context === "WORK" ? livedDayShiftWindow(new Date(row.start), pattern) : null;
      row.shiftWindow = shift ? { start: minutes(shift.start.getTime()), end: minutes(shift.end.getTime()) } : undefined;
    }
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
/** Per BEYOND day: the Garmin start/end behind its single live main-sleep log, when the owner has not corrected it. */
function sleepTiming(events: readonly DomainEvent[], revisions: readonly ExternalSleepRevision[]): Map<string, { start: number; end: number }> {
  const voided = new Set(events.filter((e) => e.type === "SLEEP_LOG_VOIDED").map((e) => (e.payload as { loggedEventId: string }).loggedEventId));
  // Garmin's own corrections carry the newer version's source; any owner correction makes the times unknown.
  const corrections = events.filter((e) => e.type === "SLEEP_LOG_CORRECTED").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const ownerCorrected = new Set(corrections.filter((e) => e.source === "USER").map((e) => (e.payload as { originalEventId: string }).originalEventId));
  const latestSource = new Map(corrections.flatMap((e) => {
    const payload = e.payload as { originalEventId: string; source?: SleepLoggedPayload["source"] };
    return payload.source ? [[payload.originalEventId, payload.source] as const] : [];
  }));
  const evidence = new Map(revisions.map((r) => [`${r.recordKey}\u0000${r.sourceVersion}`, r.evidence]));
  const live = new Map<string, DomainEvent[]>();
  for (const e of events) {
    const payload = e.payload as SleepLoggedPayload;
    if (e.type !== "SLEEP_LOGGED" || !e.beyondDayId || voided.has(e.id) || (payload.kind ?? "PRIMARY") !== "PRIMARY") continue;
    live.set(e.beyondDayId, [...(live.get(e.beyondDayId) ?? []), e]);
  }
  const result = new Map<string, { start: number; end: number }>();
  for (const [dayId, logs] of live) {
    const only = logs.length === 1 ? logs[0]! : undefined;
    const source = only && (latestSource.get(only.id) ?? (only.payload as SleepLoggedPayload).source);
    if (!only || !source || ownerCorrected.has(only.id)) continue;
    const record = evidence.get(`${source.recordKey}\u0000${source.sourceVersion}`);
    const start = record ? Date.parse(record.startTime) : NaN, end = record ? Date.parse(record.endTime) : NaN;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) result.set(dayId, { start, end });
  }
  return result;
}
export type WholePictureData = Awaited<ReturnType<typeof getWholePicture>>;
