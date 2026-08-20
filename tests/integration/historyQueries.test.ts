import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logWater, startDay } from "../../src/application/commands";
import { getHistoryDays } from "../../src/application/historyQueries";

/**
 * Priority 1 (HISTORY screen): pure read reconstruction of every
 * BeyondDay and its events — no new tables, no mutation.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getHistoryDays", () => {
  it("is empty before any day has ever started", async () => {
    expect(await getHistoryDays()).toEqual([]);
  });

  it("includes a started day with its DAY_STARTED event", async () => {
    const day = await startDay();
    const history = await getHistoryDays();
    expect(history).toHaveLength(1);
    expect(history[0]!.day.id).toBe(day.id);
    expect(history[0]!.events.some((e) => e.type === "DAY_STARTED")).toBe(true);
  });

  it("orders days most-recent-first", async () => {
    const first = await startDay();
    await endDay(first.id);
    const second = await startDay();

    const history = await getHistoryDays();
    expect(history).toHaveLength(2);
    expect(history[0]!.day.id).toBe(second.id);
    expect(history[1]!.day.id).toBe(first.id);
  });

  it("orders events within a day chronologically (oldest first)", async () => {
    const day = await startDay();
    await logWater(day.id, 8);
    // occurredAt has millisecond resolution — without a gap, two calls in
    // the same test tick can collide and make ordering ambiguous (not a
    // bug in getHistoryDays; the same class of timing artifact already
    // documented elsewhere in this suite).
    await new Promise((resolve) => setTimeout(resolve, 5));
    await logWater(day.id, 12);

    const history = await getHistoryDays();
    const waterEvents = history[0]!.events.filter((e) => e.type === "WATER_LOGGED");
    expect(waterEvents).toHaveLength(2);
    expect((waterEvents[0]!.payload as { amountOz: number }).amountOz).toBe(8);
    expect((waterEvents[1]!.payload as { amountOz: number }).amountOz).toBe(12);
  });

  it("scopes events correctly per day, no cross-contamination", async () => {
    const first = await startDay();
    await logWater(first.id, 8);
    await endDay(first.id);
    const second = await startDay();
    await logWater(second.id, 20);

    const history = await getHistoryDays();
    const secondDayEntry = history.find((h) => h.day.id === second.id)!;
    const firstDayEntry = history.find((h) => h.day.id === first.id)!;
    expect(secondDayEntry.events.filter((e) => e.type === "WATER_LOGGED")).toHaveLength(1);
    expect(firstDayEntry.events.filter((e) => e.type === "WATER_LOGGED")).toHaveLength(1);
  });
});
