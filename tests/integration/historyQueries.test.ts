import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  vi.useRealTimers(); // safety net in case a fake-timer test below throws before restoring them
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

  /**
   * Leverage Implementation 001 (deterministic ordering hardening,
   * 2026-08-22): getHistoryDays's per-day event sort used to compare raw
   * `occurredAt` strings only — the test above works around that with a
   * manual 5ms delay specifically because a genuine same-millisecond
   * collision made ordering ambiguous. DomainEvent carries `seq`, so this
   * now resolves deterministically by real call order without needing an
   * artificial delay at all.
   */
  it("orders two events logged in the exact same millisecond by real call order, with no artificial delay needed", async () => {
    const day = await startDay();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));

    await logWater(day.id, 8);
    await logWater(day.id, 12);

    vi.useRealTimers();

    const history = await getHistoryDays();
    const waterEvents = history[0]!.events.filter((e) => e.type === "WATER_LOGGED");
    expect(waterEvents).toHaveLength(2);
    expect(waterEvents[0]!.occurredAt).toBe(waterEvents[1]!.occurredAt); // genuine tie, not a flaky near-miss
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
