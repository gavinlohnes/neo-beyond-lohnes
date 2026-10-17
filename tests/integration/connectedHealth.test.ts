import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { correctBodyweight, correctWater, endDay, logBodyweight, logProtein, logSleep, logWater, startDay, voidWaterLog } from "../../src/application/commands";
import { createSavedMeal, logMeal, updateSavedMeal } from "../../src/application/nutritionCommands";
import { getHealthDay, getHealthSources, healthDayStart, offsetHealthDay } from "../../src/application/healthRecordQueries";
import { getBodyInsights, insightPoints } from "../../src/application/bodyInsightsQueries";
import { getBodyweightHistory } from "../../src/application/bodyTrendQueries";

beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 12, 20)); });
afterEach(() => { vi.useRealTimers(); db.close(); });
async function snapshot() { return Promise.all(db.tables.map(async (table) => [table.name, await table.toArray()])); }

describe("Connected Health Record — canonical read-only evidence", () => {
  it("keeps midnight entries in recorded ownership and resolves corrections, voids and immutable meal snapshots", async () => {
    const day = await startDay();
    const water = await logWater(day.id, 16); await correctWater(day.id, water, 12);
    const undone = await logWater(day.id, 8); await voidWaterLog(day.id, undone);
    const meal = await createSavedMeal({ name: "Night meal", calories: 500, proteinG: 40, carbsG: 45, fatG: 12 });
    vi.setSystemTime(new Date(2026, 9, 13, 2));
    await logMeal(day.id, meal.id); await logProtein(day.id, 10);
    await updateSavedMeal(meal.id, { name: "Changed preset", calories: 900, proteinG: 80, carbsG: 80, fatG: 35 });
    const before = await snapshot();
    const data = await getHealthDay(healthDayStart());
    expect(data.days.map((d) => d.id)).toEqual([day.id]);
    expect(data.records).toHaveLength(3);
    expect(data.records.find((r) => r.record.kind === "WATER")?.record.entry).toMatchObject({ effectiveAmountOz: 12, rootEventId: water, correctionCount: 1 });
    expect(data.records.find((r) => r.record.kind === "MEAL")?.record.entry).toMatchObject({ name: "Night meal", effectiveCalories: 500, effectiveProteinG: 40 });
    const insights = await getBodyInsights();
    const point = insightPoints(insights, [], "protein")[0]!;
    expect(point.value).toBe(50);
    expect((await getHealthSources(point, "protein")).records).toHaveLength(2);
    expect(insightPoints(insights, [], "water")[0]?.value).toBe(12);
    expect(await snapshot()).toEqual(before);
  });
  it("uses root identity for identical-time weigh-ins; correcting one never opens the other", async () => {
    const day = await startDay();
    const first = await logBodyweight(day.id, 180);
    const second = await logBodyweight(day.id, 181);
    await correctBodyweight(day.id, first, 179);
    const data = await getBodyInsights();
    const points = insightPoints(data, await getBodyweightHistory(), "weight");
    expect(points.map((point) => point.id)).toEqual([first, second]);
    expect(points[0]?.at).toBe(points[1]?.at);
    const daySources = await getHealthDay(healthDayStart());
    expect(daySources.records.filter((source) => source.record.kind === "WEIGHT").map((source) => source.record.entry.rootEventId)).toEqual([first, second]);
    const source = await getHealthSources(points[0]!, "weight");
    expect(source.records).toHaveLength(1);
    expect(source.records[0]?.record.entry).toMatchObject({ rootEventId: first, effectiveWeightLbs: 179, originalWeightLbs: 180 });
    expect(source.records[0]?.record.entry.headEventId).not.toBe(first);
  });
  it("groups early-ended/restarted segments while retaining each source's actual day; multiple main sleeps stay separate", async () => {
    const first = await startDay(); await logSleep(first.id, 400, "PRIMARY"); await logWater(first.id, 8); await endDay(first.id);
    vi.setSystemTime(new Date(2026, 9, 12, 22));
    const second = await startDay(); await logSleep(second.id, 420, "PRIMARY"); await logSleep(second.id, 20, "SUPPLEMENTAL");
    const data = await getHealthDay(healthDayStart());
    expect(data.days.map((day) => day.id)).toEqual([first.id, second.id]);
    expect(data.records.filter((source) => source.record.kind === "SLEEP")).toHaveLength(3);
    expect(data.records.filter((source) => source.record.kind === "SLEEP").map((source) => source.beyondDayId)).toEqual([first.id, second.id, second.id]);
    // The established chart keeps per-recorded-day observations; the day browser does not redefine it.
    expect(insightPoints(await getBodyInsights(), [], "sleep").map((point) => point.value)).toEqual([400 / 60, 7]);
  });
  it("does not invent a day or zero for empty history, including old dates", async () => {
    const before = await snapshot();
    const data = await getHealthDay(offsetHealthDay(healthDayStart(), -400));
    expect(data.records).toEqual([]); expect(data.days).toEqual([]); expect(data.context).toBe("UNKNOWN");
    expect(insightPoints(await getBodyInsights(), [], "water")).toEqual([]);
    expect(await snapshot()).toEqual(before);
  });
  it("keeps an ambiguous sleep out of the trend but permits inspection of its individual recorded sources", async () => {
    const day = await startDay(); await logSleep(day.id, 400, "PRIMARY"); await logSleep(day.id, 410, "PRIMARY");
    const nap = await logSleep(day.id, 25, "SUPPLEMENTAL");
    expect(insightPoints(await getBodyInsights(), [], "sleep")).toEqual([]);
    const source = await getHealthSources({ id: nap, at: new Date().toISOString(), value: 25, source: { beyondDayId: day.id, rootEventId: nap } }, "sleep");
    expect(source.records[0]?.record.entry).toMatchObject({ kind: "SUPPLEMENTAL", effectiveDurationMinutes: 25 });
  });
  it("does not claim sources for an unowned or removed observation", async () => {
    await expect(getHealthSources({ id: "unknown", at: new Date().toISOString(), value: 3 }, "water")).rejects.toThrow("source");
    await expect(getHealthSources({ id: "gone", at: new Date().toISOString(), value: 3, source: { beyondDayId: "gone" } }, "water")).rejects.toThrow("no longer available");
  });
  it("changes the day at 16:30, not midnight", () => {
    const start = healthDayStart(new Date(2026, 9, 12, 17));
    expect(healthDayStart(new Date(2026, 9, 13, 0, 1))).toBe(start);
    expect(healthDayStart(new Date(2026, 9, 13, 16, 29))).toBe(start);
    expect(healthDayStart(new Date(2026, 9, 13, 16, 30))).toBe(offsetHealthDay(start, 1));
  });
});

it("keeps the local 16:30 boundary across both DST changes", () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    for (const [month, date, hours] of [[2, 7, 23], [9, 31, 25]] as const) {
      const start = healthDayStart(new Date(2026, month, date, 20));
      const end = offsetHealthDay(start, 1);
      expect(new Date(start).getHours()).toBe(16);
      expect(new Date(end).getHours()).toBe(16);
      expect(new Date(end).getMinutes()).toBe(30);
      expect((Date.parse(end) - Date.parse(start)) / 3600000).toBe(hours);
      expect(offsetHealthDay(end, -1)).toBe(start);
    }
  } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
});
