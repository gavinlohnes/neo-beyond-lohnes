import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  correctBodyweight,
  correctProtein,
  correctSleep,
  logBodyweight,
  logProtein,
  logSleep,
  startDay,
} from "../../src/application/commands";
import {
  getBodyweightEntries,
  getLatestBodyweight,
  getLatestSleepMinutes,
  getProteinEntries,
  getSleepEntries,
  getTotalProteinGrams,
} from "../../src/application/queries";

/**
 * Phase 5 (BODY logging): sleep/protein/bodyweight gained the same
 * correction-chain doctrine already proven on hydration (V0.2 CORRECTION
 * SEMANTICS) — same rules, same guarantees, verified independently here
 * rather than assumed from the shared implementation alone.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("sleep correction chain", () => {
  it("a fresh log has no correction and effective == original", async () => {
    const day = await startDay();
    await logSleep(day.id, 400);

    const entries = await getSleepEntries(day.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.originalDurationMinutes).toBe(400);
    expect(entries[0]!.effectiveDurationMinutes).toBe(400);
    expect(entries[0]!.correctionCount).toBe(0);
    expect(entries[0]!.kind).toBe("PRIMARY");
  });

  it("corrects a typo without touching the original fact", async () => {
    const day = await startDay();
    await logSleep(day.id, 400, "PRIMARY");
    const [logged] = await getSleepEntries(day.id);
    await correctSleep(day.id, logged!.headEventId, 420);

    const entries = await getSleepEntries(day.id);
    expect(entries[0]!.originalDurationMinutes).toBe(400);
    expect(entries[0]!.effectiveDurationMinutes).toBe(420);
    expect(entries[0]!.correctionCount).toBe(1);
    expect(entries[0]!.kind).toBe("PRIMARY");

    const rawLogged = await db.events.get(logged!.rootEventId);
    expect((rawLogged!.payload as { durationMinutes: number }).durationMinutes).toBe(400);
    expect(await getLatestSleepMinutes(day.id)).toBe(420);
  });

  it("preserves kind (SUPPLEMENTAL) across a correction — correcting fixes duration, not kind", async () => {
    const day = await startDay();
    await logSleep(day.id, 30, "SUPPLEMENTAL");
    const [logged] = await getSleepEntries(day.id);
    await correctSleep(day.id, logged!.headEventId, 45);

    const entries = await getSleepEntries(day.id);
    expect(entries[0]!.effectiveDurationMinutes).toBe(45);
    expect(entries[0]!.kind).toBe("SUPPLEMENTAL");
  });

  it("rejects correcting a stale (already-superseded) target", async () => {
    const day = await startDay();
    await logSleep(day.id, 400);
    const [entry] = await getSleepEntries(day.id);
    await correctSleep(day.id, entry!.headEventId, 420);

    await expect(correctSleep(day.id, entry!.headEventId, 450)).rejects.toThrow(/STALE_CORRECTION_TARGET/);
  });

  it("rejects a no-op correction", async () => {
    const day = await startDay();
    await logSleep(day.id, 400);
    const [entry] = await getSleepEntries(day.id);

    await expect(correctSleep(day.id, entry!.headEventId, 400)).rejects.toThrow(/NO_OP_CORRECTION/);
  });

  it("rejects correcting a nonexistent event id", async () => {
    const day = await startDay();
    await logSleep(day.id, 400);

    await expect(correctSleep(day.id, "does-not-exist", 420)).rejects.toThrow(/CORRECTION_TARGET_NOT_FOUND/);
  });
});

describe("bodyweight correction chain", () => {
  it("a fresh log has no correction and effective == original", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 180);

    const entries = await getBodyweightEntries(day.id);
    expect(entries[0]!.originalWeightLbs).toBe(180);
    expect(entries[0]!.effectiveWeightLbs).toBe(180);
    expect(entries[0]!.correctionCount).toBe(0);
  });

  it("corrects a typo, original fact preserved, getLatestBodyweight reflects the correction", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 180);
    const [logged] = await getBodyweightEntries(day.id);
    await correctBodyweight(day.id, logged!.headEventId, 182);

    const entries = await getBodyweightEntries(day.id);
    expect(entries[0]!.originalWeightLbs).toBe(180);
    expect(entries[0]!.effectiveWeightLbs).toBe(182);

    const rawLogged = await db.events.get(logged!.rootEventId);
    expect((rawLogged!.payload as { weightLbs: number }).weightLbs).toBe(180);
    expect(await getLatestBodyweight(day.id)).toBe(182);
  });

  it("a second correction chains onto the first; originalEventId stays pinned to the true root", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 180);
    const [first] = await getBodyweightEntries(day.id);
    await correctBodyweight(day.id, first!.headEventId, 182);
    const [afterFirst] = await getBodyweightEntries(day.id);
    await correctBodyweight(day.id, afterFirst!.headEventId, 179);

    const entries = await getBodyweightEntries(day.id);
    expect(entries[0]!.effectiveWeightLbs).toBe(179);
    expect(entries[0]!.correctionCount).toBe(2);

    const corrections = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "BODYWEIGHT_LOG_CORRECTED",
    );
    for (const c of corrections) {
      expect((c.payload as { originalEventId: string }).originalEventId).toBe(first!.rootEventId);
    }
  });

  it("rejects correcting a stale target and a no-op correction", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 180);
    const [entry] = await getBodyweightEntries(day.id);
    await correctBodyweight(day.id, entry!.headEventId, 182);

    await expect(correctBodyweight(day.id, entry!.headEventId, 175)).rejects.toThrow(
      /STALE_CORRECTION_TARGET/,
    );
    await expect(correctBodyweight(day.id, "does-not-exist", 175)).rejects.toThrow(
      /CORRECTION_TARGET_NOT_FOUND/,
    );
  });
});

describe("protein correction chain", () => {
  it("a fresh log has no correction and effective == original", async () => {
    const day = await startDay();
    await logProtein(day.id, 30);

    const entries = await getProteinEntries(day.id);
    expect(entries[0]!.originalGrams).toBe(30);
    expect(entries[0]!.effectiveGrams).toBe(30);
    expect(entries[0]!.correctionCount).toBe(0);
  });

  it("corrects a typo, original fact preserved", async () => {
    const day = await startDay();
    await logProtein(day.id, 30);
    const [logged] = await getProteinEntries(day.id);
    await correctProtein(day.id, logged!.headEventId, 35);

    const entries = await getProteinEntries(day.id);
    expect(entries[0]!.originalGrams).toBe(30);
    expect(entries[0]!.effectiveGrams).toBe(35);

    const rawLogged = await db.events.get(logged!.rootEventId);
    expect((rawLogged!.payload as { grams: number }).grams).toBe(30);
  });

  it("rejects a no-op correction and a stale target", async () => {
    const day = await startDay();
    await logProtein(day.id, 30);
    const [entry] = await getProteinEntries(day.id);

    await expect(correctProtein(day.id, entry!.headEventId, 30)).rejects.toThrow(/NO_OP_CORRECTION/);

    await correctProtein(day.id, entry!.headEventId, 35);
    await expect(correctProtein(day.id, entry!.headEventId, 40)).rejects.toThrow(/STALE_CORRECTION_TARGET/);
  });

  it("effective total sums each independent entry's HEAD value, not every raw log (same as hydration)", async () => {
    const day = await startDay();
    await logProtein(day.id, 20);
    await logProtein(day.id, 15);
    const entries = await getProteinEntries(day.id);
    const first = entries.find((e) => e.originalGrams === 20)!;
    await correctProtein(day.id, first.headEventId, 25);

    // Effective total = 25 (corrected) + 15 (uncorrected) = 40, never
    // 20 + 15 + 25 = 60 (which would double-count the superseded fact).
    expect(await getTotalProteinGrams(day.id)).toBe(40);
  });
});
