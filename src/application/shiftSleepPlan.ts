import type { SchedulePattern } from "../domain/common/types";
import type { Obligation } from "../domain/intent/types";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { deriveSleepRhythm, RHYTHM_MIN_NIGHTS, type SleepRhythm } from "../engine/sleepRhythm";
import { createObligation } from "./intentCommands";
import { getSchedulePattern } from "./queries";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { flips, flipSummary, RUN_MEAN_FLOOR } from "./rotationProjection";
import { getWholePicture } from "./wholePictureQueries";
import type { PictureRow } from "./wholePictureProjection";
import { getSleepPlanSettings } from "./sleepPlanSettings";
import { getTrainingHistory } from "./trainHistoryQueries";

/**
 * CIRCADIAN-SPIKE-001's first slice (BIG-IDEAS-001 item 3, Protected; Gavin, 2026-11-11 "Approved"). For the next
 * shift transition (a shift under way, or one starting within 24 h): a caffeine cutoff, a pre-shift nap window, your
 * own first sleep after past runs, and light on the way home. Each card shows the rule it used, its source and what
 * it assumed. Shown in ROUTE (the cave), never on TODAY's primary rows. Pure and read only; never an Engine input.
 * SAVE adds a plan item through createObligation with plannedAt only (never dueAt), so it stays advisory and can't
 * reach evaluate's arbitration. No schema change, no network, no notification.
 */
export interface PlanSource {
  label: string; url: string; quote: string;
  /** How the quote was checked, when not read in full text here (Gavin chose "search-confirmed", 2026-11-11). */
  checked?: string;
}
export type PlanCardKind = "CAFFEINE" | "NAP" | "FIRST_SLEEP" | "LIGHT" | "TRAINING";
export interface PlanCard {
  kind: PlanCardKind;
  title: string;
  /** What the card says, with times. */
  detail: string;
  /** Which inputs it used and what it assumed. */
  basis: string;
  /** Null for a card that only shows your own records. */
  source: PlanSource | null;
  /** What SAVE adds after the preview: a plan item on that date. */
  plan: { title: string; plannedAt: string };
}
export interface ShiftSleepPlan {
  shift: { date: string; start: string; end: string; overnight: boolean; firstOfRun: boolean; lastOfRun: boolean };
  cards: PlanCard[];
  /**
   * DAY-MAP-001 slice 2 (Gavin, 2026-11-13, "A"): the same windows the cards describe, as times, for TODAY's lived-day
   * bar. The nap window (only when your own wake time gives one) and your usual post-shift sleep (Garmin rhythm). No
   * new rule: these are the cards' own numbers.
   */
  windows: { kind: "NAP" | "SLEEP"; start: string; end: string; basis: "RHYTHM" | "PAST_RUNS" }[];
  /** C4.2a: the cut-off the CAFFEINE card used, and whose number it is (the default or his own). */
  caffeine: { hours: number; setBy: CutoffSetBy };
  /** C1.1: the CAFFEINE card's cut-off instant, for Orientation's runway. Same number the card states. */
  caffeineAt: string;
  /**
   * C4.4 (Gavin, 2026-11-23, TRAIN finish 2): when to train before this shift, from your usual wake time on that kind
   * of day plus WAKE_MARGIN_MINUTES, to TRAIN_PREP_MINUTES before the shift starts. Null without a saved schedule, a
   * Garmin wake time, a shift still ahead, or TRAIN_WINDOW_MIN_MINUTES of room.
   */
  trainWindow: { start: string; end: string; wake: string } | null;
}

/** C4.4: leave this long between the train window's end and the shift (eat, shower, nap, PREFLIGHT). */
export const TRAIN_PREP_MINUTES = 120;
/** C4.4: a window shorter than this isn't offered. */
export const TRAIN_WINDOW_MIN_MINUTES = 45;
/** C4.4: "hard" is your own top third by volume among this many recent finished sessions (at least HARD_MIN_SESSIONS). */
export const HARD_LOOKBACK_SESSIONS = 12;
export const HARD_MIN_SESSIONS = 6;
/** C4.4: "late" is a session ending this close before your usual sleep. */
export const LATE_TRAINING_HOURS = 3;
/** C4.4: a session counts for tonight when it ended within this many hours. */
export const TRAINING_RECENT_HOURS = 20;
export interface FinishedTraining { endedAt: string; volumeLbs: number }
export type CutoffSetBy = "DEFAULT" | "OWNER";

