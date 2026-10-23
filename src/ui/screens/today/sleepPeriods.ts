import type { PeriodValue } from "../../../domain/health/measuredSeries";
import { average } from "../../../domain/health/measuredSeries";

export type SleepZoom = "D" | "W" | "M" | "Y";
/** Calendar navigation over existing lived-day buckets. Never rebuckets or reattributes a record. */
export function sleepWindow(anchor: number, zoom: SleepZoom): { from: number; to: number } {
  const d = new Date(anchor); d.setHours(0, 0, 0, 0);
  if (zoom === "W") d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  if (zoom === "M" || zoom === "Y") d.setDate(1);
  if (zoom === "Y") d.setMonth(0);
  const from = d.getTime();
  if (zoom === "D") d.setDate(d.getDate() + 1);
  if (zoom === "W") d.setDate(d.getDate() + 7);
  if (zoom === "M") d.setMonth(d.getMonth() + 1);
  if (zoom === "Y") d.setFullYear(d.getFullYear() + 1);
  return { from, to: d.getTime() };
}
export function moveSleepWindow(anchor: number, zoom: SleepZoom, direction: -1 | 1): number {
  const d = new Date(sleepWindow(anchor, zoom).from);
  if (zoom === "D" || zoom === "W") d.setDate(d.getDate() + direction * (zoom === "W" ? 7 : 1));
  if (zoom === "M") d.setMonth(d.getMonth() + direction);
  if (zoom === "Y") d.setFullYear(d.getFullYear() + direction);
  return d.getTime();
}
export function sleepWindowValues(series: readonly PeriodValue[], anchor: number, zoom: SleepZoom) {
  const window = sleepWindow(anchor, zoom);
  const days = series.filter((p) => p.from >= window.from && p.from < window.to);
  if (zoom !== "Y") return { days, bars: days };
  const groups = new Map<number, PeriodValue[]>();
  for (const p of days) {
    const d = new Date(p.from); d.setDate(1); d.setHours(0, 0, 0, 0);
    const key = d.getTime(); groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const bars = [...groups.entries()].map(([from, values]): PeriodValue => ({
    from, to: sleepWindow(from, "M").to, dayId: null, value: average(values), partial: values.some((p) => p.partial),
  }));
  return { days, bars };
}
