import { getDaySummaries } from "./dayLedgerQueries";
import { formatLocalDate } from "../engine/scheduledContext";

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

/** The adult sleep guideline (AASM / Sleep Research Society consensus: 7 hours or more). */
export const SLEEP_NEED_MINUTES = 7 * 60;

export async function getMonth(year: number, month: number): Promise<MonthDay[]> {
  const summaries = await getDaySummaries();
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

/** Sleep owed over the last 7 lived days with sleep logged, against 7 hours a day. */
export async function getSleepDebt(now = new Date()): Promise<{ owedMinutes: number; days: number }> {
  const summaries = (await getDaySummaries())
    .filter((s) => new Date(s.livedDayStart).getTime() <= now.getTime() && (s.sleep.primaryMinutes !== undefined || s.sleep.napMinutes))
    .sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart)).slice(0, 7);
  const owed = summaries.reduce((sum, s) => sum + Math.max(0, SLEEP_NEED_MINUTES - (s.sleep.primaryMinutes ?? 0) - (s.sleep.napMinutes ?? 0)), 0);
  return { owedMinutes: owed, days: summaries.length };
}
