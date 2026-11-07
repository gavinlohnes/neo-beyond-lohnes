import { EXERCISE_LIBRARY, type MuscleGroup } from "../domain/workout/exerciseLibrary";
import type { PerformedSet } from "../domain/workout/types";
import { workoutVolumeLbs } from "./trainHistoryQueries";
import { db } from "../persistence/db";
import { getWeeklyDashboard, type WeeklyDashboard } from "./weeklyDashboardQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getNutritionTargets, getEffectiveProteinTargetG } from "./nutritionTargetQueries";
import { getUndoneSetIds } from "./trainQueries";
import { getSchedulePattern } from "./queries";
import { deriveWeekInNumbers } from "./weeklyDebrief";
import { isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";

/** Enriches the existing WeeklyDashboard, never creates a parallel review or writes. */
/** The default templates' exercises (domain/workout/types.ts), by the muscle group each mainly trains. */
const BUILT_IN_MUSCLES: Record<string, MuscleGroup> = {
  "machine-chest-press": "Chest", "pec-deck": "Chest", "lat-pulldown": "Back", "seated-cable-row": "Back",
  "reverse-pec-deck": "Shoulders", "leg-press": "Legs", "leg-curl": "Legs", "preacher-curl": "Arms", "triceps-pressdown": "Arms",
};

export async function getWeekInNumbers(current: WeeklyDashboard) {
  const [previous, summaries, open, targets, proteinG, undone, rawSets, done, schedule, custom] = await Promise.all([
    getWeeklyDashboard(1, new Date(current.week.end)), getDaySummaries(), getCurrentlyEligibleUnresolvedObligations(),
    getNutritionTargets(), getEffectiveProteinTargetG(), getUndoneSetIds(), db.performedSets.toArray(),
    db.events.where("type").equals("OBLIGATION_SATISFIED").toArray(), getSchedulePattern(), db.customExercises.toArray(),
  ]);
  const ids = new Set(current.rows.flatMap((r) => r.dayIds));
  const days = summaries.filter((d) => ids.has(d.beyondDayId));
  const sessions = days.flatMap((d) => d.workouts).filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL");
  const sessionIds = new Set(sessions.map((s) => s.sessionId));
  const sets = (rawSets as unknown as PerformedSet[]).filter((s) => sessionIds.has(s.sessionId) && !s.skipped && !undone.has(s.id));
  const inWeek = (iso: string) => Date.parse(iso) >= Date.parse(current.week.start) && Date.parse(iso) < Date.parse(current.week.end);
  const completions = done.filter((e) => inWeek(e.occurredAt));
  const completedIds = new Set(completions.flatMap((e) => e.obligationId ? [e.obligationId] : []));
  const completedDays = new Set(completions.map((e) => mostRecentBoundaryAtOrBefore(new Date(e.occurredAt)).toISOString())).size;
  const worked = new Set(days.filter((d) => d.work.workEndedAt).map((d) => d.livedDayStart)).size;
  const saved = isOperatorSavedSchedule(schedule);
  const scheduled = saved ? current.rows.filter((r) => scheduledWorkContextForLivedDay(new Date(r.start), schedule) === "WORK").length : null;
  // MUSCLE-MAP-001 (APPS-PICKS-003 pick 20, after Hevy): performed sets per muscle group, from the exercise's
  // library or custom muscle group. Exercises without a known group are counted as "Other", never guessed.
  const groupOf = new Map<string, string>([...Object.entries(BUILT_IN_MUSCLES), ...EXERCISE_LIBRARY.map((e) => [e.id, e.muscleGroup] as const), ...custom.map((e) => [e.id, e.muscleGroup] as const)]);
  const muscles = Object.entries(sets.reduce<Record<string, number>>((acc, set) => { const g = groupOf.get(set.exerciseId) ?? "Other"; acc[g] = (acc[g] ?? 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // WEEK-COMPARE-001: the week before, from the read above, for a side-by-side line. Null when it has no records.
  const before = previous.headline.recordedDays > 0 ? { start: previous.week.start, sessions: previous.headline.sessions, ...deriveWeekInNumbers(previous.rows, []) } : null;
  return { ...deriveWeekInNumbers(current.rows, previous.rows), week: current.week, before, muscles,
    targets: { calories: targets.calorieTargetKcal, proteinG },
    training: { sessions: sessionIds.size, sets: sets.length, volume: workoutVolumeLbs(sets), records: current.records.length, days: new Set(days.filter((d) => d.workouts.some((s) => sessionIds.has(s.sessionId))).map((d) => d.livedDayStart)).size },
    commitments: { done: completedIds.size, days: completedDays, open: open.length },
    shifts: { worked, scheduled, recordedDays: current.rows.filter((r) => r.dayIds.length).length },
  };
}
