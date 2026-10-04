import type { BurdenSummary } from "../../../engine/dayLedger";
import type { RibbonDay } from "../../../engine/ribbon";
import type { ExpenditureReadout } from "../../../engine/expenditure";
import type { Finding, WaitingFinding, WorkoutArm } from "../../../engine/findings";
import type { SchedulePhase } from "../../../engine/scheduledContext";
import type { PersonalBaseline } from "../../../engine/personalBaselines";
import type { DayKind, MeasureId } from "../../../engine/livedDaySeries";
import { formatDuration } from "../body/bodyScreenCopy";

/**
 * Burden Meter (Drop 1, owner brief 2026-10-03): one neutral, read-only line
 * — how much BEYOND asked for this week. Facts only: no score, no target, no
 * judgement. Entries are averaged per day and rounded to whole entries;
 * corrections are the week's total, so a single correction never rounds away.
 */
export function describeBurdenLine(burden: BurdenSummary): string {
  if (burden.entriesPerDay === undefined) return "Not enough data yet — no days this week.";
  const entries = Math.round(burden.entriesPerDay);
  return `Entries per day: ${entries} · corrections this week: ${burden.corrections}`;
}

// ---- THE RIBBON (2026-10-03) ----

/** "Thu Oct 1" — the calendar date a lived day starts on (its 16:30). */
export function describeRibbonDate(livedDayStart: string): string {
  return new Date(livedDayStart).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function hoursAndMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/**
 * One tapped day, in words: only what was logged, nothing guessed.
 * "Thu Oct 1 · worked · slept 7 hr 15 min · lift B, 1 PR · protein 182 g · 2 urges · clean day"
 */
export function describeRibbonDay(day: RibbonDay, templateLabels: Record<string, string>): string {
  const parts: string[] = [describeRibbonDate(day.livedDayStart)];
  if (!day.hasRecord) return `${parts[0]} · nothing logged`;
  parts.push(day.worked ? "worked" : "not working");
  if (day.mainSleepMinutes !== undefined) parts.push(`slept ${hoursAndMinutes(day.mainSleepMinutes)}`);
  if (day.lift) {
    const label = templateLabels[day.lift.templateId] ?? day.lift.templateId;
    const partial = day.lift.status === "PARTIAL" ? " (partial)" : "";
    const prs = day.lift.prCount > 0 ? `, ${day.lift.prCount} ${day.lift.prCount === 1 ? "PR" : "PRs"}` : "";
    parts.push(`lift ${label}${partial}${prs}`);
  }
  if (day.proteinG !== undefined) parts.push(`protein ${Math.round(day.proteinG)} g`);
  if (day.urges > 0) parts.push(`${day.urges} ${day.urges === 1 ? "urge" : "urges"}`);
  if (day.cleanDay) parts.push("clean day");
  return parts.join(" · ");
}

/** The whole strip in one sentence, for screen readers and the image's label. */
export function describeRibbonSummary(days: readonly RibbonDay[]): string {
  const count = (pred: (d: RibbonDay) => boolean) => days.filter(pred).length;
  const lifts = days.filter((d) => d.lift);
  const prs = lifts.reduce((n, d) => n + (d.lift?.prCount ?? 0), 0);
  const urges = days.reduce((n, d) => n + d.urges, 0);
  return [
    `Last ${days.length} days`,
    `${count((d) => d.worked)} worked`,
    `main sleep logged on ${count((d) => d.mainSleepMinutes !== undefined)}`,
    `${lifts.length} ${lifts.length === 1 ? "workout" : "workouts"}${prs > 0 ? ` (${prs} ${prs === 1 ? "PR" : "PRs"})` : ""}`,
    `protein logged on ${count((d) => d.proteinG !== undefined)}`,
    `${urges} ${urges === 1 ? "urge" : "urges"}`,
    `${count((d) => d.cleanDay)} clean ${count((d) => d.cleanDay) === 1 ? "day" : "days"}`,
  ].join(", ") + ".";
}

// ---- READ-ONLY FINDINGS (2026-10-03) ----
//
// Counts only, in plain words: the real numbers and the window they were
// counted over. Never "usually", "tends to", "because" or any other claim of
// cause or habit — a finding says what happened, not why.

export interface FindingCopy {
  title: string;
  lines: string[];
  /** Where the numbers came from: window and rule, one quiet line. */
  basis?: string;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function describeArm(label: string, arm: WorkoutArm): string {
  return `${label}: ${arm.completed} of ${arm.workouts} complete · ${plural(arm.prs, "PR", "PRs")}`;
}

const PHASE_WORDS: Record<SchedulePhase, string> = {
  EXPECTED_POST_WORK: "after a shift",
  OFF: "off work",
  PRE_WORK: "before a shift",
  SCHEDULED_SHIFT: "during a shift",
};

export function describeFinding(finding: Finding, exerciseNames: Record<string, string>): FindingCopy {
  switch (finding.kind) {
    case "SLEEP_BEFORE_WORKOUT": {
      const cut = hoursAndMinutes(finding.shortSleepMinutes);
      return {
        title: "Sleep before workouts",
        lines: [describeArm(`Under ${cut}`, finding.shortSleep), describeArm(`${cut} or more`, finding.longerSleep)],
        basis: `Last ${finding.windowDays} days · the main sleep logged in the 24 hours before each workout.`,
      };
    }
    case "TRAINING_WINDOW":
      return {
        title: "Before vs. after the shift",
        lines: [describeArm("Before the shift", finding.beforeShift), describeArm("After the shift", finding.afterShift)],
        basis: `Last ${finding.windowDays} days · work days only.`,
      };
    case "URGE_TIMING": {
      const [first, ...rest] = finding.byPhase;
      const parts = first ? [`${first.count} of ${finding.total} ${PHASE_WORDS[first.phase]}`] : [];
      for (const p of rest) parts.push(`${p.count} ${PHASE_WORDS[p.phase]}`);
      return {
        title: "When urges came",
        lines: [parts.join(" · ")],
        basis: `Last ${finding.windowDays} days · placed against your saved schedule.`,
      };
    }
    case "STALL": {
      const { min, max } = finding.topWeights;
      const tops = max <= 0 ? "" : min === max ? ` · top set ${max} lb each time` : ` · top sets ${min}–${max} lb`;
      return {
        title: exerciseNames[finding.exerciseId] ?? finding.exerciseId,
        lines: [`No new record in the last ${finding.sessions} sessions${tops}`],
      };
    }
    case "EXERCISE_STORY": {
      const weeks = Math.floor(finding.days / 7);
      return {
        title: exerciseNames[finding.exerciseId] ?? finding.exerciseId,
        lines: [`Top set ${finding.fromWeight} → ${finding.toWeight} lb over ${plural(weeks, "week", "weeks")} · ${finding.sessions} sessions`],
      };
    }
  }
}

/**
 * Every finding in order, with one lift's stall and story under a single
 * heading (story first: where it went, then where it's held).
 */
export function describeFindings(findings: readonly Finding[], exerciseNames: Record<string, string>): (FindingCopy & { key: string })[] {
  const out: (FindingCopy & { key: string })[] = [];
  const byExercise = new Map<string, FindingCopy & { key: string }>();
  for (const finding of findings) {
    if (finding.kind !== "STALL" && finding.kind !== "EXERCISE_STORY") {
      out.push({ key: finding.kind, ...describeFinding(finding, exerciseNames) });
      continue;
    }
    if (byExercise.has(finding.exerciseId)) continue;
    const forLift = (kind: "STALL" | "EXERCISE_STORY") =>
      findings
        .filter((f) => f.kind === kind && "exerciseId" in f && f.exerciseId === finding.exerciseId)
        .flatMap((f) => describeFinding(f, exerciseNames).lines);
    const lines = [...forLift("EXERCISE_STORY"), ...forLift("STALL")];
    const entry = { key: `exercise-${finding.exerciseId}`, title: exerciseNames[finding.exerciseId] ?? finding.exerciseId, lines };
    byExercise.set(finding.exerciseId, entry);
    out.push(entry);
  }
  return out;
}

const WAITING_WORDS: Record<WaitingFinding["kind"], (w: WaitingFinding) => string> = {
  SLEEP_BEFORE_WORKOUT: (w) => `sleep before workouts (${w.have} of ${w.need} each way)`,
  TRAINING_WINDOW: (w) => `before vs. after the shift (${w.have} of ${w.need} each way)`,
  URGE_TIMING: (w) => `when urges came (${w.have} of ${w.need} urges)`,
};

/** One quiet line naming what's still counting, and how far along it is. */
export function describeWaitingFindings(waiting: readonly WaitingFinding[]): string | undefined {
  if (waiting.length === 0) return undefined;
  return `Not enough data yet: ${waiting.map((w) => WAITING_WORDS[w.kind](w)).join(", ")}.`;
}

// ---- EXPENDITURE READOUT (Drop 6, 2026-10-03) ----

function kcal(n: number): string {
  return n.toLocaleString("en-US");
}

/** The headline and the quiet line under it: a range, what it came from, and what it assumes. */
export function describeExpenditure(readout: ExpenditureReadout): { headline?: string; detail: string } {
  if (readout.kind === "ESTIMATE") {
    const change =
      Math.abs(readout.weeklyChangeLbs) < 0.05
        ? "weight steady"
        : `weight ${readout.weeklyChangeLbs < 0 ? "down" : "up"} ${Math.abs(readout.weeklyChangeLbs).toFixed(1)} lb a week`;
    return {
      headline: `About ${kcal(readout.lowKcal)}–${kcal(readout.highKcal)} kcal a day`,
      detail: `Estimated from the last ${readout.windowDays} days: ${readout.intakeDays} days with meals logged (avg ${kcal(
        readout.avgIntakeKcal,
      )} kcal) and ${change}. Assumes those days' meals were all logged.`,
    };
  }
  if (readout.tooNoisy) {
    return { detail: "Not enough data yet — weight is moving around too much for a useful range." };
  }
  const needs: string[] = [];
  if (readout.intakeDays.have < readout.intakeDays.need) {
    needs.push(`${readout.intakeDays.need} days with meals logged (have ${readout.intakeDays.have})`);
  }
  if (readout.weighIns.have < readout.weighIns.need || !readout.spanOk) {
    needs.push(`${readout.weighIns.need} weigh-ins over 2 weeks (have ${readout.weighIns.have})`);
  }
  return { detail: `Not enough data yet — needs ${needs.join(" and ")} in the last ${readout.windowDays} days.` };
}

// ---- YOUR USUAL (FOUNDATION-A-F1) ----

const MEASURE_WORDS: Record<MeasureId, string> = { MAIN_SLEEP: "Sleep", WATER: "Water", PROTEIN: "Protein" };
const KIND_WORDS: Record<DayKind, { label: string; one: string; many: string }> = {
  WORK: { label: "on work days", one: "work day", many: "work days" },
  OFF: { label: "on days off", one: "day off", many: "days off" },
};
const VERDICT_WORDS = { BELOW: "below", INSIDE: "inside", ABOVE: "above" } as const;

function formatAmount(measure: MeasureId, value: number): string {
  if (measure === "MAIN_SLEEP") return formatDuration(value);
  return measure === "WATER" ? `${value} oz` : `${value} g`;
}

function formatRange(measure: MeasureId, low: number, high: number): string {
  return `${formatAmount(measure, low)}–${formatAmount(measure, high)}`;
}

function days(kind: DayKind, n: number): string {
  return `${n} ${n === 1 ? KIND_WORDS[kind].one : KIND_WORDS[kind].many}`;
}

export interface BaselineCopy {
  /** Stable key, e.g. "MAIN_SLEEP-WORK". */
  key: string;
  headline: string;
  basis: string;
}

/**
 * One headline + one basis line per comparison, in BASELINE_ORDER. Neutral
 * words only — inside / below / above your usual — never good or bad.
 */
export function describeBaselines(baselines: readonly PersonalBaseline[]): BaselineCopy[] {
  return baselines.flatMap((b) => {
    if (b.kind !== "COMPARED") return [];
    const name = `${MEASURE_WORDS[b.measure]} ${KIND_WORDS[b.dayKind].label}`;
    return [
      {
        key: `${b.measure}-${b.dayKind}`,
        headline: `${name} · ${formatAmount(b.measure, b.period)} · ${VERDICT_WORDS[b.verdict]} your usual ${formatRange(b.measure, b.low, b.high)}`,
        basis: `${days(b.dayKind, b.periodDays)} this week · usual from ${days(b.dayKind, b.baselineDays)} before`,
      },
    ];
  });
}

/** One quiet line for everything not compared: still learning (with progress), or nothing to compare this week. */
export function describeBaselinesQuiet(baselines: readonly PersonalBaseline[]): string | undefined {
  const learning = baselines.flatMap((b) =>
    b.kind === "LEARNING"
      ? [`${MEASURE_WORDS[b.measure].toLowerCase()} ${KIND_WORDS[b.dayKind].label} (${b.have} of ${days(b.dayKind, b.need)})`]
      : [],
  );
  const notThisWeek = baselines.flatMap((b) =>
    b.kind === "NOT_THIS_WEEK" ? [`${MEASURE_WORDS[b.measure].toLowerCase()} ${KIND_WORDS[b.dayKind].label}`] : [],
  );
  const parts = [
    ...(learning.length ? [`Still learning your usual: ${learning.join(", ")}.`] : []),
    ...(notThisWeek.length ? [`Nothing to compare this week: ${notThisWeek.join(", ")}.`] : []),
  ];
  return parts.length ? parts.join(" ") : undefined;
}
