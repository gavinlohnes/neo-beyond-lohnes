import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import {
  declineRecommendation,
  endDay,
  rateOutcome,
  recordRecommendation,
  startDay,
  submitCheckIn,
} from "../../src/application/commands";
import { getRecommendationLedger } from "../../src/application/reviewQueries";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * REVIEW 0.1 / Recommendation Ledger. Proves the join is by Recommendation
 * identity (never BeyondDay co-location), preserves ACCEPTED/DECLINED/
 * NO_ACTION_RECORDED/undefined and GOOD/NEUTRAL/BAD/undefined exactly,
 * survives END DAY and a later active day, and is fully deterministic —
 * same discipline as tests/integration/priorOutcomeMemory.test.ts and
 * outcomeRating.test.ts, generalized from "one match" to "every entry."
 */

const GREEN: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 4,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};
const RED = { ...GREEN, energy: 1 as const };
const YELLOW = { ...GREEN, energy: 2 as const }; // -> RECOVER (an ACTION kind, unlike GREEN's NO_ACTION_REQUIRED with no planned work)

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

function findEntry(days: Awaited<ReturnType<typeof getRecommendationLedger>>, recommendationId: string) {
  for (const { entries } of days) {
    const found = entries.find((e) => e.recommendation.id === recommendationId);
    if (found) return found;
  }
  return undefined;
}

