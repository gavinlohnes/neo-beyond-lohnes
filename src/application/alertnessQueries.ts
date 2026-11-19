import { getImportedSleep } from "./externalSleepQueries";
import { getShiftSleepPlan, CAFFEINE_CUTOFF_HOURS } from "./shiftSleepPlan";
import { energyCurve, nextUsualSleep, usualSleep, type EnergyCurve, type SleepSpan } from "./alertness";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";

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
  const nights = spans.filter((s) => s.start >= t - 7 * DAY && (s.end - s.start) / 60_000 >= MAIN_SLEEP_MINUTES);
  const from = mostRecentBoundaryAtOrBefore(now).getTime(), to = from + DAY;
  const sleeps = spans.filter((s) => s.end >= from - 3 * DAY).map((s) => ({ start: s.start, end: Math.min(s.end, t) }));
  const shift = plan ? { start: Date.parse(plan.shift.start), end: Date.parse(plan.shift.end) } : null;
  const sleepWindow = plan?.windows.find((w) => w.kind === "SLEEP");
  const napWindow = plan?.windows.find((w) => w.kind === "NAP");
  // Your usual post-shift sleep is expected later in the window, so the curve after it reflects waking rested.
  // The plan's window when it has one; otherwise your usual sleep from your own recent nights, next after the shift.
  const usual = usualSleep(nights);
  const shiftEndAhead = shift && shift.end > t ? shift.end : t;
  const planned: SleepSpan[] = sleepWindow && Date.parse(sleepWindow.start) > t ? [{ start: Date.parse(sleepWindow.start), end: Date.parse(sleepWindow.end) }]
    : usual ? [nextUsualSleep(usual, shiftEndAhead)].filter((s) => s.start < to) : [];
  const shiftEnd = shift && shift.end > from && shift.end <= to ? shift.end : null;
  const cutoffBase = sleepWindow ? Date.parse(sleepWindow.start) : shift?.end ?? null;
  return {
    curve: energyCurve({ from, to, sleeps, planned, nights, shiftEnd }),
    shift: shift && shift.end > from && shift.start < to ? shift : null,
    caffeineCutoff: cutoffBase === null ? null : cutoffBase - CAFFEINE_CUTOFF_HOURS * 3_600_000,
    nap: napWindow ? { start: Date.parse(napWindow.start), end: Date.parse(napWindow.end) } : null,
    nights: nights.length,
  };
}
