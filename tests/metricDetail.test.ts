import { describe, expect, it } from "vitest";
import { dailySeries, rangeValues, summarise, usualOf, workOffSplit, SPLIT_MIN_DAYS } from "../src/application/metricDetail";
import { recentPeriods, type PeriodValue } from "../src/domain/health/measuredSeries";
import { BASELINE_MIN_SAMPLES } from "../src/domain/health/baselines";

/** METRIC-PAGE-001 (pilot): the metric page's pure parts, on BEYOND's 16:30 lived days. */
const DAY = 86_400_000;
const start = (d: number) => new Date(2026, 9, d, 16, 30).toISOString();
const days = Array.from({ length: 10 }, (_, i) => ({ id: `d${i + 1}`, startedAt: start(i + 1) }));

describe("dailySeries on lived days", () => {
  it("puts a record on its lived day by the 16:30 boundary, leaves unrecorded days null, and marks today partial", () => {
    const now = new Date(2026, 9, 11, 2, 0).getTime(); // 02:00 on the 11th belongs to the lived day that began on the 10th
    const periods = recentPeriods(days, now, 5);
    expect(periods.at(-1)!.dayId).toBe("d10");
    const water: Record<string, number> = { d10: 24, d8: 40 };
    const series = dailySeries(periods, now, (id) => water[id]);
    expect(series.map((v) => v.value)).toEqual([null, null, 40, null, 24]);
    expect(series.at(-1)!.partial).toBe(true);
    expect(series.slice(0, -1).every((v) => !v.partial)).toBe(true);
  });

  it("a period with no BEYOND day has no record, even if a value exists for some id", () => {
    const now = new Date(2026, 9, 20, 18, 0).getTime(); // nine days after the last BEYOND day started
    const series = dailySeries(recentPeriods(days, now, 3), now, () => 99);
    expect(series.every((v) => v.dayId === null && v.value === null)).toBe(true);
  });
});

const pv = (i: number, value: number | null, dayId: string | null = `d${i}`, partial = false): PeriodValue => ({ dayId, from: i * DAY, to: (i + 1) * DAY, value, partial });

describe("ranges keep each metric's meaning", () => {
  const series = Array.from({ length: 400 }, (_, i) => pv(i, i % 7 === 0 ? null : 10));
  it("7D and 30D are the last lived days, oldest first", () => {
    expect(rangeValues(series, "7d", "mean")).toHaveLength(7);
    expect(rangeValues(series, "30d", "sum")).toEqual(series.slice(-30));
  });
  it("1Y is 52 weeks: water averages its logged days, steps totals its measured days", () => {
    const mean = rangeValues(series, "1y", "mean"), sum = rangeValues(series, "1y", "sum");
    expect(mean).toHaveLength(52);
    expect(mean.every((w) => w.value === 10)).toBe(true); // a missing day never drags the average down
    expect(sum.every((w) => w.value === 60)).toBe(true); // six measured days of 10
  });
  it("a week with nothing recorded is null, not zero", () => {
    const empty = Array.from({ length: 14 }, (_, i) => pv(i, i < 7 ? null : 5));
    expect(rangeValues(empty, "1y", "sum").map((w) => w.value)).toEqual([null, 35]);
  });
});

describe("summaries, usual and the work/off split", () => {
  it("averages only recorded days and counts the missing ones", () => {
    expect(summarise([pv(1, 10), pv(2, null), pv(3, 20)])).toEqual({ average: 15, recorded: 2, total: 3 });
    expect(summarise([pv(1, null)]).average).toBeNull();
  });
  it("usual needs enough finished recorded days and ignores the day in progress", () => {
    const few = Array.from({ length: BASELINE_MIN_SAMPLES - 1 }, (_, i) => pv(i, 30));
    expect(usualOf(few)).toEqual({ value: null, samples: BASELINE_MIN_SAMPLES - 1, need: BASELINE_MIN_SAMPLES });
    const enough = [...Array.from({ length: BASELINE_MIN_SAMPLES }, (_, i) => pv(i, 30)), pv(99, 500, "d99", true)];
    expect(usualOf(enough).value).toBe(30);
  });
  it("splits by the recorded work context, leaving UNKNOWN days out and small sides unread", () => {
    const series = Array.from({ length: 10 }, (_, i) => pv(i, i < 5 ? 1000 : 3000));
    const ctx = (id: string) => (Number(id.slice(1)) < 5 ? "WORK" : Number(id.slice(1)) < 9 ? "OFF" : "UNKNOWN") as "WORK" | "OFF" | "UNKNOWN";
    expect(workOffSplit(series, ctx)).toEqual({ work: { median: 1000, days: 5 }, off: { median: 3000, days: 4 } });
    const thin = workOffSplit(series.slice(0, SPLIT_MIN_DAYS - 1), ctx);
    expect(thin.work).toEqual({ median: null, days: SPLIT_MIN_DAYS - 1 });
  });
});