/** Cited constants: each rule number lives here with the source sentence it comes from (quoted from the full text). */
export const SOURCES = {
  CAFFEINE: {
    label: "Drake, Roehrs, Shambroom & Roth 2013, J Clin Sleep Med 9(11):1195–1200",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/",
    quote: "…provides empirical support for sleep hygiene recommendations to refrain from substantial caffeine use for a minimum of 6 hours prior to bedtime.",
  },
  NAP: {
    label: "AASM practice parameters for circadian rhythm sleep disorders, Morgenthaler et al. 2007, SLEEP 30(11)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2082098/",
    quote: "Planned napping before or during the night shift is indicated to improve alertness and performance among night shift workers.",
  },
  WAKE_MARGIN: {
    label: "Hilditch & McHill 2019, Sleep inertia: current insights. Nat Sci Sleep 11:155–165",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6710480/",
    quote: "While the initial dissipation of impairment is rapid, full recovery does not appear to be complete until at least an hour after awakening.",
  },
  FIRST_SLEEP: {
    label: "Kalkanis et al. 2023, Recovery from shift work. Front Neurol 14:1270043",
    url: "https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2023.1270043/full",
    quote: "The night-shift worker should aim to go to bed as early as possible after the shift to avoid longer exposure to morning light and excessive delay of the temperature nadir.",
    checked: "Quote from search results; the full text could not be read automatically.",
  },
  LIGHT: {
    label: "Smith, Fogg & Eastman 2009, Practical interventions to promote circadian adaptation to permanent night shift work. SLEEP 32(11)",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2768954/",
    quote: "The primary purpose of the sunglasses was to attenuate phase-advancing outdoor light exposure during the travel home time after night shifts…",
  },
} as const satisfies Record<string, PlanSource>;

/**
 * Default gap before sleep, based on general guidance (SOURCES.CAFFEINE). C4.2a: the owner can change
 * it explicitly (sleepPlanSettings.ts); this is general guidance, not a learned personal threshold.
 */
export const CAFFEINE_CUTOFF_HOURS = 6;
/** Wake at least this long before the shift: sleep inertia takes at least an hour to clear (SOURCES.WAKE_MARGIN). */
export const WAKE_MARGIN_MINUTES = 60;
/** Only the next transition: a shift under way, or one starting within this many hours. */
export const LOOKAHEAD_HOURS = 24;

const MIN = 60_000;
const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
const livedStart = (now: Date, offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 16, 30);

/** The first time at clock minute `m` at or after `from`. */
function nextAtClock(from: Date, m: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(m / 60), m % 60);
  return at.getTime() >= from.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), at.getMinutes());
}
/** The last time at clock minute `m` at or before `to`. */
function lastAtClock(to: Date, m: number): Date {
  const at = new Date(to.getFullYear(), to.getMonth(), to.getDate(), Math.floor(m / 60), m % 60);
  return at.getTime() <= to.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() - 1, at.getHours(), at.getMinutes());
}

export interface ShiftSleepPlanInput {
  now: Date; pattern: SchedulePattern; rhythm: SleepRhythm | null; rows: readonly PictureRow[];
  /** C4.2a: his own cut-off, when he set one; otherwise CAFFEINE_CUTOFF_HOURS. */
  caffeineCutoff?: { hours: number; setBy: "OWNER" } | undefined;
  /** C4.4: finished strength sessions (COMPLETED or PARTIAL, with recorded volume), any order. */
  training?: readonly FinishedTraining[] | undefined;
}

/** C4.2a: where the cut-off's number comes from, said on the card. */
function cutoffWords(hours: number, setBy: CutoffSetBy): string {
  if (setBy === "DEFAULT") return `${hours} h`;
  const below = hours < CAFFEINE_CUTOFF_HOURS ? `, below BEYOND's ${CAFFEINE_CUTOFF_HOURS} h default` : "";
  return `${hours} h (your setting${below})`;
}

/**
 * C4.4 · Training feeds the night (HARVEST-003 W2). Pure. A card only when the most recent session (ended within
 * TRAINING_RECENT_HOURS) was hard by your own record (top third by volume of your last HARD_LOOKBACK_SESSIONS, with at
 * least HARD_MIN_SESSIONS to compare) or ended within LATE_TRAINING_HOURS of your usual sleep. Facts from your records
 * only; no length or rule is prescribed, and nothing reaches the Engine or workout choice.
 */
