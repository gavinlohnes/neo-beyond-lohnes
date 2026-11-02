import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { logBodyweight, logSleep, logWater, startDay } from "../../src/application/commands";
import { getBodyweightEntries, getHydrationEntries, getSleepEntries } from "../../src/application/queries";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { interpret } from "../../src/application/helper/freeHelper";
import { confirmProposal, describeProposal } from "../../src/application/alfred/alfredActions";

/** CORRECTIONS-001: plain corrections change today's latest log through its correction chain. Invented data. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("'that was 12 oz not 16' corrects the latest water; history is kept", async () => {
  const day = await startDay();
  await logWater(day.id, 16);
  const [card] = interpret("that was 12 oz, not 16", await readHelperContext()).cards;
  expect(describeProposal(card!)).toBe("Change last water: 16 → 12 oz");
  await confirmProposal(card!);
  const [entry] = await getHydrationEntries(day.id);
  expect(entry).toMatchObject({ originalAmountOz: 16, effectiveAmountOz: 12, correctionCount: 1 });
});

it("sleep and weight, and a named old value must match", async () => {
  const day = await startDay();
  await logSleep(day.id, 360); await logBodyweight(day.id, 212);
  const ctx = await readHelperContext();
  const sleep = interpret("sleep was 7 hours not 6", ctx).cards[0]!;
  expect(describeProposal(sleep)).toBe("Change last sleep: 6h 00m → 7h 00m");
  const weight = interpret("my weight should be 210", ctx).cards[0]!;
  expect(describeProposal(weight)).toBe("Change last weight: 212 → 210 lbs");
  expect(interpret("that was 12 oz not 20", ctx).cards).toEqual([]); // no water logged; and 20 wouldn't match
  await confirmProposal(sleep); await confirmProposal(weight);
  expect((await getSleepEntries(day.id))[0]!.effectiveDurationMinutes).toBe(420);
  expect((await getBodyweightEntries(day.id))[0]!.effectiveWeightLbs).toBe(210);
});

it("a correction proposed twice can't land twice (the chain refuses a stale target)", async () => {
  const day = await startDay();
  await logWater(day.id, 16);
  const ctx = await readHelperContext();
  const card = interpret("make that 12 oz water", ctx).cards[0]!;
  await confirmProposal(card);
  await expect(confirmProposal(card)).rejects.toThrow(/STALE_CORRECTION_TARGET/);
});

it("a correction inside a longer message drops nothing: the whole message goes on (review of #388)", async () => {
  const day = await startDay();
  await logWater(day.id, 16);
  const ctx = await readHelperContext();
  expect(interpret("that was 12 oz not 16, and 8 oz water", ctx)).toEqual({ cards: [], unknown: ["that was 12 oz not 16, and 8 oz water"] });
  expect(interpret("actually drank 24 oz water", ctx).cards.some((c) => c.kind === "correct_log")).toBe(false); // a new drink, never a correction
});
