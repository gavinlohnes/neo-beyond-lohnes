import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { rateOutcome, recordRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { getPendingOutcomeRating } from "../../src/application/queries";

/**
 * Outcome rating placement (Context & Safety Decisions, 2026-08-19,
 * locked): tied to the recommendation lifecycle, not folded into quick
 * check-in. "The next time TODAY is opened after a recommendation was
 * recorded, it can optionally show 'Last time: {recommendation} — how'd
 * that go?'" — appears alongside a genuinely NEWER recommendation, never
 * for the one currently on screen, and only for a recorded one.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.useRealTimers(); // safety net in case a fake-timer test above throws before restoring them
});

async function checkIn(beyondDayId: string) {
  return submitCheckIn(beyondDayId, { energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 });
}

describe("getPendingOutcomeRating", () => {
  it("is undefined with only one recommendation (nothing 'last time' about it yet)", async () => {
    const day = await startDay();
    const { recommendation } = await checkIn(day.id);
    await recordRecommendation(day.id, recommendation);

    expect(await getPendingOutcomeRating(day.id)).toBeUndefined();
  });

  it("surfaces the prior recorded recommendation once a newer one exists", async () => {
    const day = await startDay();
    const first = await checkIn(day.id);
    await recordRecommendation(day.id, first.recommendation);
    await checkIn(day.id); // issues a newer recommendation -> "last time" now applies

    const pending = await getPendingOutcomeRating(day.id);
    expect(pending?.id).toBe(first.recommendation.id);
  });

  it("skips a past recommendation that was never recorded — only recorded ones are ratable", async () => {
    const day = await startDay();
    await checkIn(day.id); // issued, never recorded
    const second = await checkIn(day.id);
    await recordRecommendation(day.id, second.recommendation);
    await checkIn(day.id); // current

    const pending = await getPendingOutcomeRating(day.id);
    expect(pending?.id).toBe(second.recommendation.id);
  });

  it("stops surfacing a recommendation once it has been rated", async () => {
    const day = await startDay();
    const first = await checkIn(day.id);
    await recordRecommendation(day.id, first.recommendation);
    await checkIn(day.id);

    expect((await getPendingOutcomeRating(day.id))?.id).toBe(first.recommendation.id);
    await rateOutcome(day.id, first.recommendation.id, "GOOD");
    expect(await getPendingOutcomeRating(day.id)).toBeUndefined();
  });

  /**
   * Leverage Implementation 001 (deterministic ordering hardening,
   * 2026-08-22): getPendingOutcomeRating's sort used to compare raw
   * `issuedAt` strings only. Recommendation carries `seq`
   * (application/commands.ts's nextSeq), so a genuine same-millisecond
   * collision between two check-ins (routine under a fast CI runner) is
   * now resolved by call order instead of leaving a tie for
   * Array.prototype.sort's stability to resolve against whatever order
   * Dexie's own index scan happened to return — which, for two rows with
   * an identical secondary-index (issuedAt) value, is not guaranteed to
   * match real call order at all.
   */
  it("resolves which recommendation is 'past' correctly even when both share the exact same issuedAt millisecond", async () => {
    const day = await startDay();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));

    const first = await checkIn(day.id);
    await recordRecommendation(day.id, first.recommendation);
    const second = await checkIn(day.id); // identical issuedAt to `first`, strictly later seq

    vi.useRealTimers();

    expect(first.recommendation.issuedAt).toBe(second.recommendation.issuedAt);
    expect(second.recommendation.seq).toBeGreaterThan(first.recommendation.seq!);

    const pending = await getPendingOutcomeRating(day.id);
    expect(pending?.id).toBe(first.recommendation.id);
  });
});

describe("rateOutcome", () => {
  it("records a GOOD/NEUTRAL/BAD rating as both an Outcome row and an OUTCOME_RATED event", async () => {
    const day = await startDay();
    const { recommendation } = await checkIn(day.id);
    await recordRecommendation(day.id, recommendation);

    await rateOutcome(day.id, recommendation.id, "BAD");

    const outcomes = await db.outcomes.where("beyondDayId").equals(day.id).toArray();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ recommendationId: recommendation.id, rating: "BAD", result: "UNKNOWN" });

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const rated = events.find((e) => e.type === "OUTCOME_RATED");
    expect(rated).toBeDefined();
    expect((rated!.payload as { rating: string }).rating).toBe("BAD");
  });
});
