import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { correctBodyweight, logBodyweight, startDay } from "../../src/application/commands";
import {
  describeBestSince,
  describeMilestone,
  getBodyweightHistory,
  projectGoalDate,
  trendDirection,
  type WeighIn,
} from "../../src/application/bodyTrendQueries";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";
import { parseNutritionTargets } from "../../src/persistence/nutritionTargetValidation";

/**
 * Drop 5 (BODY weight trend): the pure trend rules, the all-days history
 * query against real Dexie (fake-indexeddb), and the optional goal weight
 * saved alongside nutrition targets.
 */

const day = (n: number) => new Date(Date.UTC(2026, 6, 1 + n, 12)).toISOString(); // Jul 1 + n
const w = (n: number, lbs: number): WeighIn => ({ recordedAt: day(n), weightLbs: lbs });

describe("trend rules (pure)", () => {
  it("losing unless a goal above the first weigh-in", () => {
    const h = [w(0, 200), w(1, 199)];
    expect(trendDirection(h)).toBe("LOSE");
    expect(trendDirection(h, 190)).toBe("LOSE");
    expect(trendDirection(h, 210)).toBe("GAIN");
  });

  it("lowest since the last time you were this low, when that's 2+ weeks back", () => {
    const h = [w(0, 190), w(10, 195), w(20, 193), w(30, 189.5)];
    expect(describeBestSince(h, "LOSE")).toBe("Lowest yet");
    const h2 = [w(0, 188), w(10, 195), w(20, 193), w(30, 189.5)];
    expect(describeBestSince(h2, "LOSE")).toBe("Lowest since Jul 1");
  });

  it("says nothing when the last lower weigh-in was recent, or with one weigh-in", () => {
    expect(describeBestSince([w(0, 190), w(3, 191)], "LOSE")).toBeUndefined();
    expect(describeBestSince([w(0, 190)], "LOSE")).toBeUndefined();
  });

  it("highest since, when gaining", () => {
    expect(describeBestSince([w(0, 160), w(20, 158), w(30, 161)], "GAIN")).toBe("Highest yet");
  });

  it("milestones in whole 5-lb steps toward the goal direction only", () => {
    expect(describeMilestone([w(0, 200), w(30, 189)], "LOSE")).toBe("Down 10 lb since Jul 1");
    expect(describeMilestone([w(0, 200), w(30, 196)], "LOSE")).toBeUndefined();
    expect(describeMilestone([w(0, 200), w(30, 210)], "LOSE")).toBeUndefined();
    expect(describeMilestone([w(0, 150), w(30, 156)], "GAIN")).toBe("Up 5 lb since Jul 1");
  });

  it("projects a goal date from a steady trend over the last four weeks", () => {
    // 0.5 lb/day down from 200 over 20 days → 190 now; goal 180 is ~20 days out.
    const h = [0, 5, 10, 15, 20].map((n) => w(n, 200 - n * 0.5));
    const p = projectGoalDate(h, 180);
    expect(p.kind).toBe("DATE");
    if (p.kind === "DATE") expect(p.date.toISOString().slice(0, 10)).toBe(day(40).slice(0, 10));
  });

  it("no projection without a goal, with too little data, or when the trend heads away", () => {
    const steady = [0, 5, 10, 15, 20].map((n) => w(n, 200 - n * 0.5));
    expect(projectGoalDate(steady, undefined).kind).toBe("NONE");
    expect(projectGoalDate(steady.slice(0, 4), 180).kind).toBe("NONE");
    expect(projectGoalDate([0, 2, 4, 6, 8].map((n) => w(n, 200 - n)), 180).kind).toBe("NONE"); // under 14 days
    const rising = [0, 5, 10, 15, 20].map((n) => w(n, 190 + n * 0.3));
    expect(projectGoalDate(rising, 180).kind).toBe("NONE");
  });

  it("says the goal is reached once the latest weigh-in is there", () => {
    expect(projectGoalDate([w(0, 185), w(10, 179.5)], 180).kind).toBe("REACHED");
  });
});

describe("getBodyweightHistory + goal weight (real Dexie)", () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    db.close();
    vi.useRealTimers();
  });

  it("reads every weigh-in across days, oldest first, at corrected values", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(day(0)));
    const first = await startDay();
    const typo = await logBodyweight(first.id, 2000);
    await correctBodyweight(first.id, typo, 200);
    vi.setSystemTime(new Date(day(20)));
    const second = await startDay();
    await logBodyweight(second.id, 195);
    vi.useRealTimers();

    const history = await getBodyweightHistory();
    expect(history.map((h) => h.weightLbs)).toEqual([200, 195]);
    expect(history[0]!.recordedAt < history[1]!.recordedAt).toBe(true);
  });

  it("stores an optional goal weight without touching the other targets", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2200, proteinMultiplierGPerLb: 0.9 });
    await updateNutritionTargets({ goalWeightLbs: 180 });
    const targets = await getNutritionTargets();
    expect(targets).toMatchObject({ calorieTargetKcal: 2200, proteinMultiplierGPerLb: 0.9, goalWeightLbs: 180 });

    await updateNutritionTargets({ calorieTargetKcal: 2100 });
    expect((await getNutritionTargets()).goalWeightLbs).toBe(180);
  });

  it("rejects an implausible goal, and rows without a goal stay valid", async () => {
    await expect(updateNutritionTargets({ goalWeightLbs: 5 })).rejects.toThrow();
    const legacy = { id: "current", proteinMultiplierGPerLb: 1, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" };
    expect(parseNutritionTargets(legacy)).toMatchObject({ proteinMultiplierGPerLb: 1 });
    expect(parseNutritionTargets(legacy)?.goalWeightLbs).toBeUndefined();
  });
});
