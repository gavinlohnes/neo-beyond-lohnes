import { describe, expect, it } from "vitest";
import { dailySeries, rangeValues, summarise, usualOf, workOffSplit, SPLIT_MIN_DAYS, direction90, rangesFor, WEEK_MODE, DIGITS, weekCompare, weekTotals, weeklyUsual, trainedSplit, WORKOUT_USUAL_MIN_WEEKS } from "../src/application/metricDetail";
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

describe("resting heart rate keeps its own meaning", () => {
  it("starts on its latest reading and averages a year by measured days", async () => {
    const { rangesFor, WEEK_MODE } = await import("../src/application/metricDetail");
    expect(rangesFor("resting")[0]).toEqual(["today", "LATEST", "Latest reading"]);
    expect(rangesFor("water")[0]![1]).toBe("TODAY");
    expect(WEEK_MODE.resting).toBe("mean");
  });
});

describe("DIRECTION-90-001 direction90", () => {
  const D = 86_400_000;
  /** n finished lived days ending yesterday, plus today in progress; value(i) for day i (0 oldest), null = missing. */
  const days = (n: number, value: (i: number) => number | null): PeriodValue[] => [
    ...Array.from({ length: n }, (_, i) => ({ dayId: `d${i}`, from: i * D, to: (i + 1) * D, value: value(i), partial: false })),
    { dayId: "today", from: n * D, to: (n + 1) * D, value: 99_999, partial: true },
  ];

  it("compares the medians of the last 90 finished days and the last year, leaving today out", () => {
    // A year at 8,000, the last 90 days at 9,000: higher. Today's huge partial value is ignored.
    expect(direction90(days(365, (i) => (i >= 275 ? 9000 : 8000)), 100)).toEqual({ recent: 9000, year: 8000, way: "HIGHER", recentDays: 90, yearDays: 365 });
    expect(direction90(days(365, (i) => (i >= 275 ? 54 : 58)), 1)).toMatchObject({ recent: 54, year: 58, way: "LOWER" });
  });

  it("reads small differences as about the same: under 5% of the year, or under the metric's floor", () => {
    expect(direction90(days(365, (i) => (i >= 275 ? 8300 : 8000)), 100)).toMatchObject({ way: "SAME" });
    expect(direction90(days(365, (i) => (i >= 275 ? 55 : 58)), 1)).toMatchObject({ way: "LOWER" });
    expect(direction90(days(365, (i) => (i >= 275 ? 56 : 58)), 1)).toMatchObject({ way: "SAME" });
    // For small values the floor decides: 1,080 against 1,000 steps is 8%, but under the 100-step floor.
    expect(direction90(days(365, (i) => (i >= 275 ? 1080 : 1000)), 100)).toMatchObject({ way: "SAME" });
  });

  it("stays quiet until the records span 180 days and both windows have enough of them", () => {
    expect(direction90(days(170, () => 8000), 100)).toBeNull();
    expect(direction90(days(180, () => 8000), 100)).not.toBeNull();
    // A year of records: 30 recorded in the last 90 days is enough, 18 is not.
    expect(direction90(days(365, (i) => (i < 275 || i % 3 === 0 ? 8000 : null)), 100)).not.toBeNull();
    expect(direction90(days(365, (i) => (i < 275 || i % 5 === 0 ? 8000 : null)), 100)).toBeNull();
    // Recent records only: no year to compare with.
    expect(direction90(days(365, (i) => (i >= 300 ? 8000 : null)), 100)).toBeNull();
  });

  it("skips missing days rather than counting them as zero", () => {
    const withGaps = direction90(days(365, (i) => (i % 3 === 0 ? null : 8000)), 100)!;
    expect(withGaps).toMatchObject({ recent: 8000, year: 8000, way: "SAME", recentDays: 60 });
  });
});

describe("METRIC-PAGE-002 slice 1: weight keeps its own meaning", () => {
  it("shows the latest weigh-in, then 30D and 1Y; no 7D, because a week of sparse weigh-ins is mostly gaps", () => {
    expect(rangesFor("weight").map(([id, text]) => [id, text])).toEqual([["today", "LATEST"], ["30d", "30D"], ["1y", "1Y"]]);
    expect(WEEK_MODE.weight).toBe("mean");
    expect(DIGITS.weight).toBe(1);
  });

  it("a week is the mean of its weighed days, to a tenth of a pound; unweighed days are left out, never zero", () => {
    const series = Array.from({ length: 14 }, (_, i) => pv(i, i === 1 ? 201.2 : i === 4 ? 200.5 : i === 10 ? 199.9 : null));
    const year = rangeValues(series, "1y", WEEK_MODE.weight, DIGITS.weight);
    expect(year.map((w) => w.value)).toEqual([200.9, 199.9]);
    // The other metrics still round to whole numbers.
    expect(rangeValues(series, "1y", "mean").map((w) => w.value)).toEqual([201, 200]);
  });

  it("averages keep a tenth of a pound and count only weighed days", () => {
    const values = [pv(0, 201.2), pv(1, null), pv(2, 200.5), pv(3, null)];
    expect(summarise(values, DIGITS.weight)).toEqual({ average: 200.9, recorded: 2, total: 4 });
    expect(summarise(values)).toEqual({ average: 201, recorded: 2, total: 4 });
  });

  it("its 90-day direction uses a pound as 'about the same', not 5% of a body weight", () => {
    const year = (recent: number) => Array.from({ length: 366 }, (_, i) => pv(i, i === 365 ? 150 : i >= 275 ? recent : 210, `d${i}`, i === 365));
    // Five pounds down over 90 days is under 5% of 210, but it is a change worth naming.
    expect(direction90(year(205), 1, 0)).toMatchObject({ recent: 205, year: 210, way: "LOWER" });
    expect(direction90(year(205), 1)).toMatchObject({ way: "SAME" });
    expect(direction90(year(209.5), 1, 0)).toMatchObject({ way: "SAME" });
  });
});

