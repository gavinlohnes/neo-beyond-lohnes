import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { getBodyweightHistory } from "./bodyTrendQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";
import { getSleepEntries } from "./queries";
import { getQuitHabit } from "./quitQueries";
import { getUndoneSetIds } from "./trainQueries";

/**
 * MIRROR-001 (owner brief 2026-10-05; approved merge: the Mirror lives in
 * Weekly). You now against 30 and 90 days ago: weight, top lifts, average
 * sleep, clean days. Read only, and honest: a value with nothing behind it
 * is null ("not enough data yet"), never estimated.
 *
 * Each value is read as of its moment ("then" = that date at the same time
 * of day as now):
 * - weight: the average of weigh-ins in the 7 days ending then;
 * - a top lift: the heaviest counted set on record by then (the 3 lifts with
 *   the most finished sessions overall; substituted, skipped, undone sets and
 *   unfinished sessions left out, as RECORDS counts them);
 * - sleep: the average main (PRIMARY) sleep over BEYOND days that began in the
 *   7 days ending then (each day's latest main sleep);
 * - clean days: BEYOND days logged clean that began in the 30 days ending then
 *   — null when no quit tracker is set up, or it was set up after "then".
 */
export const MIRROR_OFFSETS_DAYS = [0, 30, 90] as const;
export const MIRROR_TOP_LIFTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MirrorColumn {
  /** Days back from now: 0, 30 or 90. */
  daysAgo: number;
  weightLbs: number | null;
  avgSleepMinutes: number | null;
  cleanDays: number | null;
  /** Heaviest counted set by then, per top lift, in `lifts` order. */
  liftLbs: (number | null)[];
}

export interface Mirror {
  lifts: { exerciseId: string; name: string }[];
  columns: MirrorColumn[];
}

const average = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

export async function getMirror(now: Date = new Date()): Promise<Mirror> {
  const [weighIns, days, sessions, undone, names, habit, cleanEvents] = await Promise.all([
    getBodyweightHistory(),
    db.beyondDays.toArray(),
    db.workoutSessions.toArray(),
    getUndoneSetIds(),
    getExerciseNames(),
    getQuitHabit(),
    db.events.where("type").equals("CLEAN_DAY_LOGGED").toArray(),
  ]);
  const firstDayAt = days.length ? Math.min(...days.map((d) => new Date(d.startedAt).getTime())) : null;

  const finished = new Map(
    sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL").map((s) => [s.id, new Date(s.startedAt).getTime()] as const),
  );
  const sets = ((await db.performedSets.toArray()) as unknown as PerformedSet[]).filter(
    (s) => finished.has(s.sessionId) && !undone.has(s.id) && !s.skipped && s.reps > 0 && !s.substitutedName,
  );
  const sessionsPerLift = new Map<string, Set<string>>();
  for (const s of sets) sessionsPerLift.set(s.exerciseId, (sessionsPerLift.get(s.exerciseId) ?? new Set()).add(s.sessionId));
  const lifts = [...sessionsPerLift.entries()]
    .sort((a, b) => b[1].size - a[1].size || (names[a[0]] ?? a[0]).localeCompare(names[b[0]] ?? b[0]))
    .slice(0, MIRROR_TOP_LIFTS)
    .map(([exerciseId]) => ({ exerciseId, name: names[exerciseId] ?? exerciseId }));

  // Each day's latest main sleep, by the day's start.
  const mainSleepByDay: { startedAt: number; minutes: number }[] = [];
  for (const day of days) {
    const primary = (await getSleepEntries(day.id)).filter((e) => e.kind === "PRIMARY");
    if (primary.length) mainSleepByDay.push({ startedAt: new Date(day.startedAt).getTime(), minutes: primary.at(-1)!.effectiveDurationMinutes });
  }
  const dayStart = new Map(days.map((d) => [d.id, new Date(d.startedAt).getTime()] as const));
  const cleanStarts = [...new Set(cleanEvents.flatMap((e) => (e.beyondDayId ? [e.beyondDayId] : [])))]
    .map((id) => dayStart.get(id))
    .filter((t): t is number => t !== undefined);

  const columns = MIRROR_OFFSETS_DAYS.map((daysAgo): MirrorColumn => {
    const then = now.getTime() - daysAgo * DAY_MS;
    if (firstDayAt === null || then < firstDayAt) {
      return { daysAgo, weightLbs: null, avgSleepMinutes: null, cleanDays: null, liftLbs: lifts.map(() => null) };
    }
    const inWindow = (t: number, days: number) => t <= then && t > then - days * DAY_MS;
    const weight = average(weighIns.filter((w) => inWindow(new Date(w.recordedAt).getTime(), 7)).map((w) => w.weightLbs));
    const sleep = average(mainSleepByDay.filter((d) => inWindow(d.startedAt, 7)).map((d) => d.minutes));
    const tracking = habit !== undefined && new Date(habit.createdAt).getTime() <= then;
    const clean = tracking ? cleanStarts.filter((t) => inWindow(t, 30)).length : null;
    const liftLbs = lifts.map(({ exerciseId }) => {
      const by = sets.filter((s) => s.exerciseId === exerciseId && finished.get(s.sessionId)! <= then).map((s) => s.weight);
      return by.length ? Math.max(...by) : null;
    });
    return {
      daysAgo,
      weightLbs: weight === null ? null : Math.round(weight * 10) / 10,
      avgSleepMinutes: sleep === null ? null : Math.round(sleep),
      cleanDays: clean,
      liftLbs,
    };
  });
  return { lifts, columns };
}
