import type { DaySummary } from "../engine/dayLedger";
import { groupLivedDays, type DayKind } from "../engine/livedDaySeries";
import { projectPersonalBaselines } from "../engine/personalBaselines";

/**
 * SLEEP-DEBT-LEARNED-001 (Gavin, 2026-11-15, ranked item 2: "Measure sleep debt against your own learned sleep, not a
 * fixed 7 hours"; brief docs/agent/SLEEP-DEBT-LEARNED-001.md). Sleep owed over the last SLEEP_DEBT_DAYS lived days
 * with sleep logged, each judged against the operator's OWN usual main sleep for that kind of day: the low end of the
 * usual range Weekly's personal baselines show (`projectPersonalBaselines`, MAIN_SLEEP, WORK / OFF; 56 lived days
 * before the last 7, at least MIN_BASELINE_DAYS of the kind). The same "short" line SLEEP-ENGINE-001 uses.
 *
 * NO_FAKE_PRECISION: a day whose kind is still learning (or whose work context is unknown) is not judged and adds
 * nothing; with no judged day there is no owed figure at all ("still learning", with the day counts), never a fallback
 * to a fixed 7 hours. A night at or above the target owes nothing and repays nothing (no negative debt), as before.
 * Pure, derived on read, never stored, never read by the Engine: a readout, not a rule.
 */
export const SLEEP_DEBT_DAYS = 7;

export type SleepTarget =
  | { kind: "LEARNED"; /** The low end of the usual main-sleep range, minutes. */ minutes: number; baselineDays: number }
  | { kind: "LEARNING"; have: number; need: number };

export interface SleepDebtDay {
  livedDayStart: string;
  kind: DayKind | "UNKNOWN";
  /** Main sleep plus naps across the lived day's records. */
  sleptMinutes: number;
  /** The target the day was judged against; undefined when it wasn't judged. */
  targetMinutes: number | undefined;
  owedMinutes: number;
}

export interface SleepDebt {
  /**
   * NO_SLEEP: nothing logged. LEARNING: sleep logged, but no logged day has a learned target, so no owed figure.
   * LEARNED: `owedMinutes` is a real figure over `judgedDays`.
   */
  status: "NO_SLEEP" | "LEARNING" | "LEARNED";
  /** Owed over the judged days; 0 unless LEARNED. */
  owedMinutes: number;
  /** Lived days with sleep logged that were looked at (at most SLEEP_DEBT_DAYS). */
  days: number;
  /** Of those, the days judged against a learned target. */
  judgedDays: number;
  targets: Record<DayKind, SleepTarget>;
  perDay: SleepDebtDay[];
}

const slept = (records: readonly DaySummary[]) => records.reduce((sum, r) => sum + (r.sleep.primaryMinutes ?? 0) + (r.sleep.napMinutes ?? 0), 0);
const hasSleep = (r: DaySummary) => r.sleep.primaryMinutes !== undefined || !!r.sleep.napMinutes;

/** The learned main-sleep targets, straight from the personal baselines (no Engine change, no new statistic). */
export function learnedSleepTargets(summaries: readonly DaySummary[], now: Date): Record<DayKind, SleepTarget> {
  const targets = {} as Record<DayKind, SleepTarget>;
  for (const b of projectPersonalBaselines(summaries, now)) {
    if (b.measure !== "MAIN_SLEEP") continue;
    targets[b.dayKind] = b.kind === "LEARNING"
      ? { kind: "LEARNING", have: b.have, need: b.need }
      : { kind: "LEARNED", minutes: b.low, baselineDays: b.baselineDays };
  }
  return targets;
}

export function deriveSleepDebt(summaries: readonly DaySummary[], now: Date): SleepDebt {
  const targets = learnedSleepTargets(summaries, now);
  // One lived day is one night: two records in a lived day (a day ended early) share one target.
  const logged = [...groupLivedDays(summaries.filter((s) => new Date(s.livedDayStart).getTime() <= now.getTime() && hasSleep(s))).values()]
    .sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart)).slice(0, SLEEP_DEBT_DAYS);
  const perDay = logged.map((day): SleepDebtDay => {
    const target = day.kind === "UNKNOWN" ? undefined : targets[day.kind];
    const targetMinutes = target?.kind === "LEARNED" ? target.minutes : undefined;
    const sleptMinutes = slept(day.records);
    return { livedDayStart: day.livedDayStart, kind: day.kind, sleptMinutes, targetMinutes, owedMinutes: targetMinutes === undefined ? 0 : Math.max(0, targetMinutes - sleptMinutes) };
  });
  const judged = perDay.filter((d) => d.targetMinutes !== undefined);
  const status = perDay.length === 0 ? "NO_SLEEP" : judged.length === 0 ? "LEARNING" : "LEARNED";
  return { status, owedMinutes: judged.reduce((sum, d) => sum + d.owedMinutes, 0), days: perDay.length, judgedDays: judged.length, targets, perDay };
}

const KIND_LABEL: Record<DayKind, string> = { WORK: "work days", OFF: "days off" };

/** "work days 6h30 (from 24 days), days off still learning (4 of 10 days)" — what the figure is measured against. */
export function describeSleepTargets(targets: Record<DayKind, SleepTarget>, formatMinutes: (m: number) => string): string {
  return (["WORK", "OFF"] as const).map((kind) => {
    const t = targets[kind];
    return t.kind === "LEARNED"
      ? `${KIND_LABEL[kind]} ${formatMinutes(t.minutes)} (from ${t.baselineDays} days)`
      : `${KIND_LABEL[kind]} still learning (${t.have} of ${t.need} days)`;
  }).join(", ");
}

/** Logged days left out of the figure, and why; "" when every logged day was judged. */
export function describeUnjudged(debt: SleepDebt): string {
  const left = debt.days - debt.judgedDays;
  if (debt.status !== "LEARNED" || left === 0) return "";
  return `${left} logged day${left === 1 ? "" : "s"} not counted (still learning that kind of day, or work/off unknown).`;
}
