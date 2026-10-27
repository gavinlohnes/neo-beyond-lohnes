import { describe, expect, it } from "vitest";
import { unusualStreak, usualRange, UNUSUAL_SPECS } from "../../src/domain/health/unusual";
import type { PeriodValue } from "../../src/domain/health/measuredSeries";

const DAY = 86400000;
const series = (values: (number | null)[], partialLast = true): PeriodValue[] =>
  values.map((value, i) => ({ dayId: `d${i}`, from: i * DAY, to: (i + 1) * DAY, value, partial: partialLast && i === values.length - 1 }));
// 28 ordinary resting days 55–60, then the judged days, then today's partial period.
const usual = Array.from({ length: 28 }, (_, i) => 55 + (i % 6));

describe("ROTATION-002 — unusual for you", () => {
  it("stays silent inside the usual range, with too little history, or with a missing day", () => {
    expect(unusualStreak(series([...usual, 58, 57, 59, 60]), UNUSUAL_SPECS.resting)).toBeNull();
    expect(unusualStreak(series([...usual.slice(0, 10), 70, 71, 72, 60]), UNUSUAL_SPECS.resting)).toBeNull();
    expect(unusualStreak(series([...usual, 70, null, 72, 60]), UNUSUAL_SPECS.resting)).toBeNull();
  });

  it("needs three finished days on the same side; today's partial period never counts", () => {
    expect(unusualStreak(series([...usual, 70, 71, 60]), UNUSUAL_SPECS.resting)).toBeNull();
    expect(unusualStreak(series([...usual, 70, 40, 72, 60]), UNUSUAL_SPECS.resting)).toBeNull();
    const reading = unusualStreak(series([...usual, 66, 67, 68, 50]), UNUSUAL_SPECS.resting)!;
    expect(reading.direction).toBe("ABOVE");
    expect(reading.days.map((d) => d.value)).toEqual([66, 67, 68]);
    expect(reading.days.at(-1)).toMatchObject({ low: 54, high: 60 });
    expect(reading.samples).toBe(28);
  });

  it("reports the whole streak, judged against the days before it", () => {
    const reading = unusualStreak(series([...usual, 66, 67, 68, 69, 70, 58]), UNUSUAL_SPECS.resting)!;
    expect(reading.days).toHaveLength(5);
    // A finished day on the other side breaks the streak rather than joining it.
    expect(unusualStreak(series([...usual, 40, 41, 42, 99], false), UNUSUAL_SPECS.resting)).toBeNull();
  });

  it("widens a tight range to the minimum width so ordinary noise stays quiet", () => {
    expect(usualRange(Array(20).fill(58), UNUSUAL_SPECS.resting)).toEqual({ low: 55, high: 61, samples: 20 });
    expect(usualRange(Array(13).fill(58), UNUSUAL_SPECS.resting)).toBeNull();
  });

  it("compares steps with days of the same kind and stops at an unknown kind", () => {
    const kinds = (i: number) => (i % 2 ? "OFF" : "WORK") as "WORK" | "OFF";
    const values = Array.from({ length: 56 }, (_, i) => (kinds(i) === "WORK" ? 12000 : 4000));
    const low = [...values, 6000, 1000, 6000, 9000];
    const kindOf = (p: PeriodValue) => kinds(Number(p.dayId!.slice(1)));
    const reading = unusualStreak(series(low), UNUSUAL_SPECS.steps, kindOf)!;
    expect(reading.direction).toBe("BELOW");
    expect(reading.days.map((d) => d.kind)).toEqual(["WORK", "OFF", "WORK"]);
    expect(unusualStreak(series(low), UNUSUAL_SPECS.steps, () => null)).toBeNull();
  });
});
