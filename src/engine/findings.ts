import type { SchedulePattern } from "../domain/common/types";
import type { PerformedSet } from "../domain/workout/types";
import type { DaySummary, LedgerWorkout } from "./dayLedger";
import { findSessionRecords } from "./personalRecords";
import { livedDayShiftWindow, type SchedulePhase } from "./scheduledContext";

/**
 * READ-ONLY FINDINGS (owner approval 2026-10-03: "read-only findings over
 * workout data are approved, including stall detection and the exercise
 * story as findings"). A fixed catalogue of five templates computed over
 * the Day Ledger and logged sets. Pure, deterministic, recomputed on every
 * read — nothing is stored, nothing feeds the Engine, nothing can be
 * accepted or executed. Findings never become rules here; adopting one as
 * a rule is a separate, later owner decision.
 *
 * Counts only (NO_FAKE_PRECISION): every finding carries the real numbers
 * and the window it was counted over, and never claims a cause or a
 * tendency. A template with too little data abstains — it's listed as
 * waiting, with how much it has and needs, never shown as a finding.
 */

/** Comparison and timing findings look back this far. */
export const FINDINGS_WINDOW_DAYS = 45;
/** A comparison needs at least this many workouts on EACH side to show. */
export const MIN_PER_ARM = 6;
/** Urge timing needs at least this many urges in the window. */
export const MIN_URGES = 6;
/** "Short" main sleep: under this many minutes. */
export const SHORT_SLEEP_MINUTES = 6 * 60;
/** A main-sleep log counts as "before" a workout when logged within this long before it started. */
export const SLEEP_LOOKBACK_HOURS = 24;
/** A stall: this many sessions in a row of one exercise with no new record. */
export const STALL_SESSIONS = 4;
/** Stall and story only cover exercises done within this many days. */
export const RECENT_EXERCISE_DAYS = 28;
/** An exercise story needs at least this many sessions… */
export const STORY_MIN_SESSIONS = 4;
/** …spanning at least this many days. */
export const STORY_MIN_DAYS = 14;
/** At most this many stall / story findings each, so a big history stays calm. */
export const MAX_PER_EXERCISE_TEMPLATE = 2;

export interface WorkoutArm {
  /** Finished workouts (COMPLETED or PARTIAL) on this side. */
  workouts: number;
  /** Of those, how many were COMPLETED. */
  completed: number;
  /** PRs those workouts set. */
  prs: number;
}

export type Finding =
  | { kind: "SLEEP_BEFORE_WORKOUT"; windowDays: number; shortSleepMinutes: number; shortSleep: WorkoutArm; longerSleep: WorkoutArm }
  | { kind: "TRAINING_WINDOW"; windowDays: number; beforeShift: WorkoutArm; afterShift: WorkoutArm }
  | { kind: "URGE_TIMING"; windowDays: number; total: number; byPhase: { phase: SchedulePhase; count: number }[] }
  | { kind: "STALL"; exerciseId: string; sessions: number; topWeights: { min: number; max: number } }
  | { kind: "EXERCISE_STORY"; exerciseId: string; fromWeight: number; toWeight: number; sessions: number; days: number };

export type FindingKind = Finding["kind"];

/** A template that abstained: what it has, against what it needs. */
export interface WaitingFinding {
  kind: "SLEEP_BEFORE_WORKOUT" | "TRAINING_WINDOW" | "URGE_TIMING";
  have: number;
  need: number;
}

export interface FindingsResult {
  findings: Finding[];
  waiting: WaitingFinding[];
}

export interface FindingsInput {
  summaries: readonly DaySummary[];
  /** Logged sets with undone ones already removed. */
  sets: readonly PerformedSet[];
  schedule: SchedulePattern;
  now: Date;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const PHASE_ORDER: SchedulePhase[] = ["EXPECTED_POST_WORK", "OFF", "PRE_WORK", "SCHEDULED_SHIFT"];

function isFinished(w: LedgerWorkout): boolean {
  return w.status === "COMPLETED" || w.status === "PARTIAL";
}

function emptyArm(): WorkoutArm {
  return { workouts: 0, completed: 0, prs: 0 };
}

function addTo(arm: WorkoutArm, w: LedgerWorkout): void {
  arm.workouts += 1;
  if (w.status === "COMPLETED") arm.completed += 1;
  arm.prs += w.prCount ?? 0;
}

export function projectFindings(input: FindingsInput): FindingsResult {
  const since = input.now.getTime() - FINDINGS_WINDOW_DAYS * DAY_MS;
  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t > since && t <= input.now.getTime();
  };
  const findings: Finding[] = [];
  const waiting: WaitingFinding[] = [];

  const recentWorkouts = input.summaries.flatMap((day) =>
    day.workouts.filter((w) => isFinished(w) && inWindow(w.startedAt)).map((w) => ({ day, w })),
  );

  // 1. Main sleep before a workout: the latest main-sleep log in the 24 h before it started.
  const sleepLogs = input.summaries
    .flatMap((d) => d.sleep.primaryLogs ?? [])
    .map((log) => ({ t: new Date(log.at).getTime(), minutes: log.minutes }))
    .sort((a, b) => a.t - b.t);
  const shortSleep = emptyArm();
  const longerSleep = emptyArm();
  for (const { w } of recentWorkouts) {
    const start = new Date(w.startedAt).getTime();
    let before: { minutes: number } | undefined;
    for (const log of sleepLogs) {
      if (log.t > start) break;
      if (log.t >= start - SLEEP_LOOKBACK_HOURS * HOUR_MS) before = log;
    }
    if (!before) continue;
    addTo(before.minutes < SHORT_SLEEP_MINUTES ? shortSleep : longerSleep, w);
  }
  if (Math.min(shortSleep.workouts, longerSleep.workouts) >= MIN_PER_ARM) {
    findings.push({ kind: "SLEEP_BEFORE_WORKOUT", windowDays: FINDINGS_WINDOW_DAYS, shortSleepMinutes: SHORT_SLEEP_MINUTES, shortSleep, longerSleep });
  } else {
    waiting.push({ kind: "SLEEP_BEFORE_WORKOUT", have: Math.min(shortSleep.workouts, longerSleep.workouts), need: MIN_PER_ARM });
  }

