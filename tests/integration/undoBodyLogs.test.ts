import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  correctBodyweight,
  correctSleep,
  correctWater,
  logBodyweight,
  logSleep,
  logWater,
  startDay,
  voidBodyweightLog,
  voidSleepLog,
  voidWaterLog,
} from "../../src/application/commands";
import {
  getBodyweightEntries,
  getEffectiveHydrationTotal,
  getHydrationEntries,
  getLatestBodyweight,
  getLatestSleepMinutes,
  getMostRecentBodyweight,
  getSleepEntries,
  shouldSuggestEndDay,
} from "../../src/application/queries";
import { getBodyweightHistory } from "../../src/application/bodyTrendQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/**
 * UNDO-001 (owner approval 2026-10-04): UNDO for water, sleep and bodyweight
 * appends a *_LOG_VOIDED event. Nothing is erased; the undone entry leaves
 * every list and total, can't be corrected afterwards, and undoing twice is
 * a no-op.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("undo water", () => {
  it("leaves the entry out of the list, the total and the Day Ledger, and keeps both events", async () => {
    const day = await startDay();
    await logWater(day.id, 16);
    const mistake = await logWater(day.id, 500);

    await voidWaterLog(day.id, mistake);

    expect((await getHydrationEntries(day.id)).map((e) => e.effectiveAmountOz)).toEqual([16]);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(16);
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)?.waterOz).toBe(16);
    const types = (await db.events.where("beyondDayId").equals(day.id).toArray()).map((e) => e.type);
    expect(types.filter((t) => t === "WATER_LOGGED")).toHaveLength(2);
    expect(types.filter((t) => t === "WATER_LOG_VOIDED")).toHaveLength(1);
  });

  it("accepts a corrected entry's latest id, voids the whole chain, and refuses a later correction", async () => {
    const day = await startDay();
    const root = await logWater(day.id, 16);
    await correctWater(day.id, root, 20);
    const head = (await getHydrationEntries(day.id))[0]!.headEventId;

    await voidWaterLog(day.id, head);

    expect(await getEffectiveHydrationTotal(day.id)).toBe(0);
    const voided = (await db.events.where("type").equals("WATER_LOG_VOIDED").toArray())[0]!;
    expect((voided.payload as { loggedEventId: string }).loggedEventId).toBe(root);
    await expect(correctWater(day.id, head, 12)).rejects.toThrow(/LOG_VOIDED/);
  });

  it("undoing twice writes one void event", async () => {
    const day = await startDay();
    const id = await logWater(day.id, 8);
    await voidWaterLog(day.id, id);
    await voidWaterLog(day.id, id);
    expect(await db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);
  });

  it("refuses an id that isn't a water log", async () => {
    const day = await startDay();
    const sleep = await logSleep(day.id, 420);
    await expect(voidWaterLog(day.id, sleep)).rejects.toThrow(/LOG_NOT_FOUND/);
  });
});

describe("undo sleep", () => {
  it("removes the night from the reading, the ledger and the end-the-day suggestion", async () => {
    const day = await startDay();
    const id = await logSleep(day.id, 435, "PRIMARY");
    expect(await shouldSuggestEndDay(day.id)).toBe(true);

    await voidSleepLog(day.id, id);

    expect(await getSleepEntries(day.id)).toEqual([]);
    expect(await getLatestSleepMinutes(day.id)).toBeUndefined();
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)?.sleep).toEqual({});
    expect(await shouldSuggestEndDay(day.id)).toBe(false);
    await expect(correctSleep(day.id, id, 400)).rejects.toThrow(/LOG_VOIDED/);
  });
});

describe("undo bodyweight", () => {
  it("removes the weigh-in from today, the cross-day latest, and the weight trend", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 182);
    const mistake = await logBodyweight(day.id, 128);

    await voidBodyweightLog(day.id, mistake);

    expect((await getBodyweightEntries(day.id)).map((e) => e.effectiveWeightLbs)).toEqual([182]);
    expect(await getLatestBodyweight(day.id)).toBe(182);
    expect(await getMostRecentBodyweight()).toBe(182);
    expect((await getBodyweightHistory()).map((w) => w.weightLbs)).toEqual([182]);
    await expect(correctBodyweight(day.id, mistake, 181)).rejects.toThrow(/LOG_VOIDED/);
  });
});

describe("History", () => {
  it("names each undo in plain words", async () => {
    const day = await startDay();
    await voidWaterLog(day.id, await logWater(day.id, 8));
    await voidSleepLog(day.id, await logSleep(day.id, 420));
    await voidBodyweightLog(day.id, await logBodyweight(day.id, 180));
    const voids = (await db.events.toArray()).filter((e) => e.type.endsWith("_LOG_VOIDED"));
    expect(voids.map((e) => describeEvent(e)).sort()).toEqual(["Bodyweight log undone.", "Sleep log undone.", "Water log undone."]);
  });
});
