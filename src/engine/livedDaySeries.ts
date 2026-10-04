import type { DaySummary } from "./dayLedger";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";

/**
 * LIVED-DAY SERIES (FOUNDATION-A-F1, owner approval 2026-10-04). The one
 * shared way to ask "what is this measure over a window of lived days?",
 * built on the Day Ledger. Pure and derived on read: nothing is stored,
 * nothing feeds the Engine.
 *
 * A lived day is a 16:30 → 16:30 window. Its records are the BeyondDays that
 * began in it (usually one; two when a day was ended early and another
 * started). A window is a run of whole lived days, never the one now is in,
 * so nothing half-logged is ever judged.
 *
 * Missing stays missing (the Ledger's rule): a measure reads `undefined` for
 * a lived day that doesn't qualify, and that day is left out of the series,
 * never counted as zero.
 */

export type DayKind = "WORK" | "OFF";

export interface LivedDay {
  /** The 16:30 boundary this lived day starts at (ISO). */
  livedDayStart: string;
  records: readonly DaySummary[];
  /**
   * From the declared work context — what the operator said, or what stood per
   * the saved schedule — never re-derived from today's schedule. WORK when any
   * record is WORK, OFF when one is OFF and none WORK, UNKNOWN otherwise.
   */
  kind: DayKind | "UNKNOWN";
}

/** The lived-day boundary `daysBack` days before `latest`, built on the calendar so a DST change never shifts it. */
export function livedDayBoundary(latest: Date, daysBack: number): Date {
  return new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() - daysBack, latest.getHours(), latest.getMinutes(), 0, 0);
}

/** Every lived day that has at least one record, keyed by its `livedDayStart`. */
export function groupLivedDays(summaries: readonly DaySummary[]): Map<string, LivedDay> {
  const records = new Map<string, DaySummary[]>();
  for (const s of summaries) {
    const list = records.get(s.livedDayStart) ?? [];
    list.push(s);
    records.set(s.livedDayStart, list);
  }
  const days = new Map<string, LivedDay>();
  for (const [livedDayStart, list] of records) {
    const kind = list.some((r) => r.work.declared === "WORK")
      ? "WORK"
      : list.some((r) => r.work.declared === "OFF")
        ? "OFF"
        : "UNKNOWN";
    days.set(livedDayStart, { livedDayStart, records: list, kind });
  }
  return days;
}

/** A run of whole lived days: those starting at or after `from` and before `to`. */
export interface LivedDayWindow {
  from: Date;
  to: Date;
}

/**
 * `count` finished lived days, ending `skip` days before the lived day `now`
 * is in. `finishedLivedDays(now, 0, 7)` is the last 7 finished lived days;
 * `finishedLivedDays(now, 7, 56)` is the 56 before those — no overlap.
 */
export function finishedLivedDays(now: Date, skip: number, count: number): LivedDayWindow {
  const current = mostRecentBoundaryAtOrBefore(now);
  return { from: livedDayBoundary(current, skip + count), to: livedDayBoundary(current, skip) };
}

export function inLivedDayWindow(livedDayStart: string, window: LivedDayWindow): boolean {
  const t = new Date(livedDayStart).getTime();
  return t >= window.from.getTime() && t < window.to.getTime();
}

// ---- measures ----

export type MeasureId = "MAIN_SLEEP" | "WATER" | "PROTEIN";

/** A numeric measure over one lived day: its value, or `undefined` when the day doesn't count. */
export interface SeriesMeasure {
  id: MeasureId;
  read(day: LivedDay): number | undefined;
}

/**
 * One water entry this big counts a day on its own — a whole day's water logged
 * at once. Equal to MINIMUM_DAY_HYDRATE_OZ (application/queries.ts), the app's
 * own "a real day's water" amount; a test keeps the two in step.
 */
export const WHOLE_DAY_WATER_ENTRY_OZ = 40;
/** Two or more entries mean the day was being logged, not logged once and forgotten. */
export const MIN_DAY_ENTRIES = 2;

function sumDefined(values: readonly (number | undefined)[]): number | undefined {
  const present = values.filter((v): v is number => v !== undefined);
  return present.length === 0 ? undefined : present.reduce((a, b) => a + b, 0);
}

function entries(day: LivedDay, key: "water" | "food"): number {
  return day.records.reduce((n, r) => n + (r.entryCounts?.[key] ?? 0), 0);
}

export const MEASURES: Record<MeasureId, SeriesMeasure> = {
  /** Main sleep (naps excluded): one log is a whole night, so any logged day counts. */
  MAIN_SLEEP: {
    id: "MAIN_SLEEP",
    read: (day) => sumDefined(day.records.map((r) => r.sleep.primaryMinutes)),
  },
  /** Water: 2+ entries, or one entry of WHOLE_DAY_WATER_ENTRY_OZ or more. A lone small entry is likely a forgotten day. */
  WATER: {
    id: "WATER",
    read: (day) => {
      const oz = sumDefined(day.records.map((r) => r.waterOz));
      if (oz === undefined) return undefined;
      const n = entries(day, "water");
      return n >= MIN_DAY_ENTRIES || (n === 1 && oz >= WHOLE_DAY_WATER_ENTRY_OZ) ? oz : undefined;
    },
  },
  /** Protein (protein logs + meals): 2+ food entries. One logged meal isn't a day's eating. */
  PROTEIN: {
    id: "PROTEIN",
    read: (day) => {
      const grams = sumDefined(day.records.map((r) => r.proteinG));
      return grams !== undefined && entries(day, "food") >= MIN_DAY_ENTRIES ? grams : undefined;
    },
  },
};

// ---- series ----

export interface SeriesPoint {
  livedDayStart: string;
  value: number;
}

/** The measure's value on each qualifying lived day in the window (of one kind, when given), oldest first. */
export function series(
  days: ReadonlyMap<string, LivedDay>,
  measure: SeriesMeasure,
  window: LivedDayWindow,
  kind?: DayKind,
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const day of days.values()) {
    if (!inLivedDayWindow(day.livedDayStart, window)) continue;
    if (kind !== undefined && day.kind !== kind) continue;
    const value = measure.read(day);
    if (value !== undefined) points.push({ livedDayStart: day.livedDayStart, value });
  }
  return points.sort((a, b) => new Date(a.livedDayStart).getTime() - new Date(b.livedDayStart).getTime());
}

/**
 * The p-quantile (0 ≤ p ≤ 1) of ascending values, by linear interpolation
 * between order statistics (h = (n − 1)·p). Deterministic; `sorted` must be
 * non-empty.
 */
export function quantile(sorted: readonly number[], p: number): number {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}
