/**
 * GRAYSON-TRAIN-RUN-001 (Gavin, 2026-11-24, backlog B1): the 9-week run/walk plan as pure data.
 *
 * Interval structure only, transcribed from the NHS Couch to 5K plan page (read 2026-11-24): no NHS audio,
 * coach voices, logo or branding. Every run is a 5-minute warm-up walk, the main set, and a 5-minute cool-down
 * walk. In this codebase "run" already means a work run (a shift), so identifiers say "running".
 *
 * His plan is this pattern plus every edit he makes (RUNNING_PLAN_EDITED snapshots, projected in
 * application/runningQueries.ts); the NHS pattern always stays available to reset to.
 */

export type RunningSegmentKind = "WARMUP" | "RUN" | "WALK" | "COOLDOWN";
export interface RunningSegment { kind: RunningSegmentKind; seconds: number }
export type RunningPhase = "FOUNDATION" | "SPECIFIC";
export interface RunningPosition { week: number; run: number }

/** A plan version: weeks[w - 1][r - 1] is week w, run r. Only FOUNDATION has content in B1. */
export interface RunningPlan {
  planId: string;
  phase: RunningPhase;
  weeks: RunningSegment[][][];
}

/** His weekly-count settings, carried in the same plan snapshot so one event history holds his whole version. */
export interface RunningWeekSettings {
  /** How many runs a week he expects, 1–4. Information only. */
  runsPerWeek: number;
  /** Whether one more run past that shows as optional. */
  showOptional: boolean;
  /** The day the weekly count starts: 0 = Sunday … 6 = Saturday. */
  weekStartsOn: number;
}

export interface RunningPlanVersion extends RunningPlan, RunningWeekSettings {}

export const RUNNING_PLAN_ID = "nhs-couch-to-5k";
export const RUNNING_PLAN_SOURCE = {
  text: "Interval pattern from the NHS Couch to 5K plan",
  url: "https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/",
} as const;

export const RUNNING_WEEK_DEFAULTS: RunningWeekSettings = { runsPerWeek: 2, showOptional: true, weekStartsOn: 1 };
export const RUNNING_SEGMENT_STEP_SECONDS = 5;
export const RUNNING_SEGMENT_MIN_SECONDS = 5;
export const RUNNING_SEGMENT_MAX_SECONDS = 90 * 60;
export const RUNNING_RUNS_PER_WEEK_MAX = 4;
/** A week may hold a few added runs beyond the plan's three; more than this is almost certainly a slip. */
export const RUNNING_RUNS_IN_WEEK_MAX = 7;

const m = (minutes: number) => Math.round(minutes * 60);
const run = (minutes: number): RunningSegment => ({ kind: "RUN", seconds: m(minutes) });
const walk = (minutes: number): RunningSegment => ({ kind: "WALK", seconds: m(minutes) });

/** Warm-up walk + main set + cool-down walk. */
function session(main: readonly RunningSegment[]): RunningSegment[] {
  return [{ kind: "WARMUP", seconds: m(5) }, ...main.map((s) => ({ ...s })), { kind: "COOLDOWN", seconds: m(5) }];
}
function repeat(times: number, pair: readonly RunningSegment[], last: RunningSegment): RunningSegment[] {
  return [...Array.from({ length: times }, () => pair.map((s) => ({ ...s }))).flat(), { ...last }];
}
const same = (main: readonly RunningSegment[]): RunningSegment[][] => [session(main), session(main), session(main)];

export const RUNNING_PLAN_FOUNDATION: RunningPlan = {
  planId: RUNNING_PLAN_ID,
  phase: "FOUNDATION",
  weeks: [
    same(repeat(7, [run(1), walk(1.5)], run(1))),
    same(repeat(5, [run(1.5), walk(2)], run(1.5))),
    same([run(1.5), walk(1.5), run(3), walk(3), run(1.5), walk(1.5), run(3)]),
    same([run(3), walk(1.5), run(5), walk(2.5), run(3), walk(1.5), run(5)]),
    [session([run(5), walk(3), run(5), walk(3), run(5)]), session([run(8), walk(5), run(8)]), session([run(20)])],
    [session([run(5), walk(3), run(8), walk(3), run(5)]), session([run(10), walk(3), run(10)]), session([run(25)])],
    same([run(25)]),
    same([run(28)]),
    same([run(30)]),
  ],
};