export function deriveTrainingCard(now: Date, training: readonly FinishedTraining[], usualSleep: { start: number; end: number } | null): PlanCard | null {
  const done = training.filter((t) => t.volumeLbs > 0 && Date.parse(t.endedAt) <= now.getTime()).sort((a, b) => a.endedAt.localeCompare(b.endedAt));
  const last = done.at(-1);
  if (!last || now.getTime() - Date.parse(last.endedAt) > TRAINING_RECENT_HOURS * 60 * MIN) return null;
  const ended = new Date(last.endedAt);
  // The sleep this session leads into: the next time your usual main sleep starts (Garmin rhythm). For a night worker a
  // 13:00 session leads into the 07:30 sleep after that night's shift.
  const sleepStart = usualSleep ? nextAtClock(ended, usualSleep.start) : null;
  const sleep = sleepStart ? { start: sleepStart, end: nextAtClock(sleepStart, usualSleep!.end) } : null;
  if (sleep && sleep.end.getTime() <= now.getTime()) return null; // that sleep is already behind you
  const pool = done.slice(-HARD_LOOKBACK_SESSIONS);
  const sorted = pool.map((t) => t.volumeLbs).sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 2 / 3)] ?? Infinity;
  const hard = pool.length >= HARD_MIN_SESSIONS && last.volumeLbs >= threshold;
  const gapMin = sleep ? Math.round((sleep.start.getTime() - ended.getTime()) / MIN) : null;
  const late = gapMin !== null && gapMin <= LATE_TRAINING_HOURS * 60;
  if (!hard && !late) return null;
  const facts = [
    hard ? `Your ${clock(ended)} session was one of your hardest: ${Math.round(last.volumeLbs).toLocaleString("en-US")} lb, in the top third of your last ${pool.length}.` : null,
    late ? `It ended ${Math.floor(gapMin! / 60)} h ${gapMin! % 60} min before your usual sleep at ${clock(sleep!.start)}.` : null,
  ].filter(Boolean).join(" ");
  const keep = sleep ? ` Keep your sleep window, ${clock(sleep.start)}–${clock(sleep.end)}.` : " Keep your next main sleep protected.";
  return {
    kind: "TRAINING", title: "Protect sleep tonight",
    detail: `${facts}${keep}`,
    basis: `Your workout records${sleep ? " and your usual sleep (Garmin)" : ""}. "Hard" is your own top third by volume; "late" is within ${LATE_TRAINING_HOURS} h of sleep. No length is prescribed, and your workout advice is unchanged.`,
    source: null,
    plan: { title: "Protect sleep after today's training", plannedAt: formatLocalDate(sleep?.start ?? now) },
  };
}

