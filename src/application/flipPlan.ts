import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { deriveSleepRhythm, type SleepRhythm } from "../engine/sleepRhythm";
import { getSchedulePattern } from "./queries";
import { getImportedSleep } from "./externalSleepQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getConfirmedKinds } from "./scheduleExceptions";
import { getFlipSettingsView } from "./sleepPlanSettings";
import { SOURCES, type PlanCard } from "./shiftSleepPlan";
import { DEFAULT_FLIP, type FlipChoice, type FlipSetBy, type FlipSettings } from "../domain/flipPlan";

/**
 * GRAYSON-FLIP-PLAN-001 (C2.4, Gavin 2026-11-24; brief merged): the rotation flip. After the last night of a run, and
 * the day before the first night of one, one plan in one line: when to get up, when to get daylight, when to go to bed.
 * Two plans by the length of the break (NIOSH): FLIP BACK (a short sleep, daylight, a normal night) or STAY LATE (bed
 * about 03:00, up about 12:00, so the next run isn't a second flip); and BACK ON before the first night. Pure, read
 * only; never an Engine, recommendation, Delta or workout input. It never says whether he did it.
 */
export type FlipKind = "FLIP_BACK" | "STAY_LATE" | "BACK_ON";
export type { FlipChoice, FlipSettings, FlipSetBy } from "../domain/flipPlan";
export { DEFAULT_FLIP } from "../domain/flipPlan";
export interface FlipWindow { kind: "SLEEP" | "DAYLIGHT"; start: string; end: string; basis: "FLIP" }
export interface FlipPlan {
  kind: FlipKind;
  /** The lived day the plan belongs to (the last shift's, or FLIP DAY's), for SKIP. */
  date: string;
  breakDays: number;
  card: PlanCard;
  /** The one line TODAY shows under its moment. */
  line: string;
  windows: FlipWindow[];
  showFrom: string;
  showUntil: string;
}
/** Used for the flip-back bedtime until there are enough Garmin days-off nights. */
export const FALLBACK_BEDTIME = 23 * 60;
const MIN = 60_000;
const MAX_BREAK_DAYS = 14;
const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const clockOf = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const livedStart = (base: Date, offset: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 16, 30);
function nextAtClock(from: Date, m: number): Date {
  const at = new Date(from.getFullYear(), from.getMonth(), from.getDate(), Math.floor(m / 60) % 24, m % 60);
  return at.getTime() >= from.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, at.getHours(), at.getMinutes());
}
const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
const daysWords = (n: number) => `${NUMBER_WORDS[n] ?? n} days off`;
const own = (setBy: FlipSetBy, key: keyof FlipSettings) => (setBy[key] ? "your setting" : "default");

export interface FlipPlanInput {
  now: Date; pattern: SchedulePattern; rhythm: SleepRhythm | null;
  settings?: FlipSettings | undefined; setBy?: FlipSetBy | undefined;
  /** Confirmed schedule changes by lived-day date, which win over the rotation. */
  confirmed?: ReadonlyMap<string, "WORK" | "OFF"> | undefined;
}

