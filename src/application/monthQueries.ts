import { getDaySummaries } from "./dayLedgerQueries";
import type { DaySummary } from "../engine/dayLedger";
import { formatLocalDate } from "../engine/scheduledContext";
import { deriveSleepDebt, type SleepDebt } from "./sleepDebt";

/**
 * MONTH-001 (owner go 2026-10-31, ideas 9 and 10): a month on one page and the sleep owed. Read only,
 * from the day ledger. A lived day is dated by the local calendar day it starts on.
 */
export interface MonthDay {
  date: string; // YYYY-MM-DD
  dayId?: string | undefined;
  work?: "WORK" | "OFF" | "UNKNOWN" | undefined;
  sleepMinutes?: number | undefined;
  proteinG?: number | undefined;
  workouts: number;
  urges: number;
  clean: boolean;
}

/** The adult sleep guideline (AASM / Sleep Research Society consensus: 7 hours or more). Marks short nights on the month grid; sleep owed uses your learned sleep (./sleepDebt). */
export const SLEEP_NEED_MINUTES = 7 * 60;

export async function getMonth(year: number, month: number): Promise<MonthDay[]> {
  return monthDays(await getDaySummaries(), year, month);
}

/** The pure half of getMonth (YEAR-REVIEW-001 reads all twelve months from one read of the summaries). */
export function monthDays(summaries: readonly DaySummary[], year: number, month: number): MonthDay[] {
  const byDate = new Map(summaries.map((s) => [formatLocalDate(new Date(s.livedDayStart)), s]));
  const days: MonthDay[] = [];
  for (let d = new Date(year, month, 1); d.getMonth() === month; d.setDate(d.getDate() + 1)) {
    const date = formatLocalDate(d);
    const s = byDate.get(date);
    const sleep = s && (s.sleep.primaryMinutes !== undefined || s.sleep.napMinutes) ? (s.sleep.primaryMinutes ?? 0) + (s.sleep.napMinutes ?? 0) : undefined;
    days.push({ date, dayId: s?.beyondDayId, work: s?.work.declared, sleepMinutes: sleep, proteinG: s?.proteinG, workouts: s?.workouts.length ?? 0, urges: s?.urges.length ?? 0, clean: !!s?.cleanDay });
  }
  return days;
}

/**
 * Sleep owed over the last 7 lived days with sleep logged, against your own learned usual main sleep for each kind
 * of day (SLEEP-DEBT-LEARNED-001; see ./sleepDebt). No longer a fixed 7 hours: SLEEP_NEED_MINUTES above now only
 * marks the month grid's short nights against the adult guideline.
 */
export async function getSleepDebt(now = new Date()): Promise<SleepDebt> {
  return deriveSleepDebt(await getDaySummaries(), now);
}