export function defaultRunningPlanVersion(): RunningPlanVersion {
  return { ...structuredClone(RUNNING_PLAN_FOUNDATION), ...RUNNING_WEEK_DEFAULTS };
}

export function runningTotalSeconds(segments: readonly RunningSegment[]): number {
  return segments.reduce((total, s) => total + s.seconds, 0);
}

export function runningSegmentsAt(plan: RunningPlan, position: RunningPosition): RunningSegment[] | null {
  const segments = plan.weeks[position.week - 1]?.[position.run - 1];
  return segments ? segments.map((s) => ({ ...s })) : null;
}

/** The NHS pattern for one run, for "Reset this run". Added runs (past the plan's three) have none. */
export function foundationSegmentsAt(position: RunningPosition): RunningSegment[] | null {
  return runningSegmentsAt(RUNNING_PLAN_FOUNDATION, position);
}

/** The run after this one in plan order, or null after the last run of the last week. */
export function nextRunningPosition(plan: RunningPlan, position: RunningPosition): RunningPosition | null {
  const week = plan.weeks[position.week - 1];
  if (week && position.run < week.length) return { week: position.week, run: position.run + 1 };
  for (let w = position.week + 1; w <= plan.weeks.length; w += 1) if ((plan.weeks[w - 1]?.length ?? 0) > 0) return { week: w, run: 1 };
  return null;
}

export function isRunningPositionInPlan(plan: RunningPlan, position: RunningPosition): boolean {
  return Number.isInteger(position.week) && Number.isInteger(position.run) && position.week >= 1 && position.run >= 1
    && Boolean(plan.weeks[position.week - 1]?.[position.run - 1]);
}

const KINDS: readonly RunningSegmentKind[] = ["WARMUP", "RUN", "WALK", "COOLDOWN"];

/** Null when a run's segments can be run; otherwise the plain message to show him. */
export function validateRunningSegments(segments: readonly RunningSegment[]): string | null {
  if (!Array.isArray(segments) || segments.length === 0) return "A run needs at least one running interval.";
  for (const s of segments) {
    if (!s || !KINDS.includes(s.kind) || !Number.isInteger(s.seconds)) return "Each interval needs a type and a whole number of seconds.";
    if (s.seconds < RUNNING_SEGMENT_MIN_SECONDS) return "Each interval needs at least 5 seconds.";
    if (s.seconds > RUNNING_SEGMENT_MAX_SECONDS) return "An interval can be at most 90 minutes.";
  }
  if (!segments.some((s) => s.kind === "RUN")) return "A run needs at least one running interval.";
  return null;
}

export function validateRunningWeekSettings(settings: RunningWeekSettings): string | null {
  if (!Number.isInteger(settings.runsPerWeek) || settings.runsPerWeek < 1 || settings.runsPerWeek > RUNNING_RUNS_PER_WEEK_MAX) return "Runs a week can be 1 to 4.";
  if (typeof settings.showOptional !== "boolean") return "Choose whether one more run shows as optional.";
  if (!Number.isInteger(settings.weekStartsOn) || settings.weekStartsOn < 0 || settings.weekStartsOn > 6) return "Choose a day for the week to start.";
  return null;
}

/** Null when a whole plan version is usable (every week has a run; every run passes validateRunningSegments). */
export function validateRunningPlanVersion(plan: RunningPlanVersion): string | null {
  if (!plan || !Array.isArray(plan.weeks) || plan.weeks.length === 0) return "The plan needs at least one week.";
  for (const week of plan.weeks) {
    if (!Array.isArray(week) || week.length === 0) return "Each week needs at least one run.";
    if (week.length > RUNNING_RUNS_IN_WEEK_MAX) return `A week can hold at most ${RUNNING_RUNS_IN_WEEK_MAX} runs.`;
    for (const segments of week) { const problem = validateRunningSegments(segments); if (problem) return problem; }
  }
  return validateRunningWeekSettings(plan);
}
