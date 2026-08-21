import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  declineRecommendation,
  recordRecommendation,
  startDay,
  submitCheckIn,
} from "../../src/application/commands";
import { evaluate } from "../../src/engine/evaluate";
import { getRecommendationDecision, wasRecommendationRecorded } from "../../src/application/queries";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * RECOMMENDATION_DECLINED (fix requested alongside Phase 2): a real
 * "I'm not doing this" for ACTION-kind recommendations, distinct from both
 * RECOMMENDATION_ACCEPTED and NO_ACTION_RECORDED. STABILIZE always implies
 * RED capacity (evaluate.ts's only path to that kind), so declining it is
 * an override of RED-tier guidance and requires the same confirm-every-time
 * mechanism TRAIN already uses (engine/redOverride.ts).
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

const baseCheckIn: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt"> = {
  energy: 3,
  stress: 3,
  mood: 3,
  soreness: 0,
  alcoholUrge: 0,
};

describe("declineRecommendation — NO_ACTION_REQUIRED has no decline path", () => {
  it("throws rather than silently accepting a decline for NO_ACTION_REQUIRED", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, baseCheckIn); // GREEN, no planned work -> NO_ACTION_REQUIRED
    expect(recommendation.kind).toBe("NO_ACTION_REQUIRED");

    await expect(declineRecommendation(day.id, recommendation)).rejects.toThrow(
      "CANNOT_DECLINE_NO_ACTION_REQUIRED",
    );
  });
});

describe("declineRecommendation — RECOVER (YELLOW) needs no RED-override confirmation", () => {
  it("declines immediately and logs RECOMMENDATION_DECLINED", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, { ...baseCheckIn, soreness: 4 }); // YELLOW -> RECOVER
    expect(recommendation.kind).toBe("RECOVER");

    await declineRecommendation(day.id, recommendation);

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const declined = events.find((e) => e.type === "RECOMMENDATION_DECLINED");
    expect(declined).toBeDefined();
    expect((declined!.payload as { recommendationId: string; kind: string }).recommendationId).toBe(
      recommendation.id,
    );
    expect((declined!.payload as { kind: string }).kind).toBe("RECOVER");
    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(true);
  });
});

describe("declineRecommendation — EXECUTE_PLANNED_WORK (GREEN) needs no RED-override confirmation", () => {
  it("declines immediately and logs RECOMMENDATION_DECLINED", async () => {
    const day = await startDay();
    const checkIn: StateCheckIn = { id: "t", beyondDayId: day.id, recordedAt: new Date().toISOString(), ...baseCheckIn };
    // submitCheckIn always passes hasPlannedWork: false, so EXECUTE_PLANNED_WORK
    // isn't reachable through it today — construct it directly via evaluate(),
    // same as the engine would if hasPlannedWork were ever wired up to true.
    const recommendation = evaluate({ beyondDayId: day.id, checkIn, hasPlannedWork: true, hasUnresolvedPostShift: false });
    expect(recommendation.kind).toBe("EXECUTE_PLANNED_WORK");

    await declineRecommendation(day.id, recommendation);

    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(true);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBe("DECLINED");
  });
});

describe("declineRecommendation — STABILIZE (RED) requires the shared RED-override confirmation", () => {
  it("throws RED_OVERRIDE_NOT_CONFIRMED without explicit confirmation", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 }); // RED -> STABILIZE
    expect(recommendation.kind).toBe("STABILIZE");

    await expect(declineRecommendation(day.id, recommendation)).rejects.toThrow(
      "RED_OVERRIDE_NOT_CONFIRMED",
    );
    expect(await wasRecommendationRecorded(day.id, recommendation.id)).toBe(false);
  });

  it("succeeds once overrideConfirmed is explicitly passed, and logs RECOMMENDATION_DECLINED", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 });

    await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.some((e) => e.type === "RECOMMENDATION_DECLINED")).toBe(true);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBe("DECLINED");
  });

  it("never persists a 'don't ask again' — a second STABILIZE later still requires confirmation again", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 });
    await declineRecommendation(day.id, first, { overrideConfirmed: true });

    const { recommendation: second } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 });
    await expect(declineRecommendation(day.id, second)).rejects.toThrow("RED_OVERRIDE_NOT_CONFIRMED");
  });
});

describe("declining does not change future Engine behavior", () => {
  it("the Engine still issues STABILIZE again on the next RED check-in after a decline", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 });
    await declineRecommendation(day.id, first, { overrideConfirmed: true });

    const { recommendation: second } = await submitCheckIn(day.id, { ...baseCheckIn, stress: 5 });
    expect(second.kind).toBe("STABILIZE");
  });
});

describe("getRecommendationDecision distinguishes all three real decisions", () => {
  it("is undefined before any decision is made", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, baseCheckIn);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBeUndefined();
  });

  it("is ACCEPTED after recordRecommendation on an actionable kind", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, { ...baseCheckIn, soreness: 4 }); // RECOVER
    await recordRecommendation(day.id, recommendation);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBe("ACCEPTED");
  });

  it("is NO_ACTION_RECORDED after recordRecommendation on NO_ACTION_REQUIRED", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, baseCheckIn);
    await recordRecommendation(day.id, recommendation);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBe("NO_ACTION_RECORDED");
  });

  it("is DECLINED after declineRecommendation", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, { ...baseCheckIn, soreness: 4 }); // RECOVER
    await declineRecommendation(day.id, recommendation);
    expect(await getRecommendationDecision(day.id, recommendation.id)).toBe("DECLINED");
  });
});
