import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { deriveSleepRhythm, type SleepRhythm } from "../engine/sleepRhythm";
import { getSchedulePattern } from "./queries";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";

/**
 * BIG-IDEAS-001 item 3, the circadian plan (Protected, approved by Gavin 2026-11-09 "Everything but 4").
 * For the next scheduled shift: a pre-shift nap window, a caffeine cutoff and a light plan. Each card is
 * standard shift-work sleep guidance with its source, timed from the saved schedule and, where there are
 * enough Garmin-timed nights, your own usual work-day sleep (SLEEP-RHYTHM-001). Pure and read only. It never
 * feeds the Engine, and nothing is saved unless the operator taps SAVE, which adds an ordinary reminder.
 */
export interface PlanSource { label: string; url: string }
export interface PlanCard {
  kind: "NAP" | "CAFFEINE" | "LIGHT";
  title: string;
  /** What to do, with times. */
  detail: string;
  /** What the times come from: the shift, your measured sleep, or BEYOND's own margin. */
  basis: string;
  source: PlanSource;
  /** What SAVE adds: a reminder planned for that date. */
  reminder: { title: string; plannedAt: string };
}
export interface ShiftSleepPlan {
  shift: { date: string; start: string; end: string; overnight: boolean };
  cards: PlanCard[];
}

export const SOURCES = {
  NAP: { label: "NIOSH Training for Nurses on Shift Work and Long Work Hours: naps (citing AASM practice parameters)", url: "https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod7/06.html" },
  CAFFEINE: { label: "Drake et al. 2013, Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 9(11)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807" },
  LIGHT: { label: "Smith, Fogg & Eastman 2009, Practical interventions to promote circadian adaptation to permanent night shift work. SLEEP 32(11)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2768954" },
} as const satisfies Record<PlanCard["kind"], PlanSource>;

/** Caffeine at least this long before sleep (Drake et al. 2013). */
export const CAFFEINE_CUTOFF_HOURS = 6;
/** NIOSH's cited pre-night-shift naps run 1.5 to 3 hours. */
export const NAP_HOURS = { min: 1.5, max: 3 } as const;
/** BEYOND's margin, not a source's: the nap ends this long before the shift, to wake up and get there. */
export const NAP_MARGIN_MINUTES = 60;

const MIN = 60_000;
const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
const hoursText = (h: number) => (h === 1.5 ? "1½" : String(h));

/** The first time at clock minute `m` at or after `from`. */
function nextAtClock(from: Date, m: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(m / 60), m % 60);
  return at.getTime() >= from.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), at.getMinutes());
}

export function deriveShiftSleepPlan(input: { now: Date; pattern: SchedulePattern; rhythm: SleepRhythm | null }): ShiftSleepPlan | null {
  const { now, pattern, rhythm } = input;
  if (!isOperatorSavedSchedule(pattern)) return null;
  // The next shift that hasn't started yet, within the Week Ahead days (each date's lived day from 16:30).
  let shift: { date: string; start: Date; end: Date } | null = null;
  for (let offset = 0; offset < 7 && !shift; offset++) {
    const lived = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 16, 30);
    const w = livedDayShiftWindow(lived, pattern);
    if (w && w.start.getTime() > now.getTime()) shift = { date: formatLocalDate(lived), ...w };
  }
  if (!shift) return null;
  const overnight = formatLocalDate(shift.start) !== formatLocalDate(shift.end);
  const cards: PlanCard[] = [];

  // Usual main-sleep times after a shift: SLEEP-RHYTHM-001's work-day group, only with enough measured nights.
  const work = rhythm?.groups.find((g) => g.kind === "WORK");
  let sleepStart: Date | null = null, sleepEnd: Date | null = null;
  if (work) {
    const s = nextAtClock(shift.end, work.start);
    // Only a sleep that begins within 12 h of the shift's end is the sleep after this shift.
    if (s.getTime() - shift.end.getTime() <= 12 * 60 * MIN) { sleepStart = s; sleepEnd = nextAtClock(s, work.end); }
  }

  if (overnight) {
    const napEnd = new Date(shift.start.getTime() - NAP_MARGIN_MINUTES * MIN);
    const napFrom = new Date(napEnd.getTime() - NAP_HOURS.max * 60 * MIN);
    cards.push({
      kind: "NAP", title: "Pre-shift nap",
      detail: `A ${hoursText(NAP_HOURS.min)}–${hoursText(NAP_HOURS.max)} h nap between ${clock(napFrom)} and ${clock(napEnd)}, before your ${clock(shift.start)} shift.`,
      basis: `Timed from your ${weekday(shift.start)} ${clock(shift.start)} shift. Finishing ${NAP_MARGIN_MINUTES} minutes before it is BEYOND's margin to wake up and get there.`,
      source: SOURCES.NAP,
      reminder: { title: `Pre-shift nap, ${clock(napFrom)}–${clock(napEnd)}`, plannedAt: formatLocalDate(napFrom) },
    });
  }

  const sleepFrom = sleepStart ?? shift.end;
  const cutoff = new Date(sleepFrom.getTime() - CAFFEINE_CUTOFF_HOURS * 60 * MIN);
  cards.push({
    kind: "CAFFEINE", title: "Caffeine cutoff",
    detail: `Last caffeine by ${weekday(cutoff)} ${clock(cutoff)}.`,
    basis: sleepStart
      ? `${CAFFEINE_CUTOFF_HOURS} h before your usual post-shift sleep at ${clock(sleepStart)} (Garmin, ${work!.nights} work days).`
      : `${CAFFEINE_CUTOFF_HOURS} h before the shift ends at ${clock(shift.end)}, the earliest you'd sleep. BEYOND needs 3 Garmin-timed work-day sleeps to use your own.`,
    source: SOURCES.CAFFEINE,
    reminder: { title: `Last caffeine by ${clock(cutoff)}`, plannedAt: formatLocalDate(cutoff) },
  });

  if (overnight) {
    const bedroom = sleepStart && sleepEnd ? ` and a dark bedroom for your usual ${clock(sleepStart)}–${clock(sleepEnd)} sleep` : " and a dark bedroom for the sleep after";
    cards.push({
      kind: "LIGHT", title: "Light",
      detail: `Bright light in the first part of the shift. Dark sunglasses on the way home after ${clock(shift.end)}${bedroom}.`,
      basis: sleepStart ? `Your shift times and your usual work-day sleep (Garmin, ${work!.nights} work days).` : "Your shift times.",
      source: SOURCES.LIGHT,
      reminder: { title: `Sunglasses for the way home, ${clock(shift.end)}`, plannedAt: formatLocalDate(shift.end) },
    });
  }
  return { shift: { date: shift.date, start: shift.start.toISOString(), end: shift.end.toISOString(), overnight }, cards };
}

export async function getShiftSleepPlan(now: Date = new Date()): Promise<ShiftSleepPlan | null> {
  const [pattern, records, summaries] = await Promise.all([getSchedulePattern(), getImportedSleep(), getDaySummaries()]);
  return deriveShiftSleepPlan({ now, pattern, rhythm: deriveSleepRhythm(records.map((r) => r.evidence), summaries, now) });
}

