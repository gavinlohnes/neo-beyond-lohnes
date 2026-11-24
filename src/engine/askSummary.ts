import { ASK_AREAS, type AskArea, type AskCount } from "../domain/askCounts";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";
import { livedDayBoundary } from "./livedDaySeries";
import { formatLocalDate } from "./scheduledContext";

/**
 * GRAYSON-ASKS-COUNT-001: the monthly review's "Asking less" numbers. Pure. The last 4 weeks of lived days (the
 * current one included) against the 4 before, per area, and the three keys asked most. No total across areas, no
 * score: this measures the app, not him. Nothing but that panel reads it.
 */
export const ASK_WINDOW_DAYS = 28;

/** The lived day an ask belongs to: the local date of the 16:30 start (a 06:10 ask is the night before's). */
export const askDate = (at: Date): string => formatLocalDate(mostRecentBoundaryAtOrBefore(at));

export interface AskAreaRow { area: AskArea; recent: number; previous: number; change: string }
export interface AskTop { key: string; count: number }
export type AskSummary =
  | { state: "EMPTY" }
  | { state: "LEARNING"; startedOn: string; top: AskTop[] }
  | { state: "READY"; startedOn: string; areas: AskAreaRow[]; top: AskTop[] };

function datesBack(now: Date, from: number, count: number): Set<string> {
  const current = mostRecentBoundaryAtOrBefore(now);
  return new Set(Array.from({ length: count }, (_, i) => formatLocalDate(livedDayBoundary(current, from + i))));
}

/** "18 fewer", "6 more", "same". */
export function describeAskChange(recent: number, previous: number): string {
  if (recent === previous) return "same";
  return recent < previous ? `${previous - recent} fewer` : `${recent - previous} more`;
}

export function summarizeAsks(rows: readonly AskCount[], now: Date): AskSummary {
  if (!rows.length) return { state: "EMPTY" };
  const startedOn = rows.map((r) => r.date).sort()[0]!;
  const recentDates = datesBack(now, 0, ASK_WINDOW_DAYS);
  const previousDates = datesBack(now, ASK_WINDOW_DAYS, ASK_WINDOW_DAYS);
  const recent = rows.filter((r) => recentDates.has(r.date));
  const byKey = new Map<string, number>();
  for (const r of recent) byKey.set(r.key, (byKey.get(r.key) ?? 0) + r.count);
  const top = [...byKey].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 3);
  // A comparison needs counts from the first day of the earlier 4 weeks.
  const oldestNeeded = formatLocalDate(livedDayBoundary(mostRecentBoundaryAtOrBefore(now), 2 * ASK_WINDOW_DAYS - 1));
  if (startedOn > oldestNeeded) return { state: "LEARNING", startedOn, top };
  const areas: AskAreaRow[] = [];
  for (const area of ASK_AREAS) {
    const r = recent.filter((x) => x.area === area).reduce((n, x) => n + x.count, 0);
    const p = rows.filter((x) => x.area === area && previousDates.has(x.date)).reduce((n, x) => n + x.count, 0);
    if (r || p) areas.push({ area, recent: r, previous: p, change: describeAskChange(r, p) });
  }
  return { state: "READY", startedOn, areas, top };
}
