import type { LiftStrengthReview } from "../engine/strengthReview";
import type { StandardTestKind } from "../domain/common/types";
import {
  describeStandardChange, describeStandardTarget, formatStandardValue, STANDARD_TEST, standardDate, type StandardResult,
} from "../domain/workout/standardTests";

/**
 * GRAYSON-TRAIN-PROGRESS-001 (Gavin, 2026-11-23: "Forms + Progress", design GRAYSON_TRAIN_INTELLIGENCE §8): TRAIN's
 * Progress & Direction, read only. It answers "Where am I? Where am I going? Is this working? What should change?"
 * from records BEYOND already keeps, in the design's evidence vocabulary (observed, derived estimate, proxy,
 * unknown). It never changes the programme, a target or advice; adaptation is a later, separately approved step.
 * No streaks, no "missed", no claim that muscle grew.
 */

export type EvidenceClass = "OBSERVED" | "ESTIMATE" | "PROXY" | "UNKNOWN";
export type Assessment = "WORKING" | "UNCERTAIN" | "NEEDS ATTENTION";
export type Form = "FULL" | "SHORT" | "MINIMUM" | "HOME" | "RECOVERY";

/** Evidence floors (design §7): below them the verdict is UNCERTAIN, never a guess. */
export const MIN_SESSIONS_28D = 6;
export const MIN_COMPARABLE_LIFTS = 2;

export interface FinishedSession { at: string; form: Form; status: "COMPLETED" | "PARTIAL" }
export interface Standard {
  name: string;
  evidence: EvidenceClass;
  text: string;
  /** GRAYSON-TRAIN-STANDARDS-001: set on the three tests he records; bench has none (it's observed from his sets). */
  test?: StandardTestKind;
  /** Every standing result for this test, newest first. */
  results?: StandardResult[];
  /** His own target, if he set one. */
  target?: number;
}
/** Where the A → B → C stands: none active, unknown (with the programme's own reason), or a named next member. */
export type NextState = { kind: "NONE" } | { kind: "UNKNOWN"; why: string } | { kind: "KNOWN"; label: string };
export interface TrainProgress {
  where: { next: NextState; strength28: number; sessions28: number; byForm: Partial<Record<Form, number>>; perWeek: number[] };
  standards: Standard[];
  lifts: { name: string; status: LiftStrengthReview["status"]; text: string }[];
  bodyweight: { evidence: EvidenceClass; text: string };
  assessment: { state: Assessment; verdict: string; why: string[]; missing: string[]; confidence: "LOW" | "MODERATE" };
}

const DAY = 86_400_000;
/** "barbell-bench-press" → "Barbell Bench Press", for a library lift without a stored display name. */
const readableName = (id: string) => id.replace(/^lib-/, "").split("-").map((w) => w ? w[0]!.toUpperCase() + w.slice(1) : w).join(" ");
const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const lb = (n: number) => `${Math.round(n * 10) / 10} lb`;

/** Pure. Sessions per week for the last four weeks, oldest first; a week with none is 0, never "missed". */
export function weeklyCounts(sessions: readonly FinishedSession[], now: Date): number[] {
  return [3, 2, 1, 0].map((w) => sessions.filter((s) => {
    const age = now.getTime() - Date.parse(s.at);
    return age >= w * 7 * DAY && age < (w + 1) * 7 * DAY;
  }).length);
}

/**
 * GRAYSON-TRAIN-STANDARDS-001: one test's row: the last result and its date, the one before and the change in plain
 * words, and his target if he set one. Sit-up practice stays practice: it's shown beside the test, never as one.
 */
function standardRow(test: StandardTestKind, input: {
  now: Date; sitUpBestReps: number | null;
  standardResults?: readonly StandardResult[]; standardTargets?: Partial<Record<StandardTestKind, number>>;
}): Standard {
  const results = (input.standardResults ?? []).filter((r) => r.test === test && Date.parse(r.at) <= input.now.getTime())
    .sort((a, b) => b.at.localeCompare(a.at) || b.seq - a.seq);
  const target = input.standardTargets?.[test];
  const [last, previous] = results;
  const parts: string[] = [];
  if (last) {
    parts.push(`Last: ${formatStandardValue(test, last.value)} on ${standardDate(last.at)}.`);
    if (previous) parts.push(`Before: ${formatStandardValue(test, previous.value)} on ${standardDate(previous.at)}. ${describeStandardChange(test, last, previous)}.`);
  } else parts.push("Not recorded yet.");
  if (target !== undefined) parts.push(`Target: ${formatStandardValue(test, target)}, set by you.${last ? ` ${describeStandardTarget(test, last.value, target)}.` : ""}`);
  if (test === "SIT_UPS_1MIN" && input.sitUpBestReps !== null) parts.push(`Best practice set: ${input.sitUpBestReps} reps. Practice isn't a timed test.`);
  return {
    // A practice set is still something observed (as before), but the words say it isn't a test.
    name: STANDARD_TEST[test].name, test, text: parts.join(" "), results,
    evidence: last || (test === "SIT_UPS_1MIN" && input.sitUpBestReps !== null) ? "OBSERVED" : "UNKNOWN",
    ...(target !== undefined ? { target } : {}),
  };
}

