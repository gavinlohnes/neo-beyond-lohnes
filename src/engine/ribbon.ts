import type { DaySummary } from "./dayLedger";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";

/**
 * THE RIBBON (2026-10-03): the last RIBBON_DAYS lived days (16:30 → 16:30),
 * one column each, built from the Day Ledger. Pure and read-only — a picture
 * of what was logged, never a score: no grades, no targets met/missed beyond
 * the one plainly-labelled protein threshold, no inference.
 *
 * Missing stays missing (the Ledger's own rule): a lived day with no record
 * at all is an empty column (`hasRecord: false`), distinct from a recorded
 * day where something simply wasn't logged. Where one lived day holds more
 * than one BeyondDay (the day was ended early and a new one started), their
 * records are combined.
 */
export const RIBBON_DAYS = 28;

export interface RibbonDay {
  /** The 16:30 boundary this lived day starts at (ISO). */
  livedDayStart: string;
  hasRecord: boolean;
  /** The day was declared (or stood, per schedule) as a work day. */
  worked: boolean;
  /** Total main sleep logged; absent when none was. */
  mainSleepMinutes?: number;
  /** The best-finished workout that day; absent when none finished. */
  lift?: { status: "COMPLETED" | "PARTIAL"; templateId: string; prCount: number };
  /** Protein logged (logs + meals); absent when none was. */
  proteinG?: number;
  /** Urges logged (undone ones excluded). */
  urges: number;
  cleanDay: boolean;
}

/** Calendar-built boundaries, so a DST change never shifts a column. */
function boundaryDaysBefore(latest: Date, daysBack: number): Date {
  return new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() - daysBack, latest.getHours(), latest.getMinutes(), 0, 0);
}

export function projectRibbon(summaries: readonly DaySummary[], now: Date, days = RIBBON_DAYS): RibbonDay[] {
  const latest = mostRecentBoundaryAtOrBefore(now);
  const byWindow = new Map<string, DaySummary[]>();
  for (const s of summaries) {
    const list = byWindow.get(s.livedDayStart) ?? [];
    list.push(s);
    byWindow.set(s.livedDayStart, list);
  }

  const columns: RibbonDay[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const livedDayStart = boundaryDaysBefore(latest, back).toISOString();
    const records = byWindow.get(livedDayStart) ?? [];
    columns.push(combine(livedDayStart, records));
  }
  return columns;
}

function sumDefined(values: (number | undefined)[]): number | undefined {
  const present = values.filter((v): v is number => v !== undefined);
  return present.length === 0 ? undefined : present.reduce((a, b) => a + b, 0);
}

function combine(livedDayStart: string, records: readonly DaySummary[]): RibbonDay {
  const workouts = records.flatMap((r) => r.workouts).filter((w) => w.status === "COMPLETED" || w.status === "PARTIAL");
  const best = workouts.find((w) => w.status === "COMPLETED") ?? workouts[0];
  const mainSleepMinutes = sumDefined(records.map((r) => r.sleep.primaryMinutes));
  const proteinG = sumDefined(records.map((r) => r.proteinG));
  return {
    livedDayStart,
    hasRecord: records.length > 0,
    worked: records.some((r) => r.work.declared === "WORK"),
    ...(mainSleepMinutes !== undefined ? { mainSleepMinutes } : {}),
    ...(best
      ? {
          lift: {
            status: best.status as "COMPLETED" | "PARTIAL",
            templateId: best.templateId,
            prCount: workouts.reduce((n, w) => n + (w.prCount ?? 0), 0),
          },
        }
      : {}),
    ...(proteinG !== undefined ? { proteinG } : {}),
    urges: records.reduce((n, r) => n + r.urges.length, 0),
    cleanDay: records.some((r) => r.cleanDay),
  };
}
