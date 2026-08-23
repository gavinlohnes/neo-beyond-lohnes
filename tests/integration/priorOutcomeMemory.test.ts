import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import {
  rateOutcome,
  recordRecommendation,
  startDay,
  submitCheckIn,
} from "../../src/application/commands";
import { getPriorOutcomeMemory } from "../../src/application/queries";
import type { Recommendation, StateCheckIn } from "../../src/domain/common/types";

const GREEN: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 4,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};

const RED = { ...GREEN, energy: 1 as const };

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
  vi.useRealTimers();
});

async function recordAndRate(
  dayId: string,
  recommendation: Recommendation,
  rating: "GOOD" | "NEUTRAL" | "BAD" = "GOOD",
): Promise<void> {
  await recordRecommendation(dayId, recommendation);
  await rateOutcome(dayId, recommendation.id, rating);
}

describe("getPriorOutcomeMemory", () => {
  it("returns an exact-kind prior recommendation with its recorded decision and explicit rating", async () => {
    const priorDay = await startDay();
    const prior = await submitCheckIn(priorDay.id, GREEN);
    await recordAndRate(priorDay.id, prior.recommendation, "GOOD");
    const currentDay = await startDay();
    const current = await submitCheckIn(currentDay.id, GREEN);

    const memory = await getPriorOutcomeMemory(current.recommendation);

    expect(memory).toMatchObject({
      recommendation: { id: prior.recommendation.id, kind: current.recommendation.kind },
      decision: "NO_ACTION_RECORDED",
      rating: "GOOD",
    });
    expect(memory?.ratedAt).toBeTypeOf("string");
  });

  it("selects the most recent qualifying prior recommendation deterministically when issuedAt ties", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));

    const first = await submitCheckIn(day.id, GREEN);
    await recordAndRate(day.id, first.recommendation, "BAD");
    const second = await submitCheckIn(day.id, GREEN);
    await recordAndRate(day.id, second.recommendation, "NEUTRAL");
    const current = await submitCheckIn(day.id, GREEN);

    expect(first.recommendation.issuedAt).toBe(current.recommendation.issuedAt);
    expect(second.recommendation.seq).toBeGreaterThan(first.recommendation.seq!);
    expect(current.recommendation.seq).toBeGreaterThan(second.recommendation.seq!);

    const memory = await getPriorOutcomeMemory(current.recommendation);
    expect(memory?.recommendation.id).toBe(second.recommendation.id);
    expect(memory?.rating).toBe("NEUTRAL");
  });

  it("excludes a prior recommendation with a different kind", async () => {
    const day = await startDay();
    const prior = await submitCheckIn(day.id, GREEN);
    await recordAndRate(day.id, prior.recommendation);
    const current = await submitCheckIn(day.id, RED);

    expect(prior.recommendation.kind).not.toBe(current.recommendation.kind);
    expect(await getPriorOutcomeMemory(current.recommendation)).toBeUndefined();
  });

  it("excludes the current recommendation even if it has already been recorded and rated", async () => {
    const day = await startDay();
    const current = await submitCheckIn(day.id, GREEN);
    await recordAndRate(day.id, current.recommendation);

    expect(await getPriorOutcomeMemory(current.recommendation)).toBeUndefined();
  });

  it("excludes an unrated prior recommendation", async () => {
    const day = await startDay();
    const prior = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, prior.recommendation);
    const current = await submitCheckIn(day.id, GREEN);

    expect(await getPriorOutcomeMemory(current.recommendation)).toBeUndefined();
  });

  it("excludes a rated prior recommendation without a recorded decision", async () => {
    const day = await startDay();
    const prior = await submitCheckIn(day.id, GREEN);
    await rateOutcome(day.id, prior.recommendation.id, "GOOD");
    const current = await submitCheckIn(day.id, GREEN);

    expect(await getPriorOutcomeMemory(current.recommendation)).toBeUndefined();
  });

  it("returns nothing when there is no qualifying prior evidence", async () => {
    const day = await startDay();
    const current = await submitCheckIn(day.id, GREEN);

    expect(await getPriorOutcomeMemory(current.recommendation)).toBeUndefined();
  });

  it("is read-only and leaves the current recommendation and DecisionTrace unchanged", async () => {
    const day = await startDay();
    const current = await submitCheckIn(day.id, GREEN);
    const before = structuredClone(current.recommendation);

    await getPriorOutcomeMemory(current.recommendation);

    expect(current.recommendation).toEqual(before);
    expect(await db.recommendations.get(current.recommendation.id)).toEqual(before);
  });
});
