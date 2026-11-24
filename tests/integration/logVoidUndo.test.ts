import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: Dexie export()/import(), as persistence/backup.ts loads it.
import "dexie-export-import";
import {
  correctProtein, correctWater, logBodyweight, logEvent, logProtein, logSleep, logWater, startDay,
  voidBodyweightLog, voidProteinLog, voidSleepLog, voidWaterLog,
} from "../../src/application/commands";
import { createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { logMeasurement, voidMeasurement } from "../../src/application/measurementCommands";
import { getMeasurements } from "../../src/application/measurementQueries";
import {
  getEffectiveHydrationTotal, getMostRecentBodyweight, getProteinEntries, getSleepEntries,
} from "../../src/application/queries";
import { getBodyweightHistory } from "../../src/application/bodyTrendQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { findActiveLogVoid, putBackLogEntry, undoLogVoid } from "../../src/application/logVoidCommands";
import { correctLogEntry, getDayLogEntry } from "../../src/application/logEntries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/** GRAYSON-FIX-UNDO-001: a removed log put back is back everywhere; History keeps both. Invented data. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

const summary = async (id: string) => (await getDaySummaries()).find((s) => s.beyondDayId === id)!;

describe("remove, then put back", () => {
  it("water leaves the total and the Day Ledger, then comes back, with two corrections counted", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 20);
    await voidWaterLog(day.id, id);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(0);
    expect((await summary(day.id)).waterOz ?? 0).toBe(0);

    expect(await putBackLogEntry(id)).toBe("PUT_BACK");
    expect(await getEffectiveHydrationTotal(day.id)).toBe(20);
    expect((await summary(day.id)).waterOz).toBe(20);
    expect((await summary(day.id)).burden.corrections).toBe(2);
  });

  it("protein and a meal come back into the day's protein and calories", async () => {
    const day = await startDay();
    const protein = await logProtein(day.id, 30);
    const meal = await createSavedMeal({ name: "Chicken & rice", calories: 650, proteinG: 45, carbsG: 70, fatG: 12 });
    const logged = await logMeal(day.id, meal.id);
    await voidProteinLog(day.id, protein);
    await voidMealLog(day.id, logged.eventId);
    expect(await getProteinEntries(day.id)).toEqual([]);
    expect(await getMealEntries(day.id)).toEqual([]);
    expect((await summary(day.id)).kcal ?? 0).toBe(0);

    await putBackLogEntry(protein);
    await putBackLogEntry(logged.eventId);
    expect((await getProteinEntries(day.id)).map((p) => p.effectiveGrams)).toEqual([30]);
    expect((await getMealEntries(day.id)).map((m) => m.effectiveCalories)).toEqual([650]);
    expect((await summary(day.id)).kcal).toBe(650);
    expect((await summary(day.id)).proteinG).toBe(75);
    expect((await summary(day.id)).burden.corrections).toBe(4);
  });

  it("sleep, bodyweight and a measurement come back into the reading, the trend and the list", async () => {
    const day = await startDay();
    const sleep = await logSleep(day.id, 420);
    const weight = await logBodyweight(day.id, 182);
    const tape = await logMeasurement({ site: "WAIST", inches: 34, measuredOn: "2026-11-20" }, new Date("2026-11-24T12:00:00Z"));
    await voidSleepLog(day.id, sleep);
    await voidBodyweightLog(day.id, weight);
    await voidMeasurement(tape);
    expect(await getSleepEntries(day.id)).toEqual([]);
    expect(await getBodyweightHistory()).toEqual([]);
    expect(await getMostRecentBodyweight()).toBeUndefined();
    expect(await getMeasurements()).toEqual([]);

    for (const id of [sleep, weight, tape]) expect(await putBackLogEntry(id)).toBe("PUT_BACK");
    expect((await getSleepEntries(day.id)).length).toBe(1);
    expect((await summary(day.id)).sleep.primaryMinutes).toBe(420);
    expect((await getBodyweightHistory()).map((w) => w.weightLbs)).toEqual([182]);
    expect(await getMostRecentBodyweight()).toBe(182);
    expect((await getMeasurements()).map((m) => m.inches)).toEqual([34]);
    const undone = await db.events.where("type").equals("LOG_VOID_UNDONE").toArray();
    expect(undone.find((e) => (e.payload as { voidedType: string }).voidedType === "MEASUREMENT_LOG_VOIDED")?.beyondDayId).toBeUndefined();
  });
});

