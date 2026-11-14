import { expect, it } from "vitest";
import { garminFreshness, waterByHour, weightChange } from "../src/application/bodyDashboard";

/** BODY-DASH-001: the dashboard's pure helpers never invent a value. */
const t = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();

it("buckets water by hour of the lived day, at corrected amounts, ignoring voided and out-of-day logs", () => {
  const slots = waterByHour([
    { at: t(18, 16, 45), effectiveAmountOz: 16 }, { at: t(18, 17, 10), effectiveAmountOz: 8 },
    { at: t(18, 23, 59), effectiveAmountOz: 0 }, { at: t(19, 16, 31), effectiveAmountOz: 12 }, { at: t(18, 9), effectiveAmountOz: 20 },
  ], t(18, 16, 30));
  expect(slots).toHaveLength(24);
  expect([slots[0], slots[7], slots.reduce((a, b) => a + b, 0)]).toEqual([24, 0, 24]);
});

it("weight change uses the weigh-in nearest a week before, never a lone one or one too recent", () => {
  expect(weightChange([])).toBeNull();
  expect(weightChange([{ recordedAt: t(18, 8), weightLbs: 205 }])).toBeNull();
  expect(weightChange([{ recordedAt: t(17, 8), weightLbs: 206 }, { recordedAt: t(18, 8), weightLbs: 205 }])).toBeNull();
  expect(weightChange([{ recordedAt: t(3, 8), weightLbs: 209 }, { recordedAt: t(10, 8), weightLbs: 206.4 }, { recordedAt: t(18, 8), weightLbs: 205.2 }])).toEqual({ lbs: -1.2, days: 8 });
});

it("says how fresh Garmin is, and flags data older than 12 hours", () => {
  const now = new Date(2026, 10, 18, 22, 10).getTime();
  expect(garminFreshness(null, now)).toBeNull();
  expect(garminFreshness(new Date(2026, 10, 18, 21, 4).getTime(), now)).toEqual({ label: "Garmin as of 21:04", stale: false });
  expect(garminFreshness(new Date(2026, 10, 18, 8).getTime(), now)).toEqual({ label: "Garmin as of 08:00 · 14 h old", stale: true });
  expect(garminFreshness(new Date(2026, 10, 17, 21).getTime(), now)!.label).toBe("Garmin as of Tue 21:00 · 25 h old");
});

it("review of #512: steps are today's own measured value, so history with no hours yet today is not a 0", async () => {
  const { stepsSoFar } = await import("../src/application/bodyDashboard");
  expect(stepsSoFar(null)).toBeNull();
  expect(stepsSoFar({ any: false, steps: [{ value: 4000 }] })).toBeNull();
  expect(stepsSoFar({ any: true, steps: [{ value: 5200 }, { value: null }] })).toBeNull(); // history, nothing yet today
  expect(stepsSoFar({ any: true, steps: [{ value: 5200 }, { value: 1750 }] })).toBe(1750);
});
