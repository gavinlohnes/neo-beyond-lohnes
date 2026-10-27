import type { DecisionJournalEntry } from "../domain/journal/types";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "./journalCommands";
import { getDecisionJournalEntries } from "./journalQueries";
import { pictureMean, pictureValues, PICTURE_MEAN_FLOOR, type PictureRow } from "./wholePictureProjection";
import { livedDayStartOf } from "./reflect";

/**
 * LOOP step 3 — TRY (owner approval 2026-10-27, "go try"; brief docs/agent/LOOP.md). A personal
 * experiment is a Decision Journal entry written through the existing commands — no new record
 * kind, event type or schema. Its title starts "Try: " and its context carries the window in one
 * fixed line this module writes and reads back; if that line is edited away, the entry is simply a
 * plain journal entry again. Results compare the experiment's days with your usual days of the
 * same kind, with day counts, and say "about the same" when the gap is small. Patterns, not
 * proof; closing it is the journal's own review. Never an Engine input or advice.
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
const SAME_ENERGY = 0.3;

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

/** The experiment's recorded days against your usual days of the same kind in the Whole Picture window. Pure. */
export function experimentResult(e: Experiment, rows: readonly PictureRow[]): ExperimentResult {
  const recorded = rows.filter((row) => row.dayIds.length && inScope(row, e.scope));
  const during = recorded.filter((row) => { const t = Date.parse(row.start); return t >= e.from.getTime() && t < e.to.getTime(); });
  const usual = recorded.filter((row) => { const t = Date.parse(row.start); return t < e.from.getTime() || t >= e.to.getTime(); });
  const lines: ResultLine[] = [];
  const sleepD = pictureMean(pictureValues(during, "sleepHours")), sleepU = pictureMean(pictureValues(usual, "sleepHours"));
  if (sleepD !== undefined && sleepU !== undefined) {
    const diff = Math.round((sleepD - sleepU) * 60), same = Math.abs(diff) < SAME_SLEEP_MINUTES;
    lines.push({ same, text: `Main sleep: ${hm(sleepD)} during (${pictureValues(during, "sleepHours").length} days), ${hm(sleepU)} usually (${pictureValues(usual, "sleepHours").length} days) — ${same ? "about the same" : `${Math.abs(diff)} min ${diff > 0 ? "more" : "less"}`}.` });
  }
  const energyD = pictureMean(pictureValues(during, "energy")), energyU = pictureMean(pictureValues(usual, "energy"));
  if (energyD !== undefined && energyU !== undefined) {
    const diff = energyD - energyU, same = Math.abs(diff) < SAME_ENERGY;
    lines.push({ same, text: `Check-in energy: ${energyD.toFixed(1)} during (${pictureValues(during, "energy").length} days), ${energyU.toFixed(1)} usually (${pictureValues(usual, "energy").length} days) — ${same ? "about the same" : diff > 0 ? "higher" : "lower"}.` });
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
