import { describe, expect, it } from "vitest";
import { latestTrend, smoothWeights, TREND_ALPHA, trendReady } from "../src/application/weightTrend";
import type { WeighIn } from "../src/application/bodyTrendQueries";

/**
 * GRAYSON-WEIGHT-TREND-001: the smoothing rule. Runs in both TZ=UTC and TZ=America/Chicago; every timestamp is
 * built in local time so "a local day" means the same thing in both.
 */
const at = (day: number, hour = 7, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const daily = (weights: number[], firstDay = 1): WeighIn[] => weights.map((weightLbs, i) => ({ recordedAt: at(firstDay + i), weightLbs }));
const STEADY = TREND_ALPHA.STEADY;
const QUICKER = TREND_ALPHA.QUICKER;

describe("GRAYSON-WEIGHT-TREND-001 smoothing", () => {
  it("gives a flat trend for constant weigh-ins", () => {
    const points = smoothWeights(daily(Array(10).fill(180)), { alpha: STEADY });
    expect(points).toHaveLength(10);
    expect(points.every((p) => p.trendLbs === 180)).toBe(true);
  });

  it("moves about 0.3 lb (Steady) or 0.6 lb (Quicker) for a one-day 3 lb spike", () => {
    const history = daily([...Array(9).fill(180), 183]);
    expect(latestTrend(history, STEADY)).toMatchObject({ trendLbs: 180.3, scaleLbs: 183 });
    expect(latestTrend(history, QUICKER)).toMatchObject({ trendLbs: 180.6, scaleLbs: 183 });
  });

  it("weights the weigh-in after a 5-day gap by 1 − 0.9^5", () => {
    const history = [...daily(Array(8).fill(180)), { recordedAt: at(13), weightLbs: 190 }];
    const expected = 180 + (1 - Math.pow(0.9, 5)) * 10;
    expect(latestTrend(history, STEADY)).toMatchObject({ trendLbs: Math.round(expected * 10) / 10 });
    expect(Math.round(expected * 10) / 10).toBe(184.1);
  });

  it("uses the last weigh-in of a local day", () => {
    const base = daily(Array(8).fill(180));
    const twice = [...base, { recordedAt: at(9, 6), weightLbs: 200 }, { recordedAt: at(9, 21), weightLbs: 181 }];
    const once = [...base, { recordedAt: at(9, 21), weightLbs: 181 }];
    expect(smoothWeights(twice, { alpha: STEADY })).toEqual(smoothWeights(once, { alpha: STEADY }));
    expect(smoothWeights(twice, { alpha: STEADY })).toHaveLength(9);
    // Order of the input doesn't matter.
    expect(smoothWeights([...twice].reverse(), { alpha: STEADY })).toEqual(smoothWeights(once, { alpha: STEADY }));
  });

  it("waits under 5 weigh-ins or under 7 days", () => {
    expect(latestTrend(daily([180, 181, 180, 182]), STEADY)).toEqual({ waiting: true });
    // Five weigh-ins, but only 4 days apart.
    expect(latestTrend(daily([180, 181, 180, 182, 181]), STEADY)).toEqual({ waiting: true });
    // Five weigh-ins on four days (two on one day) over a week still waits: one per day counts.
    const fourDays = [{ recordedAt: at(1), weightLbs: 180 }, { recordedAt: at(3), weightLbs: 181 }, { recordedAt: at(5, 6), weightLbs: 182 }, { recordedAt: at(5, 20), weightLbs: 181 }, { recordedAt: at(8), weightLbs: 180 }];
    expect(trendReady(fourDays)).toBe(false);
    // Five days spread over exactly a week shows.
    const week = [1, 3, 5, 6, 8].map((d) => ({ recordedAt: at(d), weightLbs: 180 }));
    expect(trendReady(week)).toBe(true);
    expect(smoothWeights(daily([180, 181]), { alpha: STEADY })).toEqual([]);
  });

  it("counts a weigh-in at 23:30 local on its local day", () => {
    const late = { recordedAt: at(8, 23, 30), weightLbs: 200 };
    const nextMorning = { recordedAt: at(9, 6), weightLbs: 181 };
    const base = daily(Array(7).fill(180));
    // 23:30 on day 8 and 06:00 on day 9 are different local days, so both count.
    expect(smoothWeights([...base, late, nextMorning], { alpha: STEADY })).toHaveLength(9);
    // A second weigh-in at 23:45 on day 8 replaces the 23:30 one, never day 9's.
    const later = { recordedAt: at(8, 23, 45), weightLbs: 182 };
    const points = smoothWeights([...base, late, later, nextMorning], { alpha: STEADY });
    expect(points).toHaveLength(9);
    expect(points[7]!.recordedAt).toBe(later.recordedAt);
  });

  it("is stable to one decimal", () => {
    const history = daily([183.6, 182.1, 184.4, 181.9, 183.0, 182.7, 184.2, 181.5, 182.9, 183.3]);
    const points = smoothWeights(history, { alpha: STEADY });
    for (const p of points) expect(Number(p.trendLbs.toFixed(1))).toBe(p.trendLbs);
    expect(smoothWeights(history, { alpha: STEADY })).toEqual(points);
  });

  it("skips unusable rows and starts from the first weigh-in", () => {
    const history = [{ recordedAt: "not a date", weightLbs: 300 }, { recordedAt: at(2), weightLbs: Number.NaN }, ...daily(Array(8).fill(175))];
    expect(smoothWeights(history, { alpha: STEADY }).every((p) => p.trendLbs === 175)).toBe(true);
  });
});