describe("METRIC-CHANGE-001 weekCompare: this lived week against last week", () => {
  // Lived days from Monday 2026-11-09 16:30; index 0..6 last week, 7.. this week; the last one is in progress.
  const day = (i: number, value: number | null, partial = false): PeriodValue => {
    const from = new Date(2026, 10, 9 + i, 16, 30).getTime();
    return { dayId: `d${i}`, from, to: new Date(2026, 10, 10 + i, 16, 30).getTime(), value, partial };
  };
  it("averages each week's recorded, finished days; the day in progress never counts", () => {
    const series = [day(0, 120), day(1, null), day(2, 110), day(3, 124), day(4, null), day(5, 118), day(6, null),
      day(7, 150), day(8, 134), day(9, 142), day(10, 10, true)];
    expect(weekCompare(series, 5)).toEqual({ thisWeek: 142, lastWeek: 118, thisDays: 3, lastDays: 4, way: "HIGHER" });
  });
  it("is quiet until both weeks have two recorded days, and says 'about the same' inside the floor", () => {
    expect(weekCompare([day(0, 120), day(2, 118), day(7, 150), day(8, null, true)], 5)).toBeNull();
    expect(weekCompare([day(0, 120), day(7, 150), day(8, 140), day(9, 1, true)], 5)).toBeNull();
    expect(weekCompare([day(0, 120), day(1, 118), day(7, 121), day(8, 123), day(9, 1, true)], 5)?.way).toBe("SAME");
    expect(weekCompare([day(0, 206.4), day(1, 206.0), day(7, 205.1), day(8, 204.9), day(9, null, true)], 1, 0, 1)).toMatchObject({ thisWeek: 205, lastWeek: 206.2, way: "LOWER" });
  });
});

describe("METRIC-PAGE-002 slice 3: finished workouts", () => {
  const day = (i: number, value: number | null, partial = false): PeriodValue => {
    const from = new Date(2026, 10, 9 + i, 16, 30).getTime();
    return { dayId: `d${i}`, from, to: new Date(2026, 10, 10 + i, 16, 30).getTime(), value, partial };
  };
  it("weeks are totals, the series keeps 0 for a recorded day without one and null for a missing day", () => {
    expect(WEEK_MODE.workouts).toBe("sum");
    expect(DIGITS.workouts).toBe(0);
    expect(rangesFor("workouts").map(([id]) => id)).toEqual(["today", "7d", "30d", "1y"]);
    const week = Array.from({ length: 7 }, (_, i) => pv(i, [1, 0, null, 1, 2, 0, 0][i]!));
    expect(rangeValues(week, "1y", "sum").map((v) => v.value)).toEqual([4]);
  });
  it("this week so far and last week are plain totals, the day in progress included; quiet until last week has a recorded day", () => {
    const series = [day(0, 1), day(1, 0), day(2, null), day(3, 1), day(4, 0), day(5, 1), day(6, 0), day(7, 0), day(8, 1), day(9, 1, true)];
    expect(weekTotals(series)).toEqual({ thisWeek: 2, lastWeek: 3 });
    expect(weekTotals([day(7, 1), day(8, 0, true)])).toBeNull();
  });
  it("the usual is the median weekly total of the last 8 finished weeks, once there are 4", () => {
    const weeks = (totals: number[]) => totals.flatMap((t, w) => Array.from({ length: 7 }, (_, i) => pv(w * 7 + i, i < t ? 1 : 0)));
    expect(weeklyUsual(weeks([3, 2, 4]))).toEqual({ value: null, samples: 3, need: WORKOUT_USUAL_MIN_WEEKS });
    expect(weeklyUsual(weeks([5, 5, 3, 2, 4, 3, 3, 4, 2, 6]))).toMatchObject({ value: 3, samples: 8 });
    // The week in progress never counts.
    const live = [...weeks([3, 3, 3, 3]), ...Array.from({ length: 7 }, (_, i) => pv(28 + i, 1, `d${28 + i}`, i === 6))];
    expect(weeklyUsual(live)).toMatchObject({ value: 3, samples: 4 });
  });
  it("work days against days off count the days that had a finished workout, never a median", () => {
    const series = Array.from({ length: 10 }, (_, i) => pv(i, i === 9 ? null : i % 3 === 0 ? 1 : 0));
    const ctx = (id: string) => (Number(id.slice(1)) % 2 ? "WORK" : "OFF");
    expect(trainedSplit(series, ctx)).toEqual({ work: { days: 4, trained: 1 }, off: { days: 5, trained: 2 } });
  });
});
