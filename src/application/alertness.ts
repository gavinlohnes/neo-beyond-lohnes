/**
 * ENERGY-CURVE-001 (Gavin, 2026-11-19: HARVEST-003 part 1, Protected TODAY panel "All are approved"): an estimate of
 * how alert you'll feel across the lived day (16:30 to 16:30), from your own sleep timing. The idea is from Rise's
 * energy schedule and Timeshifter's fatigue warning (HARVEST-003); the model and every number here are BEYOND's own,
 * from published sleep science, not from either app.
 *
 * The model is the two-process model of sleep regulation (Borbély; Daan, Beersma & Borbély 1984): sleep pressure S
 * rises while awake and falls while asleep, and a 24-hour circadian rhythm C rises and falls around it. Alertness is
 * C minus S. Pure and deterministic: no reads, no writes, never an Engine input, never a score. The output is a shape
 * (higher and lower), not a number to chase.
 */
export interface Source { label: string; url: string; quote: string; checked: string }
export const SOURCES = {
  TWO_PROCESS: {
    label: "Borbély et al., The two-process model of sleep regulation: a reappraisal (J Sleep Res, 2016)",
    url: "https://doi.org/10.1111/jsr.12371",
    quote: "Sleep pressure (Process S) rises during waking and declines during sleep; it interacts with a circadian process (Process C).",
    checked: "search-confirmed 2026-11-19, with the time constants below",
  },
  TIME_CONSTANTS: {
    label: "Two-process model time constants (Daan, Beersma & Borbély 1984, as used in model comparisons)",
    url: "https://ar5iv.arxiv.org/html/1311.1734",
    quote: "χs = 4.2 hrs, χw = 18.2 hrs",
    checked: "search-confirmed 2026-11-19",
  },
  TEMPERATURE_MINIMUM: {
    label: "Core body temperature minimum relative to habitual wake time (study of 29 healthy men)",
    url: "https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5163426",
    quote: "approximately 1.5 ± 1.0 hours before their habitual waketime",
    checked: "search-confirmed 2026-11-19; a rule of thumb, varies by person",
  },
} satisfies Record<string, Source>;

/** Sleep pressure's time constant while awake, and while asleep (hours). */
export const TAU_WAKE_H = 18.2, TAU_SLEEP_H = 4.2;
/** The circadian low sits this long before your habitual wake time (hours). */
export const LOW_BEFORE_WAKE_H = 1.5;
/** The circadian rhythm's amplitude on S's 0–1 scale (the model's classic value). */
export const CIRCADIAN_AMPLITUDE = 0.12;
/** At least this many recent main sleeps before the curve is drawn; fewer, and BEYOND says so instead. */
export const MIN_NIGHTS = 3;
/** The lowest stretch shown is the lowest third of the day's waking values. */
export const LOW_FRACTION = 1 / 3;
/** The drive home is taken as the hour after the shift ends. */
export const DRIVE_MINUTES = 60;

const HOUR = 3_600_000, STEP = 15 * 60_000;
export interface SleepSpan { start: number; end: number }
export interface CurvePoint { t: number; v: number; asleep: boolean }
export interface EnergyCurve {
  from: number; to: number;
  /** One point every 15 minutes, v from 0 (lowest of the day) to 1 (highest); asleep marks the sleep the model assumed. */
  points: CurvePoint[];
  /** The lowest waking stretch, or null if the day has no waking low. */
  low: { start: number; end: number } | null;
  /** When the drive home (the hour after the shift ends) falls in the low stretch. */
  drive: { start: number; end: number } | null;
  /** The habitual wake time the circadian low was placed from (local minutes after midnight), and how many nights. */
  basis: { wakeMinutes: number; nights: number };
}

/** Median of local wake clock times, handling the wrap at midnight by working around the first night's wake. */
export function habitualWake(nights: readonly SleepSpan[]): number | null {
  if (nights.length < MIN_NIGHTS) return null;
  const mins = nights.map((n) => { const d = new Date(n.end); return d.getHours() * 60 + d.getMinutes(); });
  const ref = mins[0]!;
  const unwrapped = mins.map((m) => (m - ref > 720 ? m - 1440 : ref - m > 720 ? m + 1440 : m)).sort((a, b) => a - b);
  const mid = unwrapped.length / 2;
  const med = unwrapped.length % 2 ? unwrapped[Math.floor(mid)]! : (unwrapped[mid - 1]! + unwrapped[mid]!) / 2;
  return ((Math.round(med) % 1440) + 1440) % 1440;
}