export function deriveShiftSleepPlan({ now, pattern, rhythm, rows, caffeineCutoff, training }: ShiftSleepPlanInput): ShiftSleepPlan | null {
  const cutoffHours = caffeineCutoff?.hours ?? CAFFEINE_CUTOFF_HOURS;
  const cutoffSetBy: CutoffSetBy = caffeineCutoff?.setBy ?? "DEFAULT";
  if (!isOperatorSavedSchedule(pattern)) return null;
  let found: { offset: number; start: Date; end: Date } | null = null;
  for (let offset = -1; offset <= 1 && !found; offset++) {
    const w = livedDayShiftWindow(livedStart(now, offset), pattern);
    if (w && w.end > now && w.start.getTime() - now.getTime() <= LOOKAHEAD_HOURS * 60 * MIN) found = { offset, ...w };
  }
  if (!found) return null;
  const { offset, start, end } = found;
  const kind = (k: number) => scheduledWorkContextForLivedDay(livedStart(now, k), pattern);
  const firstOfRun = kind(offset - 1) === "OFF", lastOfRun = kind(offset + 1) === "OFF";
  const overnight = formatLocalDate(start) !== formatLocalDate(end);
  const started = start <= now;
  const work = rhythm?.groups.find((g) => g.kind === "WORK");
  const cards: PlanCard[] = [];
  const windows: ShiftSleepPlan["windows"] = [];

  // 1. Caffeine: the cut-off (6 h unless he set his own) before your usual post-shift main sleep (work days), or the shift's end with too little history.
  let sleepStart: Date | null = null;
  if (work) {
    const s = nextAtClock(end, work.start);
    // Only a usual sleep that begins within 12 h of the shift's end is the sleep after this shift.
    if (s.getTime() - end.getTime() <= 12 * 60 * MIN) sleepStart = s;
  }
  // Review of #507: on the last shift of a run the FIRST SLEEP card's own times (past runs) are the sleep window, so
  // TODAY and ROUTE never disagree; the work-day rhythm is used otherwise.
  if (sleepStart && work && !lastOfRun) windows.push({ kind: "SLEEP", start: sleepStart.toISOString(), end: nextAtClock(sleepStart, work.end).toISOString(), basis: "RHYTHM" });
  const cutoff = new Date((sleepStart ?? end).getTime() - cutoffHours * 60 * MIN);
  cards.push({
    kind: "CAFFEINE", title: "Caffeine cutoff",
    detail: `No substantial caffeine after ${weekday(cutoff)} ${clock(cutoff)}${cutoff <= now ? " (already passed)" : ""}.`,
    basis: sleepStart
      ? `${cutoffWords(cutoffHours, cutoffSetBy)} before your usual post-shift sleep at ${clock(sleepStart)} (Garmin, ${work!.nights} work days).`
      : `${cutoffWords(cutoffHours, cutoffSetBy)} before the shift ends at ${clock(end)}, the earliest you'd sleep. Your own sleep time is used after ${RHYTHM_MIN_NIGHTS} Garmin-timed work days.`,
    source: SOURCES.CAFFEINE,
    plan: { title: `No caffeine after ${clock(cutoff)}`, plannedAt: formatLocalDate(cutoff) },
  });

  // 2. Nap: before a night shift that hasn't started, in the gap between your last main sleep and the shift.
  if (overnight && !started) {
    const latestEnd = new Date(start.getTime() - WAKE_MARGIN_MINUTES * MIN);
    // The day before is a day off on the first night of a run, otherwise a work day.
    const before = rhythm?.groups.find((g) => g.kind === (firstOfRun ? "OFF" : "WORK"));
    const wake = before ? lastAtClock(latestEnd, before.end) : null;
    const gap = wake && wake < latestEnd && latestEnd.getTime() - wake.getTime() <= 16 * 60 * MIN ? wake : null;
    if (gap) windows.push({ kind: "NAP", start: gap.toISOString(), end: latestEnd.toISOString(), basis: "RHYTHM" });
    cards.push({
      kind: "NAP", title: firstOfRun ? "Pre-shift nap · first night of the run" : "Pre-shift nap",
      detail: gap
        ? `A planned nap between ${clock(gap)} and ${clock(latestEnd)}, before your ${clock(start)} shift.`
        : `A planned nap that ends by ${clock(latestEnd)}, before your ${clock(start)} shift.`,
      basis: `${gap ? `From your usual wake time on ${firstOfRun ? "days off" : "work days"} (Garmin, ${before!.nights} days) to ` : "Ending "}${WAKE_MARGIN_MINUTES} minutes before the shift, because grogginess after waking takes at least an hour to clear (${SOURCES.WAKE_MARGIN.label}). No nap length is set.`,
      source: SOURCES.NAP,
      plan: { title: `Pre-shift nap, done by ${clock(latestEnd)}`, plannedAt: formatLocalDate(latestEnd) },
    });
  }

  // 3. First sleep after the run: on the last shift of a run, sleep soon after (SOURCES.FIRST_SLEEP) and your own
  //    record from past runs. No length is prescribed: the sources disagree (CIRCADIAN-SPIKE-001).
  if (lastOfRun) {
    const summary = flipSummary(flips(rows), "OUT_OF_WORK");
    const usual = summary.before;
    const anchor = livedStart(now, offset);
    const at = (m: number) => new Date(anchor.getTime() + m * MIN);
    // Review of #481: the cited guidance is about night shifts, so a day shift gets your own record only.
    const soon = overnight ? "Sleep soon after this shift. " : "";
    if (usual) windows.push({ kind: "SLEEP", start: at(usual.start).toISOString(), end: at(usual.end).toISOString(), basis: "PAST_RUNS" });
    cards.push({
      kind: "FIRST_SLEEP", title: "First sleep after the run",
      detail: usual
        ? `${soon}After your last shift in past runs, your main sleep usually ran ${clock(at(usual.start))}–${clock(at(usual.end))}.`
        : `${soon}BEYOND shows your own first sleep after a run once ${RUN_MEAN_FLOOR} runs have Garmin-timed sleep (${summary.flips.length} runs on file).`,
      basis: usual ? `${overnight ? "Your shift's end, and your records" : "Your records"}: ${usual.days} past runs with Garmin-timed sleep (ROTATION-003). No length is prescribed.` : `${overnight ? "Your shift's end. " : "Your records only. "}No length is prescribed.`,
      source: overnight ? SOURCES.FIRST_SLEEP : null,
      plan: { title: usual ? `Sleep after the run, usually ${clock(at(usual.start))}` : "Sleep after the run", plannedAt: formatLocalDate(end) },
    });
  }

  // 5. C4.4: training feeds the night (a hard or late session), then the train window before this shift.
  const usual = rhythm?.groups.find((g) => g.kind === "WORK") ?? rhythm?.groups.find((g) => g.kind === "OFF") ?? null;
  const trainingCard = deriveTrainingCard(now, training ?? [], usual ? { start: usual.start, end: usual.end } : null);
  let trainWindow: ShiftSleepPlan["trainWindow"] = null;
  if (!started) {
    const dayBefore = rhythm?.groups.find((g) => g.kind === (firstOfRun ? "OFF" : "WORK"));
    const prepBy = new Date(start.getTime() - TRAIN_PREP_MINUTES * MIN);
    const wakeAt = dayBefore ? lastAtClock(prepBy, dayBefore.end) : null;
    if (wakeAt && start.getTime() - wakeAt.getTime() <= 16 * 60 * MIN) {
      const from = new Date(Math.max(wakeAt.getTime() + WAKE_MARGIN_MINUTES * MIN, now.getTime()));
      if (prepBy.getTime() - from.getTime() >= TRAIN_WINDOW_MIN_MINUTES * MIN) trainWindow = { start: from.toISOString(), end: prepBy.toISOString(), wake: wakeAt.toISOString() };
    }
  }

  // 4. Light on the way home after a night shift.
  if (overnight) {
    cards.push({
      kind: "LIGHT", title: "Light on the way home",
      detail: `After the shift ends at ${clock(end)}, if you're going straight to sleep, keep light low on the way home (dark sunglasses).`,
      basis: "Your shift's end time. BEYOND records no light, so it never says whether you did this.",
      source: SOURCES.LIGHT,
      plan: { title: `Sunglasses for the way home, ${clock(end)}`, plannedAt: formatLocalDate(end) },
    });
  }
  if (trainingCard) cards.push(trainingCard);
  return { trainWindow, shift: { date: formatLocalDate(livedStart(now, offset)), start: start.toISOString(), end: end.toISOString(), overnight, firstOfRun, lastOfRun }, cards, windows, caffeine: { hours: cutoffHours, setBy: cutoffSetBy }, caffeineAt: cutoff.toISOString() };
}