describe("rules", () => {
  it("putting back twice writes one put-back; removing again counts once", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 8);
    await voidWaterLog(day.id, id);
    const voidEvent = (await findActiveLogVoid(id))!;
    expect(await undoLogVoid(day.id, voidEvent.id)).toBe("PUT_BACK");
    expect(await undoLogVoid(day.id, voidEvent.id)).toBe("NO_OP");
    expect(await putBackLogEntry(id)).toBe("NO_OP");
    expect(await db.events.where("type").equals("LOG_VOID_UNDONE").count()).toBe(1);
    expect(await voidWaterLog(day.id, id)).toBe(true);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(0);
  });

  it("refuses a removal it can't find", async () => {
    const day = await startDay();
    await expect(undoLogVoid(day.id, "no-such-void")).rejects.toThrow(/LOG_VOID_NOT_FOUND/);
  });

  it("a put-back entry can be corrected again", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 16);
    await voidWaterLog(day.id, id);
    await putBackLogEntry(id);
    await correctWater(day.id, id, 12);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(12);
  });

  it("undo after a fix returns the old amount as a correction in the same chain", async () => {
    const day = await startDay();
    const id = await logProtein(day.id, 30);
    await correctProtein(day.id, id, 300);
    const fixed = (await getDayLogEntry(day.id, id))!;
    expect(fixed.grams).toBe(300);
    await correctLogEntry(fixed, { grams: 30 });
    expect((await getProteinEntries(day.id))[0]!.effectiveGrams).toBe(30);
    expect(await db.events.where("type").equals("PROTEIN_LOG_CORRECTED").count()).toBe(2);
  });

  it("History names the removal and the put-back", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 8);
    await voidWaterLog(day.id, id);
    await putBackLogEntry(id);
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(describeEvent(events.find((e) => e.type === "LOG_VOID_UNDONE")!)).toBe("Water log put back.");
  });
});

describe("Garmin sleep", () => {
  async function garminNight(dayId: string) {
    return logEvent(dayId, "SLEEP_LOGGED", { commandId: "g", durationMinutes: 400, kind: "PRIMARY", source: { kind: "GARMIN", recordKey: "k1", sourceVersion: "1" } }, "SYSTEM", "g");
  }

  it("a put-back own sleep still replaces Garmin's night, as when it was first logged", async () => {
    const day = await startDay();
    await garminNight(day.id);
    const own = await logSleep(day.id, 450);
    await voidSleepLog(day.id, own);
    // Garmin's night stays aside after the owner's removal, as before this change.
    expect((await getSleepEntries(day.id)).length).toBe(0);
    await putBackLogEntry(own);
    const entries = await getSleepEntries(day.id);
    expect(entries).toHaveLength(1);
    expect((await summary(day.id)).sleep.primaryMinutes).toBe(450);
  });

  it("Garmin's own step-aside can't be put back by hand", async () => {
    const day = await startDay();
    const garmin = await garminNight(day.id);
    await logSleep(day.id, 450);
    const systemVoid = (await db.events.where("type").equals("SLEEP_LOG_VOIDED").toArray())[0]!;
    expect(systemVoid.source).toBe("SYSTEM");
    await expect(undoLogVoid(day.id, systemVoid.id)).rejects.toThrow(/SYSTEM_REMOVAL/);
    expect(await putBackLogEntry(garmin)).toBe("NO_OP");
  });
});

describe("backup", () => {
  it("a native backup round trip keeps every removal and put-back", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 20);
    await voidWaterLog(day.id, id);
    await putBackLogEntry(id);
    const blob = await db.export({ prettyJson: true });
    await logWater(day.id, 5);
    await db.import(new File([blob], "native-backup.json", { type: "application/json" }), { clearTablesBeforeImport: true });
    expect(await db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);
    expect(await db.events.where("type").equals("LOG_VOID_UNDONE").count()).toBe(1);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(20);
  });
});
