import { describe, expect, it } from "vitest";
import type { ActivityHour, RestingHeartRate } from "../../src/domain/health/activityImport";
import type { ExternalSleep, SleepStage } from "../../src/domain/health/sleepImport";
import {
  average, cumulativeSteps, hypnogram, lastNight, recentPeriods, restingByPeriod, sleepByPeriod, stageMinutes, stepsByPeriod, weekly,
} from "../../src/domain/health/measuredSeries";

const DAY = 24 * 60 * 60 * 1000, H = 3600_000;
const base = Date.parse("2026-09-01T21:30:00Z"); // 16:30 Chicago
const now = base + 9 * DAY + 5 * H; // day 9 is in progress
const days = Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, startedAt: new Date(base + i * DAY).toISOString() }));
const iso = (t: number) => new Date(t).toISOString();
const hour = (t: number, steps: number | null): ActivityHour => ({ startTime: iso(t), endTime: iso(t + H), zoneOffsetSeconds: null, steps, heartRateMinBpm: null, heartRateAvgBpm: null, heartRateMaxBpm: null });
const rhr = (t: number, bpm: number): RestingHeartRate => ({ id: `r${t}`, dataOriginPackage: "garmin", lastModifiedTime: iso(now), time: iso(t), zoneOffsetSeconds: null, bpm });
const stage = (from: number, minutes: number, type: SleepStage["type"]): SleepStage => ({ startTime: iso(from), endTime: iso(from + minutes * 60000), type });
const sleep = (start: number, stages: SleepStage[], minutes = 0): ExternalSleep => ({ id: `s${start}`, dataOriginPackage: "garmin", lastModifiedTime: iso(now),
  startTime: iso(start), endTime: iso(stages.length ? Date.parse(stages.at(-1)!.endTime) : start + minutes * 60000), startZoneOffsetSeconds: null, endZoneOffsetSeconds: null, stages });

describe("GARMIN-004 measured series", () => {
  it("walks back lived days ending with the one in progress", () => {
    const periods = recentPeriods(days, now, 3);
    expect(periods.map((p) => p.dayId)).toEqual(["d7", "d8", "d9"]);
    // Before the first BEYOND day the periods keep the 16:30 edges, with no day.
    const early = recentPeriods(days, base + 2 * H, 3);
    expect(early.map((p) => p.dayId)).toEqual([null, null, "d0"]);
    expect(early[1]!.to).toBe(base);
  });

  it("sums steps per lived day, leaves unmeasured days null and marks today so far", () => {
    const periods = recentPeriods(days, now, 3);
    const hours = [hour(base + 7 * DAY + H, 1200), hour(base + 7 * DAY + 2 * H, 800), hour(base + 8 * DAY + H, null), hour(base + 9 * DAY + 2 * H, 500)];
    const steps = stepsByPeriod(periods, hours, now);
    expect(steps.map((s) => s.value)).toEqual([2000, null, 500]);
    expect(steps.map((s) => s.partial)).toEqual([false, false, true]);
    expect(average(steps)).toBe(1250);
  });

  it("uses each day's lowest resting heart rate and the longest sleep, so a nap never replaces the night", () => {
    const periods = recentPeriods(days, now, 2);
    const resting = restingByPeriod(periods, [rhr(base + 8 * DAY + H, 64), rhr(base + 8 * DAY + 9 * H, 58)], now);
    expect(resting.map((r) => r.value)).toEqual([58, null]);
    const night = sleep(base + 8 * DAY + 5 * H, [stage(base + 8 * DAY + 5 * H, 300, "LIGHT"), stage(base + 8 * DAY + 10 * H, 60, "REM")]);
    const nap = sleep(base + 8 * DAY + 20 * H, [stage(base + 8 * DAY + 20 * H, 40, "LIGHT")]);
    expect(sleepByPeriod(periods, [night, nap], now).map((s) => s.value)).toEqual([360, null]);
    expect(lastNight([night, nap], base + 9 * DAY)?.id).toBe(night.id);
    expect(lastNight([night], now + 2 * DAY)).toBeNull();
  });

  it("totals weeks (steps) or averages them (heart rate), oldest first", () => {
    const periods = recentPeriods(days, now, 10);
    const values = periods.map((p, i) => ({ ...p, value: i === 4 ? null : 100, partial: i === 9 }));
    expect(weekly(values, "sum").map((w) => [w.value, w.partial])).toEqual([[300, false], [600, true]]);
    expect(weekly(values, "mean").map((w) => w.value)).toEqual([100, 100]);
  });

  it("draws today's running step total from measured hours only", () => {
    const current = recentPeriods(days, now, 1)[0]!;
    const points = cumulativeSteps(current, [hour(base + 9 * DAY + H, 300), hour(base + 9 * DAY + 3 * H, 200), hour(base + 9 * DAY + 2 * H, null)], now);
    expect(points.map((p) => p.total)).toEqual([0, 300, 500]);
  });

  it("reports stages Garmin never recorded as missing, not zero", () => {
    const start = base + 8 * DAY + 5 * H;
    const night = sleep(start, [stage(start, 30, "LIGHT"), stage(start + 30 * 60000, 20, "REM"), stage(start + 50 * 60000, 6, "AWAKE_IN_BED"), stage(start + 56 * 60000, 10, "SLEEPING")]);
    expect(stageMinutes(night)).toEqual({ AWAKE: 6, REM: 20, LIGHT: 30, DEEP: null });
    expect(hypnogram(night).map((s) => s.stage)).toEqual(["LIGHT", "REM", "AWAKE"]);
    expect(stageMinutes(sleep(start, [], 400))).toEqual({ AWAKE: null, REM: null, LIGHT: null, DEEP: null });
  });
});
