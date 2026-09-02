import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import { db } from "../../src/persistence/db";
import { correctWater, logWater, startDay } from "../../src/application/commands";
import { getEffectiveHydrationTotal, getHydrationEntries } from "../../src/application/queries";

/**
 * fast-check (dev-only, added 2026-09-02 — see docs/agent/CAPABILITY_MAP.md's
 * GENERAL DEPENDENCY/TEST TOOLING entry). hydrationCorrection.test.ts already
 * proves the correction-chain contract against specific hand-picked examples
 * (13oz -> 17oz, a second correction chaining on). This generalizes the same
 * contract across many random chain lengths and amounts instead of a few
 * fixed ones — the two invariants the correction-chain doctrine actually
 * promises, checked the same way regardless of how the chain got there:
 *
 *   1. effective amount == the last correction's amount (or the original,
 *      if no correction was ever made) — never a sum, never a stale value.
 *   2. the original WATER_LOGGED fact is never mutated, however many
 *      corrections chain onto it.
 *
 * A property failure prints its own minimal counterexample chain (fast-
 * check's shrinking), which is real debugging value a fixed-example test
 * can't offer for a chain-length-dependent bug.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("hydration correction chain (property-based)", () => {
  it("effective amount always equals the last correction in the chain, whatever the chain looks like", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 200 }),
        fc.array(fc.integer({ min: 1, max: 200 }), { minLength: 0, maxLength: 8 }),
        async (initialAmountOz, correctionAmounts) => {
          const day = await startDay();
          await logWater(day.id, initialAmountOz);
          let [entry] = await getHydrationEntries(day.id);
          const rootEventId = entry!.rootEventId;

          // correctWater rejects a correction that matches the current
          // effective value (NO_OP_CORRECTION) — skip any generated amount
          // that would collide with the running head, same constraint a
          // real operator is already held to.
          let currentAmount = initialAmountOz;
          let appliedCorrections = 0;
          for (const amount of correctionAmounts) {
            if (amount === currentAmount) continue;
            await correctWater(day.id, entry!.headEventId, amount);
            currentAmount = amount;
            appliedCorrections += 1;
            [entry] = await getHydrationEntries(day.id);
          }

          expect(entry!.effectiveAmountOz).toBe(currentAmount);
          expect(entry!.correctionCount).toBe(appliedCorrections);
          expect(entry!.originalAmountOz).toBe(initialAmountOz);
          expect(await getEffectiveHydrationTotal(day.id)).toBe(currentAmount);

          // The original fact is never mutated, however long the chain got.
          const rawLogged = await db.events.get(rootEventId);
          expect((rawLogged!.payload as { amountOz: number }).amountOz).toBe(initialAmountOz);

          // Clean slate for the next generated case in this same run.
          await db.beyondDays.clear();
          await db.events.clear();
        },
      ),
      { numRuns: 25 },
    );
  });
});
