import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { logBodyweight, logProtein, startDay } from "../../src/application/commands";
import { getLatestBodyweight, getTotalProteinGrams } from "../../src/application/queries";

/**
 * BODY & Backup Decisions (2026-08-19, locked): protein logging has no
 * daily target, just logs the amount — explicitly not carrying over the
 * legacy mockup's 165g+ target. Bodyweight (Context & Safety Decisions,
 * 2026-08-19) is added to BODY scope this checkpoint as a fact only — its
 * goal/target aspect is explicitly BLOCKED (see completion report), so
 * only logging is implemented here.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("bodyweight logging (fact only, no goal)", () => {
  it("logs a bodyweight fact as an event", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 210);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const logged = events.find((e) => e.type === "BODYWEIGHT_LOGGED");
    expect(logged).toBeDefined();
    expect((logged!.payload as { weightLbs: number }).weightLbs).toBe(210);
  });

  it("getLatestBodyweight returns the most recently logged value", async () => {
    const day = await startDay();
    expect(await getLatestBodyweight(day.id)).toBeUndefined();

    await logBodyweight(day.id, 210);
    expect(await getLatestBodyweight(day.id)).toBe(210);

    await logBodyweight(day.id, 208.5);
    expect(await getLatestBodyweight(day.id)).toBe(208.5);
  });
});

describe("protein logging (amount only, no target)", () => {
  it("logs a protein fact as an event", async () => {
    const day = await startDay();
    await logProtein(day.id, 40);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const logged = events.find((e) => e.type === "PROTEIN_LOGGED");
    expect(logged).toBeDefined();
    expect((logged!.payload as { grams: number }).grams).toBe(40);
  });

  it("getTotalProteinGrams sums every entry for the day, with no target/goal semantics", async () => {
    const day = await startDay();
    expect(await getTotalProteinGrams(day.id)).toBe(0);

    await logProtein(day.id, 30);
    await logProtein(day.id, 25);
    expect(await getTotalProteinGrams(day.id)).toBe(55);
  });
});