export async function getShiftSleepPlan(now: Date = new Date()): Promise<ShiftSleepPlan | null> {
  const [pattern, records, summaries, picture, settings, history] = await Promise.all([getSchedulePattern(), getImportedSleep(), getDaySummaries(), getWholePicture(now), getSleepPlanSettings(),
    getTrainingHistory().catch(() => [])]);
  // C4.4: finished strength sessions with a known end (start + duration) and recorded volume.
  const training = history.filter((h) => (h.status === "COMPLETED" || h.status === "PARTIAL") && h.durationMinutes !== null && h.volumeLbs > 0)
    .map((h) => ({ endedAt: new Date(Date.parse(h.startedAt) + h.durationMinutes! * MIN).toISOString(), volumeLbs: h.volumeLbs }));
  return deriveShiftSleepPlan({ now, pattern, rhythm: deriveSleepRhythm(records.map((r) => r.evidence), summaries, now), rows: picture.rows, caffeineCutoff: settings.caffeineCutoff, training });
}

/** C4.2a: owner-controlled cutoff configuration. No sleep-outcome inference or proposal. */
export interface CaffeineCutoffView { hours: number; setBy: CutoffSetBy; setAt?: string }
export async function getCaffeineCutoffView(): Promise<CaffeineCutoffView> {
  const own = (await getSleepPlanSettings()).caffeineCutoff;
  return { hours: own?.hours ?? CAFFEINE_CUTOFF_HOURS, setBy: own ? "OWNER" : "DEFAULT", ...(own ? { setAt: own.setAt } : {}) };
}

/** SAVE, after the preview: a plan item with plannedAt only. Never dueAt, so it stays advisory (PLANNED_TODAY at most). */
export function saveShiftPlanCard(card: PlanCard): Promise<Obligation> {
  const source = card.source ? ` Source: ${card.source.label}.` : "";
  return createObligation({ title: card.plan.title, plannedAt: card.plan.plannedAt, description: `${card.detail}${source}` });
}
