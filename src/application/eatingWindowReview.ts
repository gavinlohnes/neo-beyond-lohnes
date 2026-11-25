import { db } from "../persistence/db";
import { readWindowReviewPreference, writeWindowReviewPreference, type WindowReviewPreference } from "../persistence/windowReviewPreference";
import type { EatingWindowDayKind, EatingWindowSettings } from "../domain/common/types";
import { getEatingWindowSettings, plannedOpening, presetLabel, readMarks, saveEatingWindowSettings, type EatingMark } from "./eatingWindow";
import {
  SAME_ENERGY, closeExperiment, diffVerdict, experimentDay, experimentResult, getExperiments, meanDiffInterval, startExperiment,
  type Experiment,
} from "./tryExperiment";
import { pictureValues, type PictureRow } from "./wholePictureProjection";
import { getWholePicture } from "./wholePictureQueries";
import { TREND_ALPHA, TREND_MIN_SPAN_DAYS, TREND_MIN_WEIGH_INS, readWeightTrendPreference, smoothWeights, trendReady } from "./weightTrend";
import { getBodyweightHistory, type WeighIn } from "./bodyTrendQueries";
import { getEffectiveProteinTargetG, getNutritionTargets } from "./nutritionTargetQueries";
import { getTrainProgress } from "./trainProgressQueries";
import type { Assessment } from "./trainProgress";
import { writeAtomically } from "./atomicWrite";

export { readWindowReviewPreference, writeWindowReviewPreference, type WindowReviewPreference };

/**
 * GRAYSON-WINDOW-REVIEW-001 (C4.8c, Gavin 2026-11-24: "adjustable and smart", "understand what I'm doing and why").
 * BODY's eating window answers three questions:
 * 1. What am I actually doing? His marks first, the first and last logged meal second (labelled an estimate), unknown
 *    stays unknown. By kind of lived day, never weekday. One offer to move the plan's opening time, on his tap only.
 *    Never an offer to narrow the window.
 * 2. Is it working for my goal? A Try (tryExperiment.ts) over 14 or 28 days, then weight trend, protein, strength,
 *    sleep and energy, and last the hours kept. Patterns, not proof: "during" and "before", with counts.
 * 3. Why a window at all? A bundled, sourced sheet (UI).
 * Read only except his own taps: MOVE (settings), start and close of the Try (journal), PAUSE/END (settings).
 */

/** The fixed defaults of this slice, in one place so a later slice can expose them. */
export const WINDOW_REVIEW = {
  LOOKBACK_DAYS: 14,
  FLOOR_DAYS: 4,
  OFFER_GAP_MINUTES: 45,
  OFFER_RECENT_DAYS: 6,
  OFFER_NEEDS_DAYS: 4,
  OFFER_ROUND_MINUTES: 15,
  KEEP_HIDES_DAYS: 14,
  KEPT_WITHIN_MINUTES: 30,
  GUARD_TRAINING_DAYS: 6,
  GUARD_NEEDS_DAYS: 4,
  MAX_GUARDS: 2,
} as const;
export const REVIEW_LENGTHS = [14, 28] as const;
export const DEFAULT_REVIEW_DAYS = 28;
export const WINDOW_TRY_PREFIX = "Eating window";
export const REVIEW_CHOICES = { KEEP: "Kept the window", ADJUST: "Adjusting the window", PAUSE: "Paused the window", END: "Ended the window" } as const;
export type ReviewChoice = keyof typeof REVIEW_CHOICES;

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const KINDS: readonly EatingWindowDayKind[] = ["WORK", "RECOVERY", "OFF"];
export const KIND_DAYS: Record<EatingWindowDayKind, string> = { WORK: "work days", RECOVERY: "recovery days", OFF: "days off" };

