import type { HydrationEntry } from "../domain/common/types";
import type { WeighIn } from "./bodyTrendQueries";

/**
 * BODY-DASH-001 (Gavin, 2026-11-14, approved Protected): pure helpers behind DATA's dashboard. Read only, never an
 * Engine input. Nothing here invents a goal: water is shown against your own usual pace, weight against a goal only
 * when you set one.
 */
const HOUR = 3_600_000;

/** Water logged in each hour of the lived day (24 slots from its 16:30 start), at corrected amounts. */
export function waterByHour(entries: readonly Pick<HydrationEntry, "at" | "effectiveAmountOz">[], dayStart: string): number[] {
  const start = Date.parse(dayStart), slots = Array.from({ length: 24 }, () => 0);
  for (const e of entries) {
    const i = Math.floor((Date.parse(e.at) - start) / HOUR);
    if (i >= 0 && i < 24 && e.effectiveAmountOz > 0) slots[i]! += e.effectiveAmountOz;
  }
  return slots;
}

/**
 * The change since the weigh-in nearest to `days` before the latest one (at least half that span back), or null
 * when there isn't one. Never extrapolated.
 */
export function weightChange(history: readonly WeighIn[], days = 7): { lbs: number; days: number } | null {
  const sorted = [...history].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const latest = sorted.at(-1);
  if (!latest) return null;
  const target = Date.parse(latest.recordedAt) - days * 24 * HOUR;
  const earlier = sorted.filter((w) => Date.parse(w.recordedAt) <= Date.parse(latest.recordedAt) - (days / 2) * 24 * HOUR);
  if (!earlier.length) return null;
  const base = earlier.reduce((best, w) => (Math.abs(Date.parse(w.recordedAt) - target) < Math.abs(Date.parse(best.recordedAt) - target) ? w : best));
  const span = Math.round((Date.parse(latest.recordedAt) - Date.parse(base.recordedAt)) / (24 * HOUR));
  return { lbs: Math.round((latest.weightLbs - base.weightLbs) * 10) / 10, days: span };
}

/** "09:04" local. */
export const clockOf = (at: number | string) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** How fresh Garmin's data is: its time, and whether it's older than GARMIN-005's 12 hours. */
export function garminFreshness(asOf: number | null, now: number): { label: string; stale: boolean } | null {
  if (asOf === null) return null;
  const hours = Math.floor((now - asOf) / HOUR);
  const sameDay = new Date(asOf).toDateString() === new Date(now).toDateString();
  const when = sameDay ? clockOf(asOf) : `${new Date(asOf).toLocaleDateString("en-US", { weekday: "short" })} ${clockOf(asOf)}`;
  return { label: hours >= 12 ? `Garmin as of ${when} · ${hours} h old` : `Garmin as of ${when}`, stale: hours >= 12 };
}
