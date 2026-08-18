import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  completeReset,
  recordRecommendation,
  startDay,
  startReset,
  startShiftDown,
  submitCheckIn,
} from "../../src/application/commands";
import {
  getActiveDay,
  getLatestCheckIn,
  getLatestRecommendation,
  wasRecommendationRecorded,
} from "../../src/application/queries";

/**
 * Confirmed real-app behavior (RECOVERY INDEX / START HERE briefing):
 * recommendation history is not silently created merely by displaying a
 * recommendation. NO ACTION REQUIRED has an explicit RECORD NO ACTION
 * action; actionable recommendations have an explicit ACCEPT step.
 * Issuing a recommendation (engine reassessment) and RECORDING a decision
 * about it are two distinct, separately-logged facts.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("recommendation issuance vs. recorded decision", () => {
  it("submitCheckIn issues a recommendation immediately but does not record a decision about it", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, {
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.some((e) => e.type === "RECOMMENDATION_ISSUED")).toBe(true);
    expect(events.some((e) => e.type === "RECOMMENDATION_ACCEPTED")).toBe(false);
    expect(events.some((e) => e.type === "NO_ACTION_RECORDED")).toBe(false);

    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(false);
  });

  it("merely reading the latest recommendation does not record a decision (queries never mutate)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 });

    const before = await db.events.where("beyondDayId").equals(day.id).count();
    await getLatestRecommendation(day.id);
    await getLatestRecommendation(day.id);
    await getActiveDay();
    await getLatestCheckIn(day.id);
    const after = await db.events.where("beyondDayId").equals(day.id).count();

    expect(after).toBe(before);
  });

  it("NO_ACTION_REQUIRED is recorded via an explicit NO_ACTION_RECORDED fact, not silently", async () => {
    const day = await startDay();
    // Neutral, GREEN, no planned work -> NO_ACTION_REQUIRED.
    const { recommendation } = await submitCheckIn(day.id, {
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    expect(recommendation.kind).toBe("NO_ACTION_REQUIRED");
    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(false);

    await recordRecommendation(day.id, recommendation);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const recorded = events.find((e) => e.type === "NO_ACTION_RECORDED");
    expect(recorded).toBeDefined();
    expect((recorded!.payload as { recommendationId: string }).recommendationId).toBe(
      recommendation.id,
    );
    expect(events.some((e) => e.type === "RECOMMENDATION_ACCEPTED")).toBe(false);
    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(true);
  });

  it("an actionable recommendation is recorded via RECOMMENDATION_ACCEPTED, not NO_ACTION_RECORDED", async () => {
    const day = await startDay();
    // stress == 5 -> RED -> STABILIZE (actionable).
    const { recommendation } = await submitCheckIn(day.id, {
      energy: 3,
      stress: 5,
      mood: 3,
      soreness: 0,
      alcoholUrge: 0,
    });
    expect(recommendation.kind).toBe("STABILIZE");

    await recordRecommendation(day.id, recommendation);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.some((e) => e.type === "RECOMMENDATION_ACCEPTED")).toBe(true);
    expect(events.some((e) => e.type === "NO_ACTION_RECORDED")).toBe(false);
    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(true);
  });
});

describe("RESET lifecycle", () => {
  it("records RESET_STARTED with intensity and RESET_COMPLETED causally linked to it", async () => {
    const day = await startDay();
    const startedId = await startReset(day.id, 4);
    await completeReset(day.id, startedId);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const started = events.find((e) => e.type === "RESET_STARTED");
    const completed = events.find((e) => e.type === "RESET_COMPLETED");
    expect((started!.payload as { intensity: number }).intensity).toBe(4);
    expect(completed!.causationId).toBe(startedId);
  });
});

describe("SHIFT DOWN override", () => {
  it("records a COMMAND_STARTED/COMMAND_COMPLETED pair sharing one correlationId", async () => {
    const day = await startDay();
    await startShiftDown(day.id);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const started = events.find(
      (e) =>
        e.type === "COMMAND_STARTED" &&
        (e.payload as { commandName: string }).commandName === "START_SHIFT_DOWN",
    );
    const completed = events.find(
      (e) =>
        e.type === "COMMAND_COMPLETED" &&
        (e.payload as { commandName: string }).commandName === "START_SHIFT_DOWN",
    );
    expect(started).toBeDefined();
    expect(completed).toBeDefined();
    expect(completed!.correlationId).toBe(started!.correlationId);
  });
});