/** Pure. The whole page from already-read records. */
export function deriveTrainProgress(input: {
  now: Date;
  next: NextState;
  sessions: readonly FinishedSession[];
  lifts: readonly LiftStrengthReview[];
  names: Readonly<Record<string, string>>;
  strengthIndexChangePercent: number | undefined;
  comparableLifts: number;
  bodyweights: readonly { recordedAt: string; weightLbs: number }[];
  benchRelative: { weight: number; reps: number; bodyweightLbs: number } | null;
  sitUpBestReps: number | null;
  /** GRAYSON-TRAIN-STANDARDS-001: recorded test results (any order) and his own targets. */
  standardResults?: readonly StandardResult[];
  standardTargets?: Partial<Record<StandardTestKind, number>>;
}): TrainProgress {
  const { now } = input;
  const recent = input.sessions.filter((s) => now.getTime() - Date.parse(s.at) < 28 * DAY && Date.parse(s.at) <= now.getTime());
  const byForm: Partial<Record<Form, number>> = {};
  for (const s of recent) byForm[s.form] = (byForm[s.form] ?? 0) + 1;
  // RECOVERY is shown but isn't strength work, so it doesn't count toward the evidence floor.
  const strength = recent.filter((s) => s.form !== "RECOVERY").length;

  const standards: Standard[] = [
    input.benchRelative
      ? { name: "Bench, relative to bodyweight", evidence: "OBSERVED", text: `${lb(input.benchRelative.weight)} × ${input.benchRelative.reps} at ${lb(input.benchRelative.bodyweightLbs)} bodyweight (${(input.benchRelative.weight / input.benchRelative.bodyweightLbs).toFixed(2)}× bodyweight), last 4 weeks, with a weigh-in from within 2 weeks of the set.` }
      : { name: "Bench, relative to bodyweight", evidence: "UNKNOWN", text: "Needs a bench set from the last 4 weeks and a weigh-in from within 2 weeks of it." },
    standardRow("SIT_UPS_1MIN", input),
    standardRow("SIT_AND_REACH", input),
    standardRow("RUN_1_5_MILE", input),
  ];

  const lifts = input.lifts.filter((l) => l.status !== "BUILDING").map((l) => ({
    name: input.names[l.exerciseId] ?? readableName(l.exerciseId), status: l.status,
    text: l.estimatedMaxChangePercent !== undefined && l.recentBest
      ? `Best ${lb(l.recentBest.weight)} × ${l.recentBest.reps}; estimated max ${pct(l.estimatedMaxChangePercent)} vs the 4 weeks before.`
      : "Comparable sessions in both periods.",
  }));

  const weights = [...input.bodyweights].filter((w) => Date.parse(w.recordedAt) <= now.getTime()).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const latest = weights.at(-1);
  const earlier = latest ? weights.filter((w) => Date.parse(w.recordedAt) <= Date.parse(latest.recordedAt) - 21 * DAY).at(-1) : undefined;
  const bodyweight = latest && earlier
    ? { evidence: "OBSERVED" as const, text: `${lb(latest.weightLbs)} now, ${lb(earlier.weightLbs)} on ${new Date(earlier.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${latest.weightLbs - earlier.weightLbs > 0 ? "+" : ""}${lb(latest.weightLbs - earlier.weightLbs)}).` }
    : { evidence: "UNKNOWN" as const, text: latest ? `${lb(latest.weightLbs)} now; no weigh-in from 3+ weeks earlier to compare.` : "No weigh-ins recorded." };

  const missing: string[] = [];
  if (strength < MIN_SESSIONS_28D) missing.push(`${strength} of ${MIN_SESSIONS_28D} finished strength sessions in 4 weeks`);
  if (input.comparableLifts < MIN_COMPARABLE_LIFTS) missing.push(`${input.comparableLifts} of ${MIN_COMPARABLE_LIFTS} lifts with sessions in both of the last two 4-week periods`);
  const why = [`${strength} finished strength ${strength === 1 ? "session" : "sessions"} in the last 4 weeks${recent.length > strength ? `, plus ${recent.length - strength} recovery` : ""}.`];
  if (input.strengthIndexChangePercent !== undefined) why.push(`Strength across ${input.comparableLifts} comparable lifts: ${pct(input.strengthIndexChangePercent)} (best set and volume, vs the 4 weeks before).`);
  if (bodyweight.evidence === "OBSERVED") why.push(`Bodyweight: ${bodyweight.text}`);

  let state: Assessment; let verdict: string;
  if (missing.length) {
    state = "UNCERTAIN";
    verdict = "Too early to judge. Keep training as planned; the picture fills in as sessions are recorded.";
  } else if ((input.strengthIndexChangePercent ?? 0) < -2) {
    state = "NEEDS ATTENTION";
    verdict = "Strength across your comparable lifts is lower than the 4 weeks before. Worth a look at sleep, food and load before changing anything.";
  } else {
    state = "WORKING";
    const losing = bodyweight.evidence === "OBSERVED" && latest && earlier && latest.weightLbs < earlier.weightLbs;
    verdict = losing
      ? "Strength is holding or rising while bodyweight comes down. That's encouraging, though it doesn't prove muscle was gained."
      : "Strength is holding or rising across your comparable lifts. Keep the plan.";
  }
  return {
    where: { next: input.next, strength28: strength, sessions28: recent.length, byForm, perWeek: weeklyCounts(input.sessions, now) },
    standards, lifts, bodyweight,
    assessment: { state, verdict, why, missing, confidence: missing.length ? "LOW" : "MODERATE" },
  };
}
