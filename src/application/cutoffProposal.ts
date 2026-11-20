import type { RhythmNight } from "../engine/sleepRhythm";

/**
 * C4.2a (Gavin, 2026-11-20, "Start it"): DELTA notices a pattern in his own sleep and suggests a longer caffeine
 * cut-off; nothing changes until he taps APPROVE, and UNDO puts it back. The same shape as the weekly calorie
 * proposal (TARGET-PROPOSAL-001): a pure function that proposes, never writes, never reaches the Engine.
 *
 * The evidence is his Garmin-measured main sleeps after work shifts (SLEEP-RHYTHM-001's work-day nights, the last 28
 * days, counted only since the cut-off was last set so a change is judged on its own nights). When most of the
 * recent ones are under 7 hours (SOURCES.SHORT_SLEEP), DELTA suggests one step longer. Caffeine 6 h before bed still
 * cut measured sleep by over an hour in Drake et al. 2013 (SOURCES.CAFFEINE_STILL_CUTS), so a longer gap is a cheap,
 * reversible thing to try.
 *
 * BEYOND doesn't record caffeine, so this is a pattern in his sleep, not proof caffeine caused it, and confidence is
 * never stated as high. It suggests only a longer cut-off, at most MAX_SUGGESTED_HOURS; he can set any value himself.
 */
export const SOURCES = {
  SHORT_SLEEP: {
    label: "Watson et al. 2015, Recommended Amount of Sleep for a Healthy Adult (AASM and SRS consensus). SLEEP 38(6):843–844",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/",
    quote: "Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.",
  },
  CAFFEINE_STILL_CUTS: {
    label: "Drake, Roehrs, Shambroom & Roth 2013, J Clin Sleep Med 9(11):1195–1200",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/",
    quote: "For TST, reductions in duration relative to placebo were signifi-cant at each of the caffeine administration time points, reducing TST between 1.1 to 1.2 hours.",
    /** The study's dose, so the card can say it isn't his drink's. */
    doseMg: 400,
  },
} as const;

/** Under this, a main sleep is short (SOURCES.SHORT_SLEEP). */
export const SHORT_SLEEP_MINUTES = 7 * 60;
/** Work-day nights needed since the cut-off was last set before DELTA says anything. */
export const SUGGEST_MIN_NIGHTS = 7;
/** Only the most recent nights count, so an old stretch can't drive today's suggestion. */
export const SUGGEST_RECENT_NIGHTS = 14;
/** Most of the recent nights must be short: at least this share. */
export const SHORT_SHARE = 2 / 3;
/** From this many nights the confidence reads "moderate"; below it, "low". Never higher: caffeine isn't recorded. */
export const MODERATE_FROM_NIGHTS = 10;
/** DELTA suggests one step at a time, and never past this. */
export const SUGGEST_STEP_HOURS = 2;
export const MAX_SUGGESTED_HOURS = 8;
/** After NOT NOW, DELTA stays quiet this long. */
export const QUIET_DAYS = 14;

const DAY_MS = 86_400_000;

export type CutoffSuggestion =
  | {
      kind: "PROPOSAL";
      hours: number;
      currentHours: number;
      nights: number;
      shortNights: number;
      medianMinutes: number;
      confidence: "LOW" | "MODERATE";
      /** The nights behind it, newest first. */
      evidence: { livedDayStart: string; asleepMinutes: number }[];
    }
  /** Most recent work-day sleeps are 7 h or more: nothing to suggest. */
  | { kind: "FITS"; currentHours: number; nights: number; shortNights: number; medianMinutes: number }
  /** He's at or past the longest cut-off DELTA suggests; anything more is his own call. */
  | { kind: "AT_MOST"; currentHours: number }
  /** He said NOT NOW recently. */
  | { kind: "QUIET"; until: string }
  | { kind: "WAITING"; have: number; need: number; since?: string };

export interface CutoffSuggestionInput {
  nights: readonly RhythmNight[];
  currentHours: number;
  /** ISO; when he last set the cut-off, if ever. */
  setAt?: string | undefined;
  /** ISO; when he last said NOT NOW. */
  declinedAt?: string | undefined;
  now: Date;
}

const median = (values: readonly number[]) => {
  const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
};

/** Pure. */
export function suggestCaffeineCutoff({ nights, currentHours, setAt, declinedAt, now }: CutoffSuggestionInput): CutoffSuggestion {
  if (declinedAt) {
    const until = Date.parse(declinedAt) + QUIET_DAYS * DAY_MS;
    if (until > now.getTime()) return { kind: "QUIET", until: new Date(until).toISOString() };
  }
  if (currentHours >= MAX_SUGGESTED_HOURS) return { kind: "AT_MOST", currentHours };
  const sinceMs = setAt ? Date.parse(setAt) : -Infinity;
  // A lived day that began before the change still had its caffeine under the old cut-off: it doesn't count.
  const work = nights
    .filter((n) => n.kind === "WORK" && Date.parse(n.livedDayStart) >= sinceMs && Date.parse(n.livedDayStart) <= now.getTime())
    .sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart))
    .slice(0, SUGGEST_RECENT_NIGHTS);
  if (work.length < SUGGEST_MIN_NIGHTS) return { kind: "WAITING", have: work.length, need: SUGGEST_MIN_NIGHTS, ...(setAt ? { since: setAt } : {}) };
  const minutes = work.map((n) => n.asleepMinutes);
  const shortNights = minutes.filter((m) => m < SHORT_SLEEP_MINUTES).length;
  const medianMinutes = median(minutes);
  if (shortNights < Math.ceil(work.length * SHORT_SHARE) || medianMinutes >= SHORT_SLEEP_MINUTES) {
    return { kind: "FITS", currentHours, nights: work.length, shortNights, medianMinutes };
  }
  return {
    kind: "PROPOSAL",
    hours: Math.min(currentHours + SUGGEST_STEP_HOURS, MAX_SUGGESTED_HOURS),
    currentHours, nights: work.length, shortNights, medianMinutes,
    confidence: work.length >= MODERATE_FROM_NIGHTS ? "MODERATE" : "LOW",
    evidence: work.map((n) => ({ livedDayStart: n.livedDayStart, asleepMinutes: n.asleepMinutes })),
  };
}
