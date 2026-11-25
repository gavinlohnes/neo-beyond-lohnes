import type { DecisionJournalEntry } from "../domain/journal/types";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "./journalCommands";
import { getDecisionJournalEntries } from "./journalQueries";
import { pictureValues, PICTURE_MEAN_FLOOR, type PictureRow } from "./wholePictureProjection";
import { livedDayStartOf } from "./reflect";

/**
 * LOOP step 3 — TRY (owner approval 2026-10-27, "go try"; brief docs/agent/LOOP.md;
 * EXP-STATS-001: honest uncertainty on the comparison). A personal experiment is a Decision
 * Journal entry written through the existing commands — no new record kind, event type or schema.
 * Its title starts "Try: " and its context carries the window in one fixed line this module writes
 * and reads back; if that line is edited away, the entry is simply a plain journal entry again.
 * Results compare the experiment's days with your usual days of the same kind, with day counts and
 * a 95% range on the difference of means. They say "about the same" when the gap is small,
 * "can't tell yet" when that range crosses zero and still reaches a meaningful gap, and "not enough
 * data yet" when a side has fewer than three recorded days. Patterns, not proof; closing it is the
 * journal's own review. Never an Engine input or advice.
 */
export const TRY_PREFIX = "Try: ";
export const TRY_LENGTHS = [7, 14, 28] as const;
export type TryScope = "WORK" | "OFF" | "ALL";
export const TRY_SCOPES: readonly { id: TryScope; label: string }[] = [
  { id: "WORK", label: "Work days" }, { id: "OFF", label: "Days off" }, { id: "ALL", label: "Every day" },
];
export const TRY_OUTCOMES = ["It helped", "No clear difference", "It didn't help"] as const;

/** Gaps smaller than these read as "about the same": a quarter hour of sleep, a third of an energy point. */
const SAME_SLEEP_MINUTES = 15;
export const SAME_ENERGY = 0.3;

/** 95% two-sided Student-t critical values for df 1..30; beyond that, ease toward z. */
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042] as const;
const Z975 = 1.96;

/** Exported for tests. Welch intervals use this critical value. */
export function tCritical975(df: number): number {
  if (!Number.isFinite(df) || df <= 0) return Number.POSITIVE_INFINITY;
  const t30 = T975[29] ?? Z975;
  if (df >= 30) return df === 30 ? t30 : Z975 + (t30 - Z975) * (30 / df);
  const lo = Math.max(1, Math.floor(df));
  const a = T975[lo - 1] ?? t30;
  if (df === lo) return a;
  const b = T975[lo] ?? t30;
  return a + (df - lo) * (b - a);
}

export interface MeanDiffInterval {
  nA: number;
  nB: number;
  meanA: number;
  meanB: number;
  /** meanA − meanB */
  diff: number;
  lo: number;
  hi: number;
}

function meanOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function sampleVar(values: readonly number[], mean: number): number {
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
}

/**
 * Welch 95% interval for the difference of means (A − B). Pure. Undefined when either arm has
 * fewer than PICTURE_MEAN_FLOOR values — the same floor the comparison already uses for a mean.
 */
export function meanDiffInterval(a: readonly number[], b: readonly number[]): MeanDiffInterval | undefined {
  if (a.length < PICTURE_MEAN_FLOOR || b.length < PICTURE_MEAN_FLOOR) return undefined;
  const meanA = meanOf(a);
  const meanB = meanOf(b);
  const diff = meanA - meanB;
  const vA = sampleVar(a, meanA) / a.length;
  const vB = sampleVar(b, meanB) / b.length;
  const se = Math.sqrt(vA + vB);
  if (!Number.isFinite(se) || se === 0) return { nA: a.length, nB: b.length, meanA, meanB, diff, lo: diff, hi: diff };
  const df = (vA + vB) ** 2 / (vA ** 2 / (a.length - 1) + vB ** 2 / (b.length - 1));
  const margin = tCritical975(df) * se;
  return { nA: a.length, nB: b.length, meanA, meanB, diff, lo: diff - margin, hi: diff + margin };
}

