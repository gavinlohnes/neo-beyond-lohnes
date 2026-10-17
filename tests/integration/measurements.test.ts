import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { correctMeasurement, logMeasurement, voidMeasurement } from "../../src/application/measurementCommands";
import { getLatestMeasurements, getMeasurements } from "../../src/application/measurementQueries";

/**
 * REVIEW-001 Phase 1a: body measurements are BODY log facts — logged with
 * the date they were taken (earlier dates allowed, later ones refused),
 * corrected by chain, removed by a void event, never erased.
 */

const NOW = new Date(2026, 9, 17, 12);

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.close();
});

describe("logMeasurement", () => {
  it("records a measurement without needing a started day, including an earlier date", async () => {
    expect(await db.beyondDays.count()).toBe(0);
    await logMeasurement({ site: "WAIST", inches: 38.5, measuredOn: "2026-09-01" }, NOW);
    const [entry] = await getMeasurements();
    expect(entry).toMatchObject({ site: "WAIST", inches: 38.5, measuredOn: "2026-09-01", correctionCount: 0 });
    const [event] = await db.events.where("type").equals("MEASUREMENT_LOGGED").toArray();
    expect(event!.beyondDayId).toBeUndefined();
    expect(event!.seq).toBeGreaterThan(0);
  });

  it("refuses a future date, an impossible date, a bad site and out-of-range values, writing nothing", async () => {
    await expect(logMeasurement({ site: "WAIST", inches: 38, measuredOn: "2026-10-18" }, NOW)).rejects.toThrow(/^MEASUREMENT_IN_FUTURE:/);
    await expect(logMeasurement({ site: "WAIST", inches: 38, measuredOn: "2026-02-30" }, NOW)).rejects.toThrow();
    await expect(logMeasurement({ site: "NECK" as never, inches: 15, measuredOn: "2026-10-01" }, NOW)).rejects.toThrow();
    await expect(logMeasurement({ site: "WAIST", inches: 2, measuredOn: "2026-10-01" }, NOW)).rejects.toThrow();
    await expect(logMeasurement({ site: "WAIST", inches: 101, measuredOn: "2026-10-01" }, NOW)).rejects.toThrow();
    await expect(logMeasurement({ site: "WAIST", inches: Number.NaN, measuredOn: "2026-10-01" }, NOW)).rejects.toThrow();
    expect(await db.events.count()).toBe(0);
  });
});

describe("correctMeasurement", () => {
  it("corrects value and date by chain, keeping the original", async () => {
    const root = await logMeasurement({ site: "CHEST", inches: 44, measuredOn: "2026-10-10" }, NOW);
    const first = await correctMeasurement(root, { inches: 43.5 }, NOW);
    await correctMeasurement(first, { measuredOn: "2026-10-09" }, NOW);
    const [entry] = await getMeasurements();
    expect(entry).toMatchObject({
      rootEventId: root,
      inches: 43.5,
      measuredOn: "2026-10-09",
      originalInches: 44,
      originalMeasuredOn: "2026-10-10",
      correctionCount: 2,
    });
    expect(await db.events.where("type").equals("MEASUREMENT_LOGGED").count()).toBe(1);
  });

  it("refuses a stale target, a no-op, a future date and a removed entry", async () => {
    const root = await logMeasurement({ site: "ARMS", inches: 15, measuredOn: "2026-10-10" }, NOW);
    const head = await correctMeasurement(root, { inches: 15.25 }, NOW);
    await expect(correctMeasurement(root, { inches: 16 }, NOW)).rejects.toThrow(/^STALE_CORRECTION_TARGET:/);
    await expect(correctMeasurement(head, { inches: 15.25 }, NOW)).rejects.toThrow(/^NO_OP_CORRECTION:/);
    await expect(correctMeasurement(head, { measuredOn: "2026-11-01" }, NOW)).rejects.toThrow(/^MEASUREMENT_IN_FUTURE:/);
    await expect(correctMeasurement(head, {}, NOW)).rejects.toThrow();
    await voidMeasurement(head);
    await expect(correctMeasurement(head, { inches: 14 }, NOW)).rejects.toThrow(/^MEASUREMENT_VOIDED:/);
    await expect(correctMeasurement("missing", { inches: 14 }, NOW)).rejects.toThrow(/^MEASUREMENT_NOT_FOUND:/);
  });
});

describe("voidMeasurement", () => {
  it("removes the whole chain from readings but erases nothing; repeating is a no-op", async () => {
    const kept = await logMeasurement({ site: "WAIST", inches: 39, measuredOn: "2026-10-01" }, NOW);
    const removed = await logMeasurement({ site: "WAIST", inches: 93, measuredOn: "2026-10-02" }, NOW);
    const corrected = await correctMeasurement(removed, { inches: 39.5 }, NOW);
    await voidMeasurement(corrected);
    await voidMeasurement(removed);
    expect((await getMeasurements()).map((m) => m.rootEventId)).toEqual([kept]);
    expect(await db.events.where("type").equals("MEASUREMENT_LOG_VOIDED").count()).toBe(1);
    expect(await db.events.where("type").anyOf("MEASUREMENT_LOGGED", "MEASUREMENT_LOG_CORRECTED").count()).toBe(3);
  });
});

describe("readings", () => {
  it("orders by measurement date (same date in logged order), filters by site, and finds each site's latest", async () => {
    const late = await logMeasurement({ site: "WAIST", inches: 37, measuredOn: "2026-10-15" }, NOW);
    const early = await logMeasurement({ site: "WAIST", inches: 39, measuredOn: "2026-08-01" }, NOW);
    const sameDayA = await logMeasurement({ site: "HIPS", inches: 41, measuredOn: "2026-10-15" }, NOW);
    const sameDayB = await logMeasurement({ site: "WAIST", inches: 36.9, measuredOn: "2026-10-15" }, NOW);
    expect((await getMeasurements()).map((m) => m.rootEventId)).toEqual([early, late, sameDayA, sameDayB]);
    expect((await getMeasurements("HIPS")).map((m) => m.rootEventId)).toEqual([sameDayA]);
    const latest = await getLatestMeasurements();
    expect(latest.WAIST?.rootEventId).toBe(sameDayB);
    expect(latest.HIPS?.inches).toBe(41);
    expect(latest.CHEST).toBeUndefined();
  });
});
