import { describe, expect, it } from "vitest";
import type { ExternalSleep } from "../../src/domain/health/sleepImport";
import type { DaySummary } from "../../src/engine/dayLedger";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { circularMean, clockDifference, clockMinutes, deriveSleepRhythm } from "../../src/engine/sleepRhythm";
import { clock, describeGroup, describeShift, segments } from "../../src/ui/screens/today/SleepRhythm";

/** SLEEP-RHYTHM-001. Invented nights only. Times are UTC with a CST (−6h) zone offset, like Garmin sends. */
const CST = -6 * 3600;
const NOW = new Date("2026-11-09T18:00:00Z");
let n = 0;
function sleep(startUtc: string, hours: number): ExternalSleep {
  const start = Date.parse(startUtc);
  return { id: `s${++n}`, dataOriginPackage: "com.garmin.android.apps.connectmobile", lastModifiedTime: startUtc,
    startTime: new Date(start).toISOString(), endTime: new Date(start + hours * 3_600_000).toISOString(),
    startZoneOffsetSeconds: CST, endZoneOffsetSeconds: CST, stages: [] };
}
function day(startUtc: string, declared: "WORK" | "OFF"): DaySummary {
  return { beyondDayId: `d-${startUtc}`, livedDayStart: mostRecentBoundaryAtOrBefore(new Date(startUtc)).toISOString(), work: { declared } } as unknown as DaySummary;
}

describe("clock maths", () => {
  it("reads local clock time from Garmin's own zone offset and averages across midnight", () => {
    expect(clockMinutes("2026-11-08T05:30:00Z", CST)).toBe(23 * 60 + 30); // 11:30 pm CST
    expect(circularMean([23 * 60 + 30, 30])).toBe(0); // 11:30 pm and 12:30 am average to midnight, not noon
    expect(clockDifference(23 * 60, 60)).toBe(120);
    expect(clockDifference(60, 23 * 60)).toBe(-120);
    expect(circularMean([0, 720])).toBeNull(); // opposite times have no meaningful average
  });
});

describe("deriveSleepRhythm", () => {
  // A night worker: after work, asleep ~8 am → 3 pm CST; on days off, asleep ~11:30 pm → 7:30 am.
  const sleeps: ExternalSleep[] = [], days: DaySummary[] = [];
  for (let i = 1; i <= 12; i++) {
    const date = new Date(Date.parse("2026-11-08T00:00:00Z") - i * 86_400_000).toISOString().slice(0, 10);
    if (i % 3 === 0) {
      const start = `${date}T05:${String(20 + i).padStart(2, "0")}:00Z`; // ~11:30 pm CST the evening before
      sleeps.push(sleep(start, 8)); days.push(day(start, "OFF"));
    } else {
      const start = `${date}T14:${String(i * 2).padStart(2, "0")}:00Z`; // ~8 am CST
      sleeps.push(sleep(start, 7)); days.push(day(start, "WORK"));
      sleeps.push(sleep(`${date}T21:00:00Z`, 1)); // a nap: never the main sleep
    }
  }
  sleeps.push(sleep("2026-09-01T14:00:00Z", 7)); // outside the four weeks

  const rhythm = deriveSleepRhythm(sleeps, days, NOW);

  it("keeps one main sleep per lived day inside the last four weeks, newest first, naps left out", () => {
    expect(rhythm.nights).toHaveLength(12);
    expect(rhythm.nights.every((x) => x.asleepMinutes >= 7 * 60)).toBe(true);
    expect(rhythm.nights[0]!.livedDayStart > rhythm.nights[11]!.livedDayStart).toBe(true);
  });

  it("states usual times per kind of day and how far the clock moves between them", () => {
    const work = rhythm.groups.find((g) => g.kind === "WORK")!, off = rhythm.groups.find((g) => g.kind === "OFF")!;
    expect(work.nights).toBe(8);
    expect(off.nights).toBe(4);
    expect(Math.abs(clockDifference(work.start, 8 * 60 + 11))).toBeLessThan(15);
    expect(Math.abs(clockDifference(off.start, 23 * 60 + 27))).toBeLessThan(15);
    expect(work.spread).toBeLessThan(15);
    // Midpoints ~11:40 am (work) and ~3:30 am (off): days off sit about 8h 10m earlier.
    expect(rhythm.offMinusWork).toBeLessThan(-7 * 60);
    expect(rhythm.offMinusWork).toBeGreaterThan(-8.5 * 60);
    expect(describeShift(rhythm.offMinusWork!)).toMatch(/^On days off your sleep sits 8h \d+m earlier than on work days — about the same clock change as crossing 8 time zones, each way\.$/);
    expect(describeGroup(work)).toMatch(/^Work days: asleep around 8:\d\d am, up around 3:\d\d pm · usually within \d+m · 8 nights\.$/);
  });

  it("states nothing it can't support: too few nights, or no kinds set", () => {
    const few = deriveSleepRhythm(sleeps.slice(0, 2), days.slice(0, 2), NOW);
    expect(few.groups).toEqual([]);
    expect(few.offMinusWork).toBeNull();
    const unset = deriveSleepRhythm(sleeps, [], NOW);
    expect(unset.groups).toEqual([]);
    expect(unset.nights.every((x) => x.kind === "UNKNOWN")).toBe(true);
    expect(deriveSleepRhythm([], days, NOW).nights).toEqual([]);
  });

  it("centres the chart on the typical night and splits a bar that crosses the edge", () => {
    expect(clock(0)).toBe("12:00 am");
    expect(clock(13 * 60 + 5)).toBe("1:05 pm");
    const parts = segments({ livedDayStart: "x", kind: "OFF", start: 22 * 60, end: 6 * 60, asleepMinutes: 480 }, 0);
    expect(parts).toEqual([[22 / 24, 2 / 24], [0, 6 / 24]]);
    expect(segments({ livedDayStart: "x", kind: "OFF", start: 22 * 60, end: 6 * 60, asleepMinutes: 480 }, 12 * 60)).toEqual([[10 / 24, 8 / 24]]);
  });
});