/** same = practically equivalent; up/down = a clear direction; unsure = can't tell yet. */
export type DiffVerdict = "same" | "up" | "down" | "unsure";
export function diffVerdict(diff: number, lo: number, hi: number, band: number): DiffVerdict {
  if (hi < 0 || lo > 0) return Math.abs(diff) < band ? "same" : diff > 0 ? "up" : "down";
  if (lo >= -band && hi <= band) return "same";
  return "unsure";
}

export interface Experiment {
  entry: DecisionJournalEntry;
  what: string;
  /** Lived-day starts: the first included day and the first day after the window. */
  from: Date;
  to: Date;
  scope: TryScope;
  days: number;
}

const WINDOW = /^Window (\d{4})-(\d{2})-(\d{2}) for (\d+) days · (WORK|OFF|ALL)$/m;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const scopeWords = (scope: TryScope) => scope === "WORK" ? "work days" : scope === "OFF" ? "days off" : "every day";

/** The experiment behind a journal entry, or null for any other entry (or one whose window line was edited away). */
export function readExperiment(entry: DecisionJournalEntry): Experiment | null {
  const match = entry.title.startsWith(TRY_PREFIX) ? WINDOW.exec(entry.context ?? "") : null;
  if (!match) return null;
  const [, y, m, d, n, scope] = match;
  const days = Number(n);
  const from = new Date(Number(y), Number(m) - 1, Number(d), 16, 30, 0, 0);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 16, 30, 0, 0);
  return { entry, what: entry.title.slice(TRY_PREFIX.length), from, to, scope: scope as TryScope, days };
}

/** Starts with the current lived day. The expectation (what you think will happen) is optional. */
export async function startExperiment(input: { what: string; days: number; scope: TryScope; expect?: string; now?: Date }): Promise<Experiment> {
  const what = input.what.trim();
  if (!what) throw new Error("Say what you'll try.");
  const from = livedDayStartOf(input.now ?? new Date());
  const entry = await createDecisionJournalEntry({
    title: `${TRY_PREFIX}${what}`,
    context: `Window ${isoDay(from)} for ${input.days} days · ${input.scope}\nCompared with your usual ${scopeWords(input.scope)} outside the window.`,
    decision: `Try it on ${scopeWords(input.scope)} for ${input.days} days`,
    ...(input.expect?.trim() ? { expectation: input.expect.trim() } : {}),
  });
  return readExperiment(entry)!;
}

export async function getExperiments(): Promise<Experiment[]> {
  return (await getDecisionJournalEntries()).map(readExperiment).filter((e): e is Experiment => e !== null);
}

/** Open experiments whose window includes now — what TODAY quietly shows. */
export function activeExperiments(all: readonly Experiment[], now: Date = new Date()): Experiment[] {
  return all.filter((e) => e.entry.status === "OPEN" && now >= e.from && now < e.to);
}

/** "Day 3 of 14" for the current lived day. */
export function experimentDay(e: Experiment, now: Date = new Date()): number {
  const start = livedDayStartOf(now);
  return Math.round((Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) - Date.UTC(e.from.getFullYear(), e.from.getMonth(), e.from.getDate())) / 86_400_000) + 1;
}

export interface ResultLine { text: string; same: boolean | null }
export interface ExperimentResult { during: PictureRow[]; usual: PictureRow[]; lines: ResultLine[]; enough: boolean; need?: string }

