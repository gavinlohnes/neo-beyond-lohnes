import type { DaySummary } from "./dayLedger";
import { groupLivedDays, livedDayBoundary, MEASURES, type DayKind } from "./livedDaySeries";
import { projectPersonalBaselines } from "./personalBaselines";

/**
 * SLEEP-ENGINE-001 (owner approval 2026-10-27, "approve option 1"): the one sleep fact the Engine may
 * use. True when the two most recent lived days with main sleep — the active lived day and the one
 * before it, or, before today's main sleep is logged, the two before that — each sit below the low end
 * of the operator's own usual range for that kind of day (Weekly's personal baselines). With no usual
 * range yet (still learning), an unknown work context, or a missing night, it is false: no change.
 * Pure. It never touches capacity, which stays the locked check-in rule.
 */
export const SHORT_SLEEP_NIGHTS = 2;

export interface ShortSleepNight { livedDayStart: string; minutes: number; kind: DayKind; low: number; high: number }
export interface ShortSleepStreak { streak: boolean; nights: ShortSleepNight[] }

export function deriveShortSleepStreak(summaries: readonly DaySummary[], activeDayId: string, now: Date): ShortSleepStreak {
  const none = { streak: false, nights: [] };
  const active = summaries.find((day) => day.beyondDayId === activeDayId);
  if (!active) return none;
  const days = groupLivedDays(summaries);
  const bands = new Map(projectPersonalBaselines(summaries, now).flatMap((b) =>
    b.measure === "MAIN_SLEEP" && b.kind !== "LEARNING" ? [[b.dayKind, { low: b.low, high: b.high }] as const] : []));
  const at = (back: number) => days.get(livedDayBoundary(new Date(active.livedDayStart), back).toISOString());
  const sleepOf = (back: number) => { const day = at(back); return day ? MEASURES.MAIN_SLEEP.read(day) : undefined; };
  const first = sleepOf(0) !== undefined ? 0 : 1;
  const nights: ShortSleepNight[] = [];
  for (let back = first; back < first + SHORT_SLEEP_NIGHTS; back++) {
    const day = at(back), minutes = sleepOf(back);
    // The same day kind Weekly's baselines group by, so the night is judged against the range it shows.
    const band = day && day.kind !== "UNKNOWN" ? bands.get(day.kind) : undefined;
    if (!day || day.kind === "UNKNOWN" || minutes === undefined || !band) return none;
    nights.push({ livedDayStart: day.livedDayStart, minutes, kind: day.kind, low: band.low, high: band.high });
  }
  return { streak: nights.every((night) => night.minutes < night.low), nights };
}