export function deriveFlipPlan({ now, pattern, rhythm, settings = DEFAULT_FLIP, setBy = {}, confirmed }: FlipPlanInput): FlipPlan | null {
  if (!settings.show || !isOperatorSavedSchedule(pattern)) return null;
  // The lived day "now" belongs to (it starts at 16:30).
  const base = now.getHours() * 60 + now.getMinutes() < 16 * 60 + 30 ? livedStart(now, -1) : livedStart(now, 0);
  const shiftOf = (k: number) => {
    const start = livedStart(base, k), date = formatLocalDate(start), kind = confirmed?.get(date);
    if (kind === "OFF") return null;
    return livedDayShiftWindow(start, pattern);
  };
  const isOff = (k: number) => shiftOf(k) === null;
  const countOff = (from: number, step: 1 | -1) => { let n = 0; while (n < MAX_BREAK_DAYS && isOff(from + n * step)) n++; return n; };
  const off = rhythm?.groups.find((g) => g.kind === "OFF") ?? null;
  const overnight = (w: { start: Date; end: Date }) => formatLocalDate(w.start) !== formatLocalDate(w.end);

  // 1. After the last night of a run: FLIP BACK or STAY LATE, by the break's length.
  for (let k = -2; k <= 0; k++) {
    const w = shiftOf(k);
    if (!w || !overnight(w) || !isOff(k + 1)) continue;
    const breakDays = countOff(k + 1, 1);
    if (breakDays < 2) continue;
    const kind: FlipChoice = breakDays >= 3 ? settings.longBreak : settings.shortBreak;
    const date = formatLocalDate(livedStart(base, k));
    if (kind === "FLIP_BACK") {
      const wake = nextAtClock(w.end, settings.getUpBy);
      const bed = nextAtClock(wake, off ? off.start : FALLBACK_BEDTIME);
      if (now < w.start || now >= bed) continue;
      const dayStart = new Date(wake.getFullYear(), wake.getMonth(), wake.getDate(), Math.floor(settings.daylightStart / 60), settings.daylightStart % 60);
      const dayEnd = new Date(dayStart.getTime() + settings.daylightMinutes * MIN);
      const when = settings.daylightStart < 12 * 60 ? "this morning" : "this afternoon";
      const bedWords = off ? `Bed around ${clock(bed)}, your usual on days off.` : "Bed at your usual night-time.";
      const line = `Sleep soon after this shift and get up by ${clock(wake)}. Get outside in daylight ${when} (${clock(dayStart)}–${clock(dayEnd)}). ${bedWords}`;
      return {
        kind, date, breakDays, line, showFrom: w.start.toISOString(), showUntil: bed.toISOString(),
        windows: [
          { kind: "SLEEP", start: w.end.toISOString(), end: wake.toISOString(), basis: "FLIP" },
          { kind: "DAYLIGHT", start: dayStart.toISOString(), end: dayEnd.toISOString(), basis: "FLIP" },
        ],
        card: {
          kind, title: "Flip back", detail: line,
          basis: `${daysWords(breakDays)} after this run (your saved schedule), so one normal night. Get up by ${clock(wake)} (${own(setBy, "getUpBy")}); daylight ${clock(dayStart)}–${clock(dayEnd)} (${own(setBy, "daylightStart")}); ${off ? `bed from your Garmin days off (${off.nights} nights)` : "bed at your usual night-time until there are enough Garmin days-off nights"}. NIOSH's shift-work training warns against staying up all day after the last night. BEYOND records no light, so it never says whether you did this.`,
          source: SOURCES.LIGHT_TIMING,
          plan: { title: `Up by ${clock(wake)}, daylight ${clock(dayStart)}, bed ${off ? clock(bed) : "at your usual time"}`, plannedAt: formatLocalDate(wake) },
        },
      };
    }
    const until = new Date(w.end.getTime() + 12 * 60 * MIN);
    if (now < w.start || now >= until) continue;
    const line = `${daysWords(breakDays)}. Sleep after this shift, then stay up late on your days off (bed about ${clockOf(settings.stayLateBed)}, up about ${clockOf(settings.stayLateWake)}), so your next night shift isn't a second flip.`;
    return {
      kind, date, breakDays, line, windows: [], showFrom: w.start.toISOString(), showUntil: until.toISOString(),
      card: {
        kind, title: "Stay late", detail: line,
        basis: `${daysWords(breakDays)} after this run (your saved schedule): a full flip back and then onto nights again would be two flips. Bed about ${clockOf(settings.stayLateBed)} and up about ${clockOf(settings.stayLateWake)} (${own(setBy, "stayLateBed")}). No sleep length is set.`,
        source: SOURCES.NIOSH_FLIP,
        plan: { title: `Days off: bed about ${clockOf(settings.stayLateBed)}, up about ${clockOf(settings.stayLateWake)}`, plannedAt: formatLocalDate(w.end) },
      },
    };
  }

  // 2. FLIP DAY, the day before the first night of a run: stay up later tonight, nap before the shift.
  for (let k = -1; k <= 0; k++) {
    if (!isOff(k)) continue;
    const next = shiftOf(k + 1);
    if (!next || !overnight(next)) continue;
    const from = livedStart(base, k);
    if (now < from || now >= next.start) continue;
    const breakDays = countOff(k, -1);
    if (breakDays < 2) continue;
    const stayedLate = (breakDays >= 3 ? settings.longBreak : settings.shortBreak) === "STAY_LATE";
    const nap = `Nap before your ${clock(next.start)} shift.`;
    const later = settings.laterHours;
    const about = off ? `about ${clock(nextAtClock(from, off.start + later * 60))}` : later === 2 ? "a couple of hours later than usual" : `${later} hour${later === 1 ? "" : "s"} later than usual`;
    const line = stayedLate || later === 0 ? nap : `Tonight, stay up later than usual (${about}) and sleep in. ${nap}`;
    return {
      kind: "BACK_ON", date: formatLocalDate(from), breakDays, line, windows: [], showFrom: from.toISOString(), showUntil: next.start.toISOString(),
      card: {
        kind: "BACK_ON", title: "Back onto nights", detail: line,
        basis: stayedLate
          ? `You stayed late on this ${breakDays}-day break, so there's no flip to make. The nap times are on the nap card.`
          : `The night before the first night of a run (your saved schedule). ${later} h later than ${off ? `your usual days-off bedtime (Garmin, ${off.nights} nights)` : "usual"} (${own(setBy, "laterHours")}). The nap times are on the nap card.`,
        source: SOURCES.NIOSH_FLIP,
        plan: { title: stayedLate || later === 0 ? `Nap before the ${clock(next.start)} shift` : `Stay up later tonight, nap before the ${clock(next.start)} shift`, plannedAt: formatLocalDate(from) },
      },
    };
  }
  return null;
}

export async function getFlipPlan(now: Date = new Date()): Promise<FlipPlan | null> {
  const [pattern, records, summaries, view, confirmed] = await Promise.all([getSchedulePattern(), getImportedSleep(), getDaySummaries(), getFlipSettingsView(),
    getConfirmedKinds().catch(() => new Map<string, "WORK" | "OFF">())]);
  return deriveFlipPlan({ now, pattern, rhythm: deriveSleepRhythm(records.map((r) => r.evidence), summaries, now), settings: view.settings, setBy: view.setBy, confirmed });
}
