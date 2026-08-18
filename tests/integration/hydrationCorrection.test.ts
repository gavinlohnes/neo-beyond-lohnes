import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { correctWater, logWater, startDay } from "../../src/application/commands";
import {
  getEffectiveHydrationTotal,
  getHydrationEntries,
} from "../../src/application/queries";
import type { DomainEvent, WaterLogCorrectedPayload } from "../../src/domain/common/types";

/**
 * V0.2 correction/supersession doctrine (DECISION REGISTER, "V0.2 —
 * CORRECTION SEMANTICS") proven first on hydration, and reproduced here
 * against the exact proven Android acceptance example: 13oz corrected to
 * an effective 17oz, with the original fact preserved in history.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("hydration correction chain", () => {
  it("a fresh log has no correction and effective == original", async () => {
    const day = await startDay();
    await logWater(day.id, 13);

    const entries = await getHydrationEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.originalAmountOz).toBe(13);
    expect(entries[0]!.effectiveAmountOz).toBe(13);
    expect(entries[0]!.correctionCount).toBe(0);
  });

  it("reproduces the proven Android example: 13oz corrected to effective 17oz, original preserved", async () => {
    const day = await startDay();
    await logWater(day.id, 13);
    const [logged] = await getHydrationEntries(day.id);
    await correctWater(day.id, logged!.headEventId, 17);

    const entries = await getHydrationEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.originalAmountOz).toBe(13);
    expect(entries[0]!.effectiveAmountOz).toBe(17);
    expect(entries[0]!.correctionCount).toBe(1);

    // The original WATER_LOGGED fact is never edited or deleted.
    const rawLogged = await db.events.get(logged!.rootEventId);
    expect(rawLogged).toBeDefined();
    expect(rawLogged!.type).toBe("WATER_LOGGED");
    expect((rawLogged!.payload as { amountOz: number }).amountOz).toBe(13);

    expect(await getEffectiveHydrationTotal(day.id)).toBe(17);
  });

  it("a second correction chains onto the first; originalEventId stays pinned to the true root", async () => {
    const day = await startDay();
    await logWater(day.id, 13);
    const [first] = await getHydrationEntries(day.id);
    await correctWater(day.id, first!.headEventId, 17);
    const [afterFirst] = await getHydrationEntries(day.id);
    await correctWater(day.id, afterFirst!.headEventId, 20);

    const entries = await getHydrationEntries(day.id);
    expect(entries[0]!.originalAmountOz).toBe(13);
    expect(entries[0]!.effectiveAmountOz).toBe(20);
    expect(entries[0]!.correctionCount).toBe(2);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(20);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const corrections = events.filter(
      (e): e is DomainEvent<WaterLogCorrectedPayload> => e.type === "WATER_LOG_CORRECTED",
    );
    expect(corrections).toHaveLength(2);
    for (const c of corrections) {
      expect(c.payload.originalEventId).toBe(first!.rootEventId);
    }
  });

  it("rejects correcting a stale (already-superseded) target instead of forking the chain", async () => {
    const day = await startDay();
    await logWater(day.id, 13);
    const [entry] = await getHydrationEntries(day.id);
    await correctWater(day.id, entry!.headEventId, 17);

    await expect(correctWater(day.id, entry!.headEventId, 25)).rejects.toThrow(
      /STALE_CORRECTION_TARGET/,
    );

    // No forked/extra event was created by the rejected attempt.
    const corrections = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "WATER_LOG_CORRECTED",
    );
    expect(corrections).toHaveLength(1);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(17);
  });

  it("rejects a no-op correction (new value equals current effective value)", async () => {
    const day = await startDay();
    await logWater(day.id, 13);
    const [entry] = await getHydrationEntries(day.id);

    await expect(correctWater(day.id, entry!.headEventId, 13)).rejects.toThrow(/NO_OP_CORRECTION/);

    const corrections = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "WATER_LOG_CORRECTED",
    );
    expect(corrections).toHaveLength(0);
  });

  it("rejects correcting a nonexistent event id", async () => {
    const day = await startDay();
    await logWater(day.id, 13);

    await expect(correctWater(day.id, "does-not-exist", 20)).rejects.toThrow(
      /CORRECTION_TARGET_NOT_FOUND/,
    );
  });

  it("effective total sums each independent entry's HEAD value, not every raw log", async () => {
    const day = await startDay();
    await logWater(day.id, 10);
    await logWater(day.id, 8);
    const entries = await getHydrationEntries(day.id);
    const first = entries.find((e) => e.originalAmountOz === 10)!;
    await correctWater(day.id, first.headEventId, 15);

    // Effective total = 15 (corrected) + 8 (uncorrected) = 23, never
    // 10 + 8 + 15 = 33 (which would double-count the superseded fact).
    expect(await getEffectiveHydrationTotal(day.id)).toBe(23);
  });
});