  // 2. Before vs after the shift, on days declared as work days. "After" starts at the
  // scheduled shift end, or at MARK WORK ENDED when that came earlier (but after the start).
  const beforeShift = emptyArm();
  const afterShift = emptyArm();
  for (const { day, w } of recentWorkouts) {
    if (day.work.declared !== "WORK") continue;
    const shift = livedDayShiftWindow(new Date(day.startedAt), input.schedule);
    if (!shift) continue;
    const start = new Date(w.startedAt).getTime();
    const endedEarly = day.work.workEndedAt ? new Date(day.work.workEndedAt).getTime() : undefined;
    const shiftOver =
      endedEarly !== undefined && endedEarly > shift.start.getTime() && endedEarly < shift.end.getTime() ? endedEarly : shift.end.getTime();
    if (start < shift.start.getTime()) addTo(beforeShift, w);
    else if (start >= shiftOver) addTo(afterShift, w);
  }
  if (Math.min(beforeShift.workouts, afterShift.workouts) >= MIN_PER_ARM) {
    findings.push({ kind: "TRAINING_WINDOW", windowDays: FINDINGS_WINDOW_DAYS, beforeShift, afterShift });
  } else {
    waiting.push({ kind: "TRAINING_WINDOW", have: Math.min(beforeShift.workouts, afterShift.workouts), need: MIN_PER_ARM });
  }

  // 3. When urges came, against the schedule.
  const urges = input.summaries.flatMap((d) => d.urges).filter((u) => inWindow(u.at));
  if (urges.length >= MIN_URGES) {
    const byPhase = PHASE_ORDER.map((phase) => ({ phase, count: urges.filter((u) => u.phase === phase).length }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count || PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));
    findings.push({ kind: "URGE_TIMING", windowDays: FINDINGS_WINDOW_DAYS, total: urges.length, byPhase });
  } else {
    waiting.push({ kind: "URGE_TIMING", have: urges.length, need: MIN_URGES });
  }

  // 4 + 5. Per exercise, over every finished session that logged it.
  const perExercise = exerciseHistories(input);
  const recentCutoff = input.now.getTime() - RECENT_EXERCISE_DAYS * DAY_MS;
  const active = [...perExercise.entries()]
    .filter(([, sessions]) => sessions[sessions.length - 1]!.t > recentCutoff)
    // Most-trained first; exercise id breaks ties so the order is stable.
    .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b));

  let stalls = 0;
  for (const [exerciseId, sessions] of active) {
    if (stalls >= MAX_PER_EXERCISE_TEMPLATE) break;
    // The first session can never set a record (nothing to beat), so a stall needs one more before the run.
    if (sessions.length < STALL_SESSIONS + 1) continue;
    const run = sessions.slice(-STALL_SESSIONS);
    if (run.some((s) => s.record)) continue;
    const tops = run.map((s) => s.topWeight);
    findings.push({ kind: "STALL", exerciseId, sessions: STALL_SESSIONS, topWeights: { min: Math.min(...tops), max: Math.max(...tops) } });
    stalls += 1;
  }

  let stories = 0;
  for (const [exerciseId, sessions] of active) {
    if (stories >= MAX_PER_EXERCISE_TEMPLATE) break;
    if (sessions.length < STORY_MIN_SESSIONS) continue;
    const first = sessions[0]!;
    const last = sessions[sessions.length - 1]!;
    const days = Math.round((last.t - first.t) / DAY_MS);
    if (days < STORY_MIN_DAYS || first.topWeight === last.topWeight || first.topWeight <= 0 || last.topWeight <= 0) continue;
    findings.push({ kind: "EXERCISE_STORY", exerciseId, fromWeight: first.topWeight, toWeight: last.topWeight, sessions: sessions.length, days });
    stories += 1;
  }

  return { findings, waiting };
}

interface ExerciseSession {
  t: number;
  topWeight: number;
  /** This session set a record (heaviest or reps) for the exercise. */
  record: boolean;
}

/** Every finished session's top set per exercise, oldest first, judged for records the way the ledger judges PRs. */
function exerciseHistories(input: FindingsInput): Map<string, ExerciseSession[]> {
  const sessions = input.summaries
    .flatMap((d) => d.workouts)
    .filter(isFinished)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const setsBySession = new Map<string, PerformedSet[]>();
  for (const set of input.sets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }

  const history = new Map<string, ExerciseSession[]>();
  const prior: PerformedSet[] = [];
  for (const session of sessions) {
    const sets = setsBySession.get(session.sessionId) ?? [];
    const records = findSessionRecords(prior, sets);
    const counted = sets.filter((s) => !s.skipped && !s.substitutedName && s.reps > 0);
    const byExercise = new Map<string, PerformedSet[]>();
    for (const set of counted) {
      const list = byExercise.get(set.exerciseId) ?? [];
      list.push(set);
      byExercise.set(set.exerciseId, list);
    }
    for (const [exerciseId, exSets] of byExercise) {
      const list = history.get(exerciseId) ?? [];
      list.push({
        t: new Date(session.startedAt).getTime(),
        topWeight: Math.max(...exSets.map((s) => s.weight)),
        record: exSets.some((s) => records.has(s.id)),
      });
      history.set(exerciseId, list);
    }
    prior.push(...sets);
  }
  return history;
}