const pad = (n: number) => String(n).padStart(2, "0");
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number) as [number, number]; return h * 60 + m; };
const toClock = (minutes: number) => { const m = ((Math.round(minutes) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const hoursText = (minutes: number) => `${Math.floor(minutes / 60)}:${pad(Math.round(minutes % 60))}`;
export function median(values: readonly number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b), mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---- 1. What you actually do -------------------------------------------------------------------------------------

/** Pure. The kind of each lived day: WORK; a day off right after work is RECOVERY; any other day off is OFF. */
export function kindsOf(rows: readonly Pick<PictureRow, "context">[]): (EatingWindowDayKind | null)[] {
  return rows.map((row, i) => row.context === "WORK" ? "WORK" : row.context === "OFF" ? (rows[i - 1]?.context === "WORK" ? "RECOVERY" : "OFF") : null);
}

export interface ActualDay {
  start: string;
  kind: EatingWindowDayKind;
  /** The plan's opening on that lived day (ms), from the settings he has now. */
  planned: number;
  opened?: number;
  closed?: number;
  /** MARKED: from his marks (a closing may be unknown). MEALS: any part from logged meals (an estimate). UNKNOWN: no opening. */
  source: "MARKED" | "MEALS" | "UNKNOWN";
}

/**
 * Pure. His actual window on each lived day of a known kind. A day's search span is the 24 hours centred on its planned
 * opening, so a window that opens after midnight on a work night still belongs to that night. Opening: his first
 * OPENED mark in the span, else the first logged meal. Closing: his first CLOSED mark in the 24 hours after opening,
 * else the last logged meal in the span. Rows are consecutive lived days, oldest first.
 */
export function actualWindows(rows: readonly PictureRow[], marks: readonly EatingMark[], settings: Pick<EatingWindowSettings, "opensAt">): ActualDay[] {
  const kinds = kindsOf(rows);
  const sorted = [...marks].sort((a, b) => a.at.localeCompare(b.at) || (a.seq ?? 0) - (b.seq ?? 0));
  const meals = rows.flatMap((row) => (row.marks?.meals ?? []).map((m) => Date.parse(row.start) + m * MIN)).sort((a, b) => a - b);
  const out: ActualDay[] = [];
  rows.forEach((row, i) => {
    const kind = kinds[i];
    if (!kind) return;
    const planned = plannedOpening(new Date(row.start), settings.opensAt[kind]).getTime();
    const lo = planned - 12 * HOUR, hi = planned + 12 * HOUR;
    const inSpan = (t: number) => t >= lo && t < hi;
    const openMark = sorted.find((m) => m.boundary === "OPENED" && inSpan(Date.parse(m.at)));
    const spanMeals = meals.filter(inSpan);
    const opened = openMark ? Date.parse(openMark.at) : spanMeals[0];
    if (opened === undefined) { out.push({ start: row.start, kind, planned, source: "UNKNOWN" }); return; }
    const closeMark = sorted.find((m) => m.boundary === "CLOSED" && Date.parse(m.at) > opened && Date.parse(m.at) < opened + DAY);
    const lastMeal = spanMeals.filter((t) => t > opened).at(-1);
    const closed = closeMark ? Date.parse(closeMark.at) : lastMeal;
    out.push({ start: row.start, kind, planned, opened, ...(closed !== undefined ? { closed } : {}), source: openMark && (closeMark || closed === undefined) ? "MARKED" : "MEALS" });
  });
  return out;
}

export interface ActualSummary {
  kind: EatingWindowDayKind;
  /** Days of this kind in the look-back, known or not. */
  days: number;
  known: number; marked: number; fromMeals: number;
  enough: boolean;
  opensAt?: string; closesAt?: string; eatingMinutes?: number;
}

/** Pure. Medians by kind over the look-back days, with the counts behind them. Below the floor, counts only. */
export function summarizeActual(days: readonly ActualDay[], settings: Pick<EatingWindowSettings, "opensAt">): ActualSummary[] {
  return KINDS.map((kind) => {
    const all = days.filter((d) => d.kind === kind);
    const known = all.filter((d) => d.opened !== undefined);
    const base: ActualSummary = { kind, days: all.length, known: known.length, marked: known.filter((d) => d.source === "MARKED").length,
      fromMeals: known.filter((d) => d.source === "MEALS").length, enough: known.length >= WINDOW_REVIEW.FLOOR_DAYS };
    if (!base.enough) return base;
    const plan = toMinutes(settings.opensAt[kind]);
    const openOffset = median(known.map((d) => (d.opened! - d.planned) / MIN))!;
    const closing = known.filter((d) => d.closed !== undefined);
    const closeOffset = median(closing.map((d) => (d.closed! - d.planned) / MIN));
    const eating = median(closing.map((d) => (d.closed! - d.opened!) / MIN));
    return { ...base, opensAt: toClock(plan + openOffset), ...(closeOffset !== undefined ? { closesAt: toClock(plan + closeOffset) } : {}),
      ...(eating !== undefined ? { eatingMinutes: Math.round(eating) } : {}) };
  });
}

/** Plain words for one kind's block. */
export function actualLine(s: ActualSummary): { title: string; text: string; counts: string; estimate: boolean } {
  const title = s.kind === "WORK" ? "Work days" : s.kind === "RECOVERY" ? "Recovery days" : "Days off";
  if (!s.enough) return { title, text: `Not enough days yet (${s.known} of ${WINDOW_REVIEW.FLOOR_DAYS}).`, counts: "", estimate: false };
  const parts = [`Opens around ${s.opensAt}`];
  if (s.closesAt) parts.push(`closes around ${s.closesAt}`);
  const hours = s.eatingMinutes !== undefined ? `, about ${hoursText(s.eatingMinutes)} of eating` : "";
  const counts = `${s.days} ${KIND_DAYS[s.kind]}: ${s.marked} marked, ${s.fromMeals} from meals${s.days > s.known ? `, ${s.days - s.known} unknown` : ""}.`;
  return { title, text: `${parts.join(", ")}${hours}.`, counts, estimate: s.fromMeals > 0 };
}

export interface PlanOffer { kind: EatingWindowDayKind; from: string; to: string; line: string }

/**
 * Pure. At most one offer: on a kind where his real opening was 45 minutes or more off the plan on at least 4 of its
 * last 6 known days, move the plan's opening to their median, rounded to 15 minutes. KEEP hides that kind's offer for
 * 14 days. Only the opening time moves; the window's length never changes, so an offer can never narrow it.
 */
export function planOffer(days: readonly ActualDay[], settings: Pick<EatingWindowSettings, "opensAt">, pref: WindowReviewPreference, now: Date): PlanOffer | null {
  for (const kind of KINDS) {
    const kept = pref.keptOffers[kind];
    if (kept && now.getTime() - new Date(`${kept}T00:00:00`).getTime() < WINDOW_REVIEW.KEEP_HIDES_DAYS * DAY) continue;
    const recent = days.filter((d) => d.kind === kind && d.opened !== undefined).slice(-WINDOW_REVIEW.OFFER_RECENT_DAYS);
    const offsets = recent.map((d) => (d.opened! - d.planned) / MIN);
    if (offsets.filter((o) => Math.abs(o) >= WINDOW_REVIEW.OFFER_GAP_MINUTES).length < WINDOW_REVIEW.OFFER_NEEDS_DAYS) continue;
    const plan = toMinutes(settings.opensAt[kind]);
    const step = WINDOW_REVIEW.OFFER_ROUND_MINUTES;
    const to = toClock(Math.round((plan + median(offsets)!) / step) * step);
    if (to === settings.opensAt[kind]) continue;
    const from = settings.opensAt[kind];
    return { kind, from, to, line: `On ${KIND_DAYS[kind]} you've opened around ${to}, not ${from}. Move the plan to ${to}?` };
  }
  return null;
}

/** Pure. The settings after MOVE: only that kind's opening changes. */
export function applyOffer<S extends Pick<EatingWindowSettings, "opensAt">>(settings: S, offer: PlanOffer): S {
  return { ...settings, opensAt: { ...settings.opensAt, [offer.kind]: offer.to } };
}

// ---- 2. Is it working --------------------------------------------------------------------------------------------

export const isWindowTry = (e: Experiment) => e.what === WINDOW_TRY_PREFIX || e.what.startsWith(`${WINDOW_TRY_PREFIX} `);

/** The open eating-window Try, if any (newest). */
export function openWindowTry(all: readonly Experiment[]): Experiment | undefined {
  return all.filter((e) => isWindowTry(e) && e.entry.status === "OPEN").sort((a, b) => b.from.getTime() - a.from.getTime())[0];
}

export interface ReviewLine { label: string; text: string }
export interface ReviewInputs {
  rows: readonly PictureRow[];
  actual: readonly ActualDay[];
  weighIns: readonly WeighIn[];
  alpha: number;
  goalWeightLbs: number | undefined;
  proteinTargetG: number | undefined;
  strength: { state: Assessment; missing: readonly string[] } | null;
  now: Date;
}
export interface WindowReview { lines: ReviewLine[]; guardrails: string[]; pace: number | undefined }

const lb = (n: number) => `${n.toFixed(1)} lb`;
const inRange = (iso: string, from: number, to: number) => { const t = Date.parse(iso); return t >= from && t < to; };

/** Pure. Weight trend at the start and now, its pace, and weeks to goal only when it's heading there. */
export function weightLine(e: Experiment, weighIns: readonly WeighIn[], alpha: number, goal: number | undefined, now: Date): { text: string; pace: number | undefined } {
  const end = Math.min(now.getTime(), e.to.getTime());
  const during = weighIns.filter((w) => inRange(w.recordedAt, e.from.getTime(), end + 1));
  if (!trendReady(during)) {
    return { text: `Not enough weigh-ins to tell (${during.length} during; it needs ${TREND_MIN_WEIGH_INS} over ${TREND_MIN_SPAN_DAYS} days).`, pace: undefined };
  }
  const points = smoothWeights(weighIns.filter((w) => Date.parse(w.recordedAt) <= end), { alpha });
  const before = points.filter((p) => Date.parse(p.recordedAt) < e.from.getTime()).at(-1)
    ?? points.find((p) => Date.parse(p.recordedAt) >= e.from.getTime())!;
  const last = points.at(-1)!;
  const weeks = Math.max(1, (Date.parse(last.recordedAt) - Date.parse(before.recordedAt)) / DAY) / 7;
  const pace = Math.round(((last.trendLbs - before.trendLbs) / weeks) * 10) / 10;
  let text = `${lb(before.trendLbs)} at the start, ${lb(last.trendLbs)} now, ${pace > 0 ? "+" : ""}${pace.toFixed(1)} lb a week (${during.length} weigh-ins).`;
  const gap = goal !== undefined ? goal - last.trendLbs : 0;
  if (goal !== undefined && pace !== 0 && gap !== 0 && Math.sign(gap) === Math.sign(pace)) {
    text += ` About ${Math.ceil(Math.abs(gap) / Math.abs(pace))} weeks to ${Math.round(goal)} at this pace.`;
  }
  return { text, pace };
}

/** Pure. The review at the end of the Try: lines with their counts, and at most two guardrail lines. */
export function windowReview(e: Experiment, inputs: ReviewInputs): WindowReview {
  const from = e.from.getTime(), to = e.to.getTime();
  const recorded = inputs.rows.filter((r) => r.dayIds.length);
  const during = recorded.filter((r) => inRange(r.start, from, to));
  const before = recorded.filter((r) => inRange(r.start, from - e.days * DAY, from));
  const lines: ReviewLine[] = [];

  const weight = weightLine(e, inputs.weighIns, inputs.alpha, inputs.goalWeightLbs, inputs.now);
  lines.push({ label: "Weight trend", text: weight.text });

  const target = inputs.proteinTargetG;
  let proteinGuard: string | null = null;
  if (target === undefined) {
    lines.push({ label: "Protein", text: "No protein target yet, so there's nothing to count against." });
  } else {
    const known = (rs: readonly PictureRow[]) => rs.filter((r) => r.protein !== undefined);
    const reached = (rs: readonly PictureRow[]) => rs.filter((r) => r.protein! >= target).length;
    const d = known(during), b = known(before);
    const td = d.filter((r) => r.sessions > 0), tb = b.filter((r) => r.sessions > 0);
    lines.push({ label: "Protein", text: `Target reached on ${reached(d)} of ${d.length} days during, ${reached(b)} of ${b.length} before (days with food logged).` });
    lines.push({ label: "Protein on training days", text: `${reached(td)} of ${td.length} during, ${reached(tb)} of ${tb.length} before.` });
    const lastTraining = td.slice(-WINDOW_REVIEW.GUARD_TRAINING_DAYS);
    const under = lastTraining.length - reached(lastTraining);
    if (under >= WINDOW_REVIEW.GUARD_NEEDS_DAYS) {
      proteinGuard = `Protein has been under target on ${under} of ${lastTraining.length} training days. A wider window on training days may help.`;
    }
  }

  const strength = inputs.strength;
  lines.push({ label: "Strength", text: !strength || strength.state === "UNCERTAIN"
    ? `Not enough comparable lifts to tell${strength?.missing.length ? ` (${strength.missing.join("; ")})` : ""}.`
    : strength.state === "NEEDS ATTENTION" ? "Lower than the 4 weeks before, across your comparable lifts."
    : "Holding or rising across your comparable lifts, compared with the 4 weeks before." });

  const result = experimentResult(e, inputs.rows);
  for (const line of result.lines) {
    // The Try's lines lead with their own name ("Main sleep: …", "Check-in energy: …"); "Trained on …" has none.
    const colon = line.text.indexOf(": ");
    lines.push(colon > 0 && colon < 24 ? { label: line.text.slice(0, colon), text: line.text.slice(colon + 2) } : { label: "Training", text: line.text });
  }
  if (!result.enough && result.need) lines.push({ label: "Sleep and energy", text: `Not enough to compare yet: ${result.need}.` });

  const kept = inputs.actual.filter((d) => inRange(d.start, from, to));
  const keptKnown = kept.filter((d) => d.opened !== undefined);
  const within = keptKnown.filter((d) => Math.abs(d.opened! - d.planned) <= WINDOW_REVIEW.KEPT_WITHIN_MINUTES * MIN).length;
  lines.push({ label: "Window kept", text: `Opened within ${WINDOW_REVIEW.KEPT_WITHIN_MINUTES} minutes of the plan on ${within} of ${keptKnown.length} known days${kept.length > keptKnown.length ? `; ${kept.length - keptKnown.length} days unknown` : ""}.` });

  const guards: string[] = [];
  if (proteinGuard) guards.push(proteinGuard);
  if (strength?.state === "NEEDS ATTENTION" && weight.pace !== undefined && weight.pace < 0) {
    guards.push("Strength is lower than 4 weeks ago while your weight is dropping. Worth more protein or a wider window before anything else.");
  }
  const energy = meanDiffInterval(pictureValues(result.during, "energy"), pictureValues(result.usual, "energy"));
  if (energy && diffVerdict(energy.diff, energy.lo, energy.hi, SAME_ENERGY) === "down") {
    guards.push("Energy has been lower while you've been on the window. A wider window or more food on work nights may help.");
  }
  return { lines, guardrails: guards.slice(0, WINDOW_REVIEW.MAX_GUARDS), pace: weight.pace };
}

// ---- Reads and his taps ------------------------------------------------------------------------------------------

export type ReviewState =
  | { kind: "NONE" }
  | { kind: "RUNNING"; id: string; day: number; of: number }
  | { kind: "DUE"; id: string; days: number; review: WindowReview };

export interface WindowReviewView {
  settings: EatingWindowSettings;
  actual: ActualSummary[];
  offer: PlanOffer | null;
  review: ReviewState;
  pref: WindowReviewPreference;
}

/** Read only. Null when the window is off or not set up (the section then shows nothing new). */
export async function getWindowReviewView(now: Date = new Date()): Promise<WindowReviewView | null> {
  const settings = await getEatingWindowSettings();
  if (!settings?.enabled) return null;
  const [picture, events, experiments] = await Promise.all([
    getWholePicture(now),
    db.events.where("type").anyOf(["EATING_WINDOW_MARKED", "EATING_WINDOW_MARK_VOIDED"]).toArray(),
    getExperiments(),
  ]);
  const rows = [...picture.rows].sort((a, b) => a.start.localeCompare(b.start));
  const { marks } = readMarks(events, null);
  const allDays = actualWindows(rows, marks, settings);
  const lookbackFrom = rows.at(-WINDOW_REVIEW.LOOKBACK_DAYS)?.start ?? "";
  const recent = allDays.filter((d) => d.start >= lookbackFrom);
  const pref = readWindowReviewPreference();
  const tryE = openWindowTry(experiments);
  let review: ReviewState = { kind: "NONE" };
  if (tryE && now < tryE.to) review = { kind: "RUNNING", id: tryE.entry.id, day: Math.max(1, experimentDay(tryE, now)), of: tryE.days };
  else if (tryE) {
    const [weighIns, targets, proteinTargetG, train] = await Promise.all([
      getBodyweightHistory(), getNutritionTargets(), getEffectiveProteinTargetG(), getTrainProgress(now).catch(() => null),
    ]);
    review = { kind: "DUE", id: tryE.entry.id, days: tryE.days, review: windowReview(tryE, {
      rows, actual: allDays, weighIns, alpha: TREND_ALPHA[readWeightTrendPreference().smoothing], goalWeightLbs: targets.goalWeightLbs,
      proteinTargetG, strength: train ? { state: train.assessment.state, missing: train.assessment.missing } : null, now,
    }) };
  }
  return { settings, actual: summarizeActual(recent, settings), offer: planOffer(recent, settings, pref, now), review, pref };
}

/** MOVE: his own change to the plan's opening for that kind (`setAt` updated by the save). */
export async function moveWindowPlan(settings: EatingWindowSettings, offer: PlanOffer): Promise<EatingWindowSettings> {
  const { setAt: _setAt, ...rest } = applyOffer(settings, offer);
  return saveEatingWindowSettings(rest);
}

/** KEEP on an offer: hidden for that kind for 14 days. */
export function keepWindowPlan(kind: EatingWindowDayKind, now: Date = new Date()): void {
  const pref = readWindowReviewPreference();
  writeWindowReviewPreference({ ...pref, keptOffers: { ...pref.keptOffers, [kind]: localIso(now) } });
}

/** CHECK HOW IT'S GOING: a Try over every day, named for his preset. */
export async function startWindowReview(settings: EatingWindowSettings, days: number, now: Date = new Date()): Promise<Experiment> {
  if (!(REVIEW_LENGTHS as readonly number[]).includes(days)) throw new Error("REVIEW_LENGTH: 14 or 28 days.");
  return startExperiment({ what: `${WINDOW_TRY_PREFIX} ${presetLabel(settings.eatingHours)}`, days, scope: "ALL", now });
}

/**
 * His choice at the review. Each closes the Try through the journal's own review with the matching outcome and an
 * optional lesson. PAUSE and END also turn the window off (settings kept). One atomic write, so a failure changes
 * nothing.
 */
export async function closeWindowReview(id: string, choice: ReviewChoice, settings: EatingWindowSettings, lesson?: string): Promise<void> {
  await writeAtomically(["decisionJournalEntries", "schedulePatterns"], async () => {
    await closeExperiment(id, REVIEW_CHOICES[choice], lesson);
    if (choice === "PAUSE" || choice === "END") {
      const { setAt: _setAt, ...rest } = settings;
      await saveEatingWindowSettings({ ...rest, enabled: false });
    }
  });
}
