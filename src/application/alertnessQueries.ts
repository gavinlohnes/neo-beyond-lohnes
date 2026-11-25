import { getImportedSleep } from "./externalSleepQueries";
import { getShiftSleepPlan } from "./shiftSleepPlan";
import { energyCurve, nextUsualSleep, usualSleep, type EnergyCurve, type SleepSpan } from "./alertness";
import { mostRecentBoundaryAtOrBefore, nextRolloverBoundaryAfter } from "../engine/dayRollover";
import { RHYTHM_WINDOW_DAYS } from "../engine/sleepRhythm";

/**
 * ENERGY-CURVE-001: the lived day's energy estimate from your own Garmin sleep (main sleeps for the habitual wake
 * time; every sleep, naps too, for sleep pressure), with the shift sleep plan's numbers drawn on it: the shift, the
 * caffeine cut-off and your usual post-shift sleep. Read only.
 */
export interface EnergyToday {
  curve: EnergyCurve | null;
  shift: { start: number; end: number } | null;
  caffeineCutoff: number | null;
  nap: { start: number; end: number } | null;
  /** Main sleeps found in the last 7 days (the curve needs MIN_NIGHTS). */
  nights: number;
}
const DAY = 86_400_000, MAIN_SLEEP_MINUTES = 180;

export async function getEnergyToday(now = new Date()): Promise<EnergyToday> {
  const [revisions, plan] = await Promise.all([getImportedSleep(), getShiftSleepPlan(now).catch(() => null)]);
  const t = now.getTime();
  const spans: SleepSpan[] = revisions.map((r) => ({ start: Date.parse(r.evidence.startTime), end: Date.parse(r.evidence.endTime) }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.start <= t);
  const main = spans.filter((s) => (s.end - s.start) / 60_000 >= MAIN_SLEEP_MINUTES);
  const nights = main.filter((s) => s.start >= t - 7 * DAY);
  // C4.1: the body clock is placed from the last 28 days of main sleeps (SLEEP-RHYTHM-001's window), so a night run
  // can be seen against the night-time sleeps before it.
  const history = main.filter((s) => s.start >= t - RHYTHM_WINDOW_DAYS * DAY);
  const from = mostRecentBoundaryAtOrBefore(now).getTime(), to = nextRolloverBoundaryAfter(now).getTime();
  const sleeps = spans.filter((s) => s.end >= from - 3 * DAY).map((s) => ({ start: s.start, end: Math.min(s.end, t) }));
  const shift = plan ? { start: Date.parse(plan.shift.start), end: Date.parse(plan.shift.end) } : null;
  const sleepWindow = plan?.windows.find((w) => w.kind === "SLEEP");
  const napWindow = plan?.windows.find((w) => w.kind === "NAP");
  // Your usual post-shift sleep is expected later in the window, so the curve after it reflects waking rested.
  // The plan's window when it has one; otherwise your usual sleep from your own recent nights, next after the shift.
  const usual = usualSleep(nights);
  // Anchor assumptions to this lived day, not the current clock: delayed imports must not erase sleep.
  const plannedWindow = sleepWindow ? { start: Date.parse(sleepWindow.start), end: Date.parse(sleepWindow.end) } : null;
  const assumed = plannedWindow && plannedWindow.start < to && plannedWindow.end > from ? plannedWindow
    : usual ? nextUsualSleep(usual, shift && shift.end >= from && shift.end < to ? shift.end : from) : null;
  // An overlapping actual record replaces the whole assumption, including any shorter actual duration.
  const planned: SleepSpan[] = assumed && assumed.start < to && !spans.some((s) => s.start < assumed.end && s.end > assumed.start)
    ? [assumed] : [];
  const shiftEnd = shift && shift.end > from && shift.end <= to ? shift.end : null;
  const cutoffBase = sleepWindow ? Date.parse(sleepWindow.start) : shift?.end ?? null;
  return {
    curve: energyCurve({ from, to, sleeps, planned, nights, shiftEnd, history }),
    shift: shift && shift.end > from && shift.start < to ? shift : null,
    // C4.2a: the plan's own cut-off (his setting when he set one), so TODAY and ROUTE never disagree.
    caffeineCutoff: cutoffBase === null || !plan ? null : cutoffBase - plan.caffeine.hours * 3_600_000,
    nap: napWindow ? { start: Date.parse(napWindow.start), end: Date.parse(napWindow.end) } : null,
    nights: nights.length,
  };
}