describe("getRecommendationLedger", () => {
  it("joins multiple recommendations issued on one BeyondDay, each to its own decision/rating", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    await rateOutcome(day.id, first.recommendation.id, "GOOD");
    const second = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, second.recommendation);
    // second is deliberately left unrated.

    const ledger = await getRecommendationLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.day.id).toBe(day.id);
    expect(ledger[0]!.entries).toHaveLength(2);

    const firstEntry = findEntry(ledger, first.recommendation.id);
    expect(firstEntry).toMatchObject({ decision: "NO_ACTION_RECORDED", rating: "GOOD" });

    const secondEntry = findEntry(ledger, second.recommendation.id);
    expect(secondEntry?.decision).toBe("NO_ACTION_RECORDED");
    expect(secondEntry?.rating).toBeUndefined();
  });

  it("keeps cross-day recommendations correctly joined to their own originating day", async () => {
    const priorDay = await startDay();
    const prior = await submitCheckIn(priorDay.id, GREEN);
    await recordRecommendation(priorDay.id, prior.recommendation);
    const currentDay = await startDay();
    const current = await submitCheckIn(currentDay.id, GREEN);
    await recordRecommendation(currentDay.id, current.recommendation);
    // Rated on the *current* day, for a recommendation issued on the *prior* day.
    await rateOutcome(prior.recommendation.beyondDayId, prior.recommendation.id, "BAD");

    const ledger = await getRecommendationLedger();
    const priorDayGroup = ledger.find((d) => d.day.id === priorDay.id);
    const currentDayGroup = ledger.find((d) => d.day.id === currentDay.id);

    expect(priorDayGroup?.entries.map((e) => e.recommendation.id)).toEqual([prior.recommendation.id]);
    expect(priorDayGroup?.entries[0]?.rating).toBe("BAD");
    expect(currentDayGroup?.entries.map((e) => e.recommendation.id)).toEqual([current.recommendation.id]);
    // The rating recorded while `currentDay` was active must never leak onto current's own entry.
    expect(currentDayGroup?.entries[0]?.rating).toBeUndefined();
  });

  it("displays ACCEPTED, DECLINED, and NO ACTION RECORDED faithfully, and undefined when never decided", async () => {
    const day = await startDay();

    const accepted = await submitCheckIn(day.id, YELLOW); // -> RECOVER, an ACTION kind
    expect(accepted.recommendation.kind).toBe("RECOVER");
    await recordRecommendation(day.id, accepted.recommendation);

    const undecided = await submitCheckIn(day.id, GREEN); // never recorded or declined at all

    const declined = await submitCheckIn(day.id, RED); // RED -> STABILIZE
    expect(declined.recommendation.kind).toBe("STABILIZE");
    await declineRecommendation(day.id, declined.recommendation, { overrideConfirmed: true });

    const ledger = await getRecommendationLedger();
    expect(findEntry(ledger, accepted.recommendation.id)?.decision).toBe("ACCEPTED");
    expect(findEntry(ledger, undecided.recommendation.id)?.decision).toBeUndefined();
    expect(findEntry(ledger, declined.recommendation.id)?.decision).toBe("DECLINED");
  });

  it("displays GOOD, NEUTRAL, and BAD faithfully, and keeps 'no rating yet' visibly distinct from BAD", async () => {
    const day = await startDay();
    const good = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, good.recommendation);
    await rateOutcome(day.id, good.recommendation.id, "GOOD");
    const neutral = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, neutral.recommendation);
    await rateOutcome(day.id, neutral.recommendation.id, "NEUTRAL");
    const bad = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, bad.recommendation);
    await rateOutcome(day.id, bad.recommendation.id, "BAD");
    const unrated = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, unrated.recommendation);

    const ledger = await getRecommendationLedger();
    expect(findEntry(ledger, good.recommendation.id)?.rating).toBe("GOOD");
    expect(findEntry(ledger, neutral.recommendation.id)?.rating).toBe("NEUTRAL");
    expect(findEntry(ledger, bad.recommendation.id)?.rating).toBe("BAD");
    const unratedEntry = findEntry(ledger, unrated.recommendation.id);
    expect(unratedEntry?.rating).toBeUndefined();
    expect(unratedEntry?.rating).not.toBe("BAD");
  });

  it("joins Outcome by recommendationId, never by BeyondDay co-location", async () => {
    // Two BeyondDays, each with its own recommendation; only the second is rated.
    // A day-co-location bug would either mis-attribute the rating or throw.
    const dayA = await startDay();
    const recA = await submitCheckIn(dayA.id, GREEN);
    await recordRecommendation(dayA.id, recA.recommendation);
    const dayB = await startDay();
    const recB = await submitCheckIn(dayB.id, GREEN);
    await recordRecommendation(dayB.id, recB.recommendation);
    await rateOutcome(dayB.id, recB.recommendation.id, "GOOD");

    const ledger = await getRecommendationLedger();
    expect(findEntry(ledger, recA.recommendation.id)?.rating).toBeUndefined();
    expect(findEntry(ledger, recB.recommendation.id)?.rating).toBe("GOOD");
  });

  it("is unaffected by ending the day and starting a new one — historical entries never move or change", async () => {
    const day = await startDay();
    const rec = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, rec.recommendation);
    await rateOutcome(day.id, rec.recommendation.id, "NEUTRAL");

    const before = await getRecommendationLedger();

    await endDay(day.id);
    await startDay();

    const after = await getRecommendationLedger();
    const beforeEntry = findEntry(before, rec.recommendation.id);
    const afterEntry = findEntry(after, rec.recommendation.id);
    expect(afterEntry).toEqual(beforeEntry);
    expect(afterEntry?.recommendation.beyondDayId).toBe(day.id);
  });

  it("orders recommendations deterministically, including a genuine issuedAt+seq collision", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    const second = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, second.recommendation);

    // Force a genuine collision: identical issuedAt AND no seq at all (as
    // if both predate the seq field, mirroring outcomeRating.test.ts's
    // "fails quietly when issuedAt and seq cannot prove order" fixture) —
    // nothing left to disambiguate but id.
    const tiedFirst = { ...first.recommendation, issuedAt: "2026-08-23T12:00:00.000Z" };
    const tiedSecond = { ...second.recommendation, issuedAt: "2026-08-23T12:00:00.000Z" };
    delete tiedFirst.seq;
    delete tiedSecond.seq;
    await db.recommendations.put(tiedFirst);
    await db.recommendations.put(tiedSecond);

    const ledgerA = await getRecommendationLedger();
    const ledgerB = await getRecommendationLedger();
    const idsA = ledgerA[0]!.entries.map((e) => e.recommendation.id);
    const idsB = ledgerB[0]!.entries.map((e) => e.recommendation.id);
    // Same input state -> same order on every call (reload-stable), and the
    // order is a real, reproducible tie-break (id), never left to
    // incidental Dexie scan order.
    expect(idsA).toEqual(idsB);
    expect(idsA).toEqual([tiedFirst.id, tiedSecond.id].sort((a, b) => a.localeCompare(b)));
  });

  it("performs no writes and triggers no Engine evaluation or Recommendation mutation", async () => {
    const day = await startDay();
    const rec = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, rec.recommendation);
    await rateOutcome(day.id, rec.recommendation.id, "GOOD");

    const recBefore = structuredClone(await db.recommendations.get(rec.recommendation.id));
    const recCountBefore = await db.recommendations.count();
    const outcomeCountBefore = await db.outcomes.count();
    const eventCountBefore = await db.events.count();

    await getRecommendationLedger();

    expect(await db.recommendations.get(rec.recommendation.id)).toEqual(recBefore);
    expect(await db.recommendations.count()).toBe(recCountBefore);
    expect(await db.outcomes.count()).toBe(outcomeCountBefore);
    expect(await db.events.count()).toBe(eventCountBefore);
  });

  it("returns an empty ledger when no recommendation has ever been issued", async () => {
    await startDay();
    expect(await getRecommendationLedger()).toEqual([]);
  });
});
