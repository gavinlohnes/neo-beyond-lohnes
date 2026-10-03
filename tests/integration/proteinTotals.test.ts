import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { correctProtein, logProtein, startDay, voidProteinLog } from "../../src/application/commands";
import { getDayProteinTotalG, getMinimumDayStatus, getProteinEntries, getTotalProteinGrams } from "../../src/application/queries";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getSameFoodCheck } from "../../src/application/sameFoodQueries";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";

/**
 * DROP 1.5 (owner brief 2026-10-03): one shared protein total, DELETE for a
 * protein-only log, correcting to 0 refused with a pointer to DELETE, and
 * the "Same food?" check.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function dinner(proteinG = 50) {
  return createSavedMeal({ name: "Dinner", calories: 650, proteinG, carbsG: 60, fatG: 15 });
}

describe("the shared protein total", () => {
  it("is protein-only logs plus meals, and every reader agrees", async () => {
    const day = await startDay();
    await logProtein(day.id, 49);
    await logMeal(day.id, (await dinner()).id);

    expect(await getDayProteinTotalG(day.id)).toBe(99);
    expect(await getTotalProteinGrams(day.id)).toBe(49); // protein-only logs, by name
    expect((await getMinimumDayStatus(day.id)).protein).toBe(true);
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)?.proteinG).toBe(99);
    expect((await getWeeklySummary()).protein.avgGrams).toBe(99);
  });
});

describe("voidProteinLog — DELETE for a protein-only log", () => {
  it("removes the 49 g entry from every total but keeps the original event", async () => {
    const day = await startDay();
    const proteinId = await logProtein(day.id, 49);
    await logMeal(day.id, (await dinner()).id);

    await voidProteinLog(day.id, proteinId);

    expect(await getProteinEntries(day.id)).toEqual([]);
    expect(await getDayProteinTotalG(day.id)).toBe(50);
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)?.proteinG).toBe(50);
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.find((e) => e.id === proteinId)?.type).toBe("PROTEIN_LOGGED");
    const voids = events.filter((e) => e.type === "PROTEIN_LOG_VOIDED");
    expect(voids).toHaveLength(1);
    expect(voids[0]!.payload).toMatchObject({ proteinEventId: proteinId });
    expect(voids[0]!.causationId).toBe(proteinId);
  });

  it("deletes a corrected entry's whole chain from its latest correction; it can't be corrected after", async () => {
    const day = await startDay();
    const proteinId = await logProtein(day.id, 40);
    await correctProtein(day.id, proteinId, 45);
    const [entry] = await getProteinEntries(day.id);

    await voidProteinLog(day.id, entry!.headEventId);

    expect(await getDayProteinTotalG(day.id)).toBe(0);
    expect((await db.events.where("type").equals("PROTEIN_LOG_VOIDED").first())?.payload).toMatchObject({ proteinEventId: proteinId });
    await expect(correctProtein(day.id, entry!.headEventId, 30)).rejects.toThrow(/PROTEIN_LOG_VOIDED|STALE_CORRECTION_TARGET/);
  });

  it("is a no-op the second time, and rejects anything that isn't a protein log on this day", async () => {
    const day = await startDay();
    const proteinId = await logProtein(day.id, 30);
    await voidProteinLog(day.id, proteinId);
    await voidProteinLog(day.id, proteinId);
    expect(await db.events.where("type").equals("PROTEIN_LOG_VOIDED").count()).toBe(1);
    await expect(voidProteinLog(day.id, "nope")).rejects.toThrow(/PROTEIN_LOG_NOT_FOUND/);
    await expect(voidProteinLog("another-day", proteinId)).rejects.toThrow(/PROTEIN_LOG_NOT_FOUND/);
  });

  it("counts as a correction in the Burden Meter", async () => {
    const day = await startDay();
    await voidProteinLog(day.id, await logProtein(day.id, 30));
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)?.burden.corrections).toBe(1);
  });
});

describe("correcting protein to 0", () => {
  it("is refused with a pointer to DELETE, and writes nothing", async () => {
    const day = await startDay();
    const proteinId = await logProtein(day.id, 49);
    await expect(correctProtein(day.id, proteinId, 0)).rejects.toThrow(/use DELETE/);
    expect(await db.events.where("type").equals("PROTEIN_LOG_CORRECTED").count()).toBe(0);
    expect(await getDayProteinTotalG(day.id)).toBe(49);
  });
});

describe("Same food? check", () => {
  it("pairs a protein-only log with a meal logged moments apart with similar protein, from either side", async () => {
    const day = await startDay();
    const proteinId = await logProtein(day.id, 49);
    const { eventId: mealId } = await logMeal(day.id, (await dinner()).id);

    const fromMeal = await getSameFoodCheck(day.id, { kind: "MEAL", id: mealId });
    expect(fromMeal).toMatchObject({ protein: { id: proteinId, grams: 49 }, meal: { id: mealId, name: "Dinner", proteinG: 50 } });
    expect(await getSameFoodCheck(day.id, { kind: "PROTEIN", id: proteinId })).toMatchObject({ meal: { id: mealId } });
  });

  it("stays quiet in normal logging: different protein, or the duplicate already deleted", async () => {
    const day = await startDay();
    await logProtein(day.id, 25);
    const { eventId: mealId } = await logMeal(day.id, (await dinner()).id);
    expect(await getSameFoodCheck(day.id, { kind: "MEAL", id: mealId })).toBeUndefined();

    const second = await logProtein(day.id, 50);
    await voidProteinLog(day.id, second);
    expect(await getSameFoodCheck(day.id, { kind: "MEAL", id: mealId })).toBeUndefined();
  });
});
