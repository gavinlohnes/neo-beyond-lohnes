import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { declineRecommendation, recordRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { getRecommendationHandoff } from "../../src/application/queries";
import type { DomainEvent, Recommendation, StateCheckIn } from "../../src/domain/common/types";
import { evaluate } from "../../src/engine/evaluate";

type CheckInInput = Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq">;
const GREEN: CheckInInput = { energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 };
const YELLOW: CheckInInput = { ...GREEN, soreness: 4 };
const RED: CheckInInput = { ...GREEN, stress: 5 };

beforeEach(async () => void (await db.open()));
afterEach(() => db.close());

async function accepted(values = YELLOW): Promise<Recommendation> {
  const day = await startDay();
  const { recommendation } = await submitCheckIn(day.id, values);
  await recordRecommendation(day.id, recommendation);
  return recommendation;
}

async function addStart(
  recommendation: Recommendation,
  type: "SHIFT_DOWN_STARTED" | "WORKOUT_STARTED",
  sessionType?: string,
  ordering: "BEFORE" | "AFTER" | "AMBIGUOUS" = "AFTER",
) {
  const delta = ordering === "BEFORE" ? -1 : ordering === "AFTER" ? 1 : 0;
  const event: DomainEvent = {
    id: crypto.randomUUID(),
    beyondDayId: recommendation.beyondDayId,
    type,
    occurredAt: new Date(new Date(recommendation.issuedAt).getTime() + delta).toISOString(),
    recordedAt: new Date(new Date(recommendation.issuedAt).getTime() + delta).toISOString(),
    payload: type === "WORKOUT_STARTED" ? { sessionType } : {},
    source: "USER",
    correlationId: crypto.randomUUID(),
    seq: ordering === "AMBIGUOUS" ? (recommendation.seq ?? 0) : (recommendation.seq ?? 0) + delta,
  };
  await db.events.add(event);
}

describe("getRecommendationHandoff", () => {
  it("requires an ACCEPTED decision and exact supported kind/command pairs", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    expect(await getRecommendationHandoff(recommendation)).toBeUndefined();

    await declineRecommendation(day.id, recommendation);
    expect(await getRecommendationHandoff(recommendation)).toBeUndefined();

    const noAction = (await submitCheckIn(day.id, GREEN)).recommendation;
    await recordRecommendation(day.id, noAction);
    expect(await getRecommendationHandoff(noAction)).toBeUndefined();

    const unknown = { ...noAction, id: crypto.randomUUID(), issuedAt: new Date(Date.now() + 1).toISOString(), seq: (noAction.seq ?? 0) + 1, kind: "RECOVER" as const, statusAtIssue: "ACTION" as const, suggestedCommand: "UNKNOWN" };
    await db.recommendations.add(unknown);
    await recordRecommendation(day.id, unknown);
    expect(await getRecommendationHandoff(unknown)).toBeUndefined();
  });

  it("maps STABILIZE and POST_SHIFT_TRANSITION to SHIFT DOWN", async () => {
    const stabilize = await accepted(RED);
    expect(await getRecommendationHandoff(stabilize)).toBe("SHIFT_DOWN");

    const post = { ...stabilize, id: crypto.randomUUID(), issuedAt: new Date(Date.now() + 2).toISOString(), seq: (stabilize.seq ?? 0) + 2, kind: "POST_SHIFT_TRANSITION" as const };
    await db.recommendations.add(post);
    await recordRecommendation(post.beyondDayId, post);
    expect(await getRecommendationHandoff(post)).toBe("SHIFT_DOWN");
  });

  it("maps RECOVER to RECOVERY and defensively supports persisted EXECUTE_PLANNED_WORK", async () => {
    const recover = await accepted();
    expect(await getRecommendationHandoff(recover)).toBe("RECOVERY");

    const checkIn: StateCheckIn = { id: "planned", beyondDayId: recover.beyondDayId, recordedAt: new Date(Date.now() + 2).toISOString(), ...GREEN };
    const workout = evaluate({ beyondDayId: recover.beyondDayId, checkIn, hasPlannedWork: true, hasUnresolvedPostShift: false });
    workout.issuedAt = new Date(Date.now() + 3).toISOString();
    workout.seq = (recover.seq ?? 0) + 3;
    await db.recommendations.add(workout);
    await recordRecommendation(workout.beyondDayId, workout);
    expect(await getRecommendationHandoff(workout)).toBe("WORKOUT");
    await addStart(workout, "WORKOUT_STARTED", "RECOVERY", "AFTER");
    expect(await getRecommendationHandoff(workout)).toBe("WORKOUT");
    await addStart(workout, "WORKOUT_STARTED", "STANDARD", "AFTER");
    expect(await getRecommendationHandoff(workout)).toBeUndefined();
  });

  it("suppresses only a matching start strictly after the recommendation", async () => {
    const recover = await accepted();
    await addStart(recover, "WORKOUT_STARTED", "STANDARD", "AFTER");
    await addStart(recover, "WORKOUT_STARTED", "RECOVERY", "BEFORE");
    expect(await getRecommendationHandoff(recover)).toBe("RECOVERY");
    await addStart(recover, "WORKOUT_STARTED", "RECOVERY", "AFTER");
    expect(await getRecommendationHandoff(recover)).toBeUndefined();
  });

  it("fails closed when matching execution ordering is ambiguous", async () => {
    const stabilize = await accepted(RED);
    await addStart(stabilize, "SHIFT_DOWN_STARTED", undefined, "AMBIGUOUS");
    expect(await getRecommendationHandoff(stabilize)).toBeUndefined();
  });

  it("removes an older handoff when a newer recommendation exists", async () => {
    const first = await accepted();
    await submitCheckIn(first.beyondDayId, YELLOW);
    expect(await getRecommendationHandoff(first)).toBeUndefined();
  });

  it("fails closed when latest-recommendation ordering is ambiguous", async () => {
    const current = await accepted();
    await db.recommendations.add({ ...current, id: crypto.randomUUID() });
    expect(await getRecommendationHandoff(current)).toBeUndefined();
  });
});