/**
 * The lived day's curve. `sleeps` are main sleeps and naps already slept (from records). `planned` is sleep expected
 * later in the window (your usual post-shift sleep), so the curve after it reflects waking rested. Sleep pressure starts
 * from the model's midpoint three days back so the curve has settled by the window.
 */
export function energyCurve(input: {
  from: number; to: number; sleeps: readonly SleepSpan[]; planned?: readonly SleepSpan[]; nights: readonly SleepSpan[];
  shiftEnd?: number | null | undefined;
}): EnergyCurve | null {
  const wake = habitualWake(input.nights);
  if (wake === null) return null;
  const spans = [...input.sleeps, ...(input.planned ?? [])].sort((a, b) => a.start - b.start);
  const asleep = (t: number) => spans.some((s) => t >= s.start && t < s.end);
  // Circadian low: LOW_BEFORE_WAKE_H before the habitual wake, each day. C peaks 12 h later.
  const lowMinutes = ((wake - LOW_BEFORE_WAKE_H * 60) % 1440 + 1440) % 1440;
  const circadian = (t: number) => {
    const d = new Date(t), m = d.getHours() * 60 + d.getMinutes();
    return -CIRCADIAN_AMPLITUDE * Math.cos((2 * Math.PI * (m - lowMinutes)) / 1440);
  };
  let s = 0.5;
  const raw: CurvePoint[] = [];
  for (let t = input.from - 72 * HOUR; t < input.to; t += STEP) {
    const sleeping = asleep(t), dt = STEP / HOUR;
    s = sleeping ? s * Math.exp(-dt / TAU_SLEEP_H) : 1 - (1 - s) * Math.exp(-dt / TAU_WAKE_H);
    if (t >= input.from) raw.push({ t, v: circadian(t) - s, asleep: sleeping });
  }
  const awakeVals = raw.filter((p) => !p.asleep).map((p) => p.v);
  if (!awakeVals.length) return null;
  const lo = Math.min(...awakeVals), hi = Math.max(...awakeVals), span = hi - lo || 1;
  const points = raw.map((p) => ({ ...p, v: Math.min(1, Math.max(0, (p.v - lo) / span)) }));
  // The lowest stretch: the longest run of waking points in the lowest third.
  let best: { start: number; end: number } | null = null, run: { start: number; end: number } | null = null;
  for (const p of points) {
    if (!p.asleep && p.v <= LOW_FRACTION) { run = run ? { start: run.start, end: p.t + STEP } : { start: p.t, end: p.t + STEP }; }
    else run = null;
    if (run && (!best || run.end - run.start > best.end - best.start)) best = { ...run };
  }
  const shiftEnd = input.shiftEnd ?? null;
  const drive = shiftEnd !== null && best && shiftEnd < best.end && shiftEnd + DRIVE_MINUTES * 60_000 > best.start
    ? { start: shiftEnd, end: shiftEnd + DRIVE_MINUTES * 60_000 } : null;
  return { from: input.from, to: input.to, points, low: best, drive, basis: { wakeMinutes: wake, nights: input.nights.length } };
}

/**
 * Your usual main sleep from recent nights: the median local start time (across midnight) and median length. Used to
 * assume tonight's sleep when the shift plan has no window for it, so the curve after the shift reflects sleeping, not
 * staying up all day.
 */
export function usualSleep(nights: readonly SleepSpan[]): { startMinutes: number; minutes: number } | null {
  if (nights.length < MIN_NIGHTS) return null;
  const starts = nights.map((n) => { const d = new Date(n.start); return d.getHours() * 60 + d.getMinutes(); });
  const ref = starts[0]!;
  const unwrapped = starts.map((m) => (m - ref > 720 ? m - 1440 : ref - m > 720 ? m + 1440 : m)).sort((a, b) => a - b);
  const lengths = nights.map((n) => (n.end - n.start) / 60_000).sort((a, b) => a - b);
  const med = (xs: number[]) => (xs.length % 2 ? xs[(xs.length - 1) / 2]! : (xs[xs.length / 2 - 1]! + xs[xs.length / 2]!) / 2);
  return { startMinutes: ((Math.round(med(unwrapped)) % 1440) + 1440) % 1440, minutes: Math.round(med(lengths)) };
}

/** The next time your usual sleep starts at or after `after`, as a span. */
export function nextUsualSleep(usual: { startMinutes: number; minutes: number }, after: number): SleepSpan {
  const d = new Date(after); d.setHours(Math.floor(usual.startMinutes / 60), usual.startMinutes % 60, 0, 0);
  if (d.getTime() < after) d.setDate(d.getDate() + 1);
  return { start: d.getTime(), end: d.getTime() + usual.minutes * 60_000 };
}
