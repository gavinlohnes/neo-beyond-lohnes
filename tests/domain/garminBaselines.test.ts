import { describe, expect, it } from "vitest";
import { BASELINE_MIN_SAMPLES, median, personalBaselines } from "../../src/domain/health/baselines";
import type { ActivityHour, RestingHeartRate } from "../../src/domain/health/activityImport";
import type { ExternalSleep } from "../../src/domain/health/sleepImport";

const DAY = 24 * 60 * 60 * 1000;
const base = Date.parse("2026-09-01T21:30:00Z"); // 16:30 Chicago
const now = base + 29.5 * DAY; // day 29 is in progress
const days = Array.from({ length: 30 }, (_, i) => ({ id: `d${i}`, startedAt: new Date(base + i * DAY).toISOString(), workContext: (i % 2 ? "OFF" : "WORK") as "WORK" | "OFF" }));
const iso = (t: number) => new Date(t).toISOString();
const sleep = (i: number, hours: number): ExternalSleep => ({ id: `s${i}`, dataOriginPackage: "com.garmin.android.apps.connectmobile", lastModifiedTime: iso(now),
  startTime: iso(base + i * DAY + 10 * 3600_000), endTime: iso(base + i * DAY + (10 + hours) * 3600_000), startZoneOffsetSeconds: null, endZoneOffsetSeconds: null, stages: [] });
const hour = (t: number, steps: number): ActivityHour => ({ startTime: iso(t), endTime: iso(t + 3600_000), zoneOffsetSeconds: null, steps, heartRateMinBpm: null, heartRateAvgBpm: 70, heartRateMaxBpm: null });
const rhr = (i: number, bpm: number): RestingHeartRate => ({ id: `r${i}`, dataOriginPackage: "com.garmin.android.apps.connectmobile", lastModifiedTime: iso(now), time: iso(base + i * DAY + 14 * 3600_000), zoneOffsetSeconds: null, bpm });

describe("personal baselines", () => {
  it("are rolling 28-day medians by lived day, steps split by work and off days", () => {
    const sleeps = days.map((_, i) => sleep(i, i % 2 ? 8 : 6)).concat([sleep(5, 1)].map((s) => ({ ...s, id: "nap", startTime: iso(Date.parse(s.startTime) + 9 * 3600_000), endTime: iso(Date.parse(s.startTime) + 10 * 3600_000) })));
    const hours = days.flatMap((_, i) => [hour(base + i * DAY + 3600_000, i % 2 ? 2000 : 9000), hour(base + i * DAY + 5 * 3600_000, 1000)]);
    const resting = days.map((_, i) => rhr(i, 60 + (i % 5)));
    const b = personalBaselines({ days, sleeps, hours, resting, now });
    expect(b.mainSleepMinutes.samples).toBe(28); // the nap never beats the main sleep of its day
    expect(b.mainSleepMinutes.value).toBe(420);
    expect(b.restingHeartRateBpm.value).toBe(62);
    expect(b.workDaySteps).toEqual({ value: 10000, samples: 14 });
    // The day in progress is left out, leaving 13 finished off days: below the 14-day minimum.
    expect(b.offDaySteps).toEqual({ value: null, samples: 13 });
  });
  it("say 'not enough data' instead of guessing", () => {
    const b = personalBaselines({ days, sleeps: [sleep(29, 7)], hours: [], resting: [], now });
    expect(b.mainSleepMinutes).toEqual({ value: null, samples: 1 });
    expect(b.workDaySteps).toEqual({ value: null, samples: 0 });
    expect(BASELINE_MIN_SAMPLES).toBe(14);
  });
  it("median", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });
});