const hm = (hours: number) => { const m = Math.round(hours * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const inScope = (row: PictureRow, scope: TryScope) => scope === "ALL" || row.context === scope;

/** Widen a displayed range so rounding never hides that it crossed zero or a threshold. */
function rangeMinutes(lo: number, hi: number): string {
  if (lo === hi) return `range ${Math.round(lo * 60)} min`;
  const a = Math.floor(lo * 60);
  const b = Math.ceil(hi * 60);
  return a === b ? `range ${a} min` : `range ${a} to ${b} min`;
}
function rangeEnergy(lo: number, hi: number): string {
  if (lo === hi) return `range ${lo.toFixed(1)}`;
  const a = Math.floor(lo * 10) / 10;
  const b = Math.ceil(hi * 10) / 10;
  return a === b ? `range ${a.toFixed(1)}` : `range ${a.toFixed(1)} to ${b.toFixed(1)}`;
}
function sleepPoint(diffHours: number): string {
  const minutes = Math.round(diffHours * 60);
  if (minutes === 0) return "0 min difference";
  return `${Math.abs(minutes)} min ${minutes > 0 ? "more" : "less"}`;
}
function energyPoint(diff: number): string {
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) return "0.0 difference";
  return `${Math.abs(rounded).toFixed(1)} ${rounded > 0 ? "higher" : "lower"}`;
}
function compareTail(verdict: DiffVerdict, point: string, range: string): string {
  if (verdict === "unsure") return point.endsWith("difference") ? `can't tell yet (${range})` : `can't tell yet (${point}, ${range})`;
  if (verdict === "same") return `about the same (${range})`;
  return `${point} (${range})`;
}

/** The experiment's recorded days against your usual days of the same kind in the Whole Picture window. Pure. */
export function experimentResult(e: Experiment, rows: readonly PictureRow[]): ExperimentResult {
  const recorded = rows.filter((row) => row.dayIds.length && inScope(row, e.scope));
  const during = recorded.filter((row) => { const t = Date.parse(row.start); return t >= e.from.getTime() && t < e.to.getTime(); });
  const usual = recorded.filter((row) => { const t = Date.parse(row.start); return t < e.from.getTime() || t >= e.to.getTime(); });
  const lines: ResultLine[] = [];
  const sleep = meanDiffInterval(pictureValues(during, "sleepHours"), pictureValues(usual, "sleepHours"));
  if (sleep) {
    const verdict = diffVerdict(sleep.diff, sleep.lo, sleep.hi, SAME_SLEEP_MINUTES / 60);
    lines.push({
      same: verdict === "same",
      text: `Main sleep: ${hm(sleep.meanA)} during (${sleep.nA} days), ${hm(sleep.meanB)} usually (${sleep.nB} days) — ${compareTail(verdict, sleepPoint(sleep.diff), rangeMinutes(sleep.lo, sleep.hi))}.`,
    });
  }
  const energy = meanDiffInterval(pictureValues(during, "energy"), pictureValues(usual, "energy"));
  if (energy) {
    const verdict = diffVerdict(energy.diff, energy.lo, energy.hi, SAME_ENERGY);
    lines.push({
      same: verdict === "same",
      text: `Check-in energy: ${energy.meanA.toFixed(1)} during (${energy.nA} days), ${energy.meanB.toFixed(1)} usually (${energy.nB} days) — ${compareTail(verdict, energyPoint(energy.diff), rangeEnergy(energy.lo, energy.hi))}.`,
    });
  }
  const trained = (group: PictureRow[]) => group.filter((row) => row.sessions > 0).length;
  if (during.length && usual.length) lines.push({ same: null, text: `Trained on ${trained(during)} of ${during.length} days during, ${trained(usual)} of ${usual.length} usually.` });
  const enough = lines.some((line) => line.same !== null);
  return enough ? { during, usual, lines, enough }
    : { during, usual, lines, enough, need: `${PICTURE_MEAN_FLOOR} recorded ${scopeWords(e.scope)} with main sleep or a check-in, both during the experiment and outside it (${during.length} during so far)` };
}

/** Closing an experiment is the journal's own review: what happened, and the lesson. */
export async function closeExperiment(id: string, outcome: string, lesson?: string): Promise<DecisionJournalEntry> {
  return reviewDecisionJournalEntry(id, { outcome, ...(lesson?.trim() ? { lesson: lesson.trim() } : {}) });
}
