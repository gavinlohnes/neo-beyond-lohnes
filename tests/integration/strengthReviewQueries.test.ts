import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { getStrengthReview } from "../../src/application/strengthReviewQueries";
import type { WorkoutSession } from "../../src/domain/common/types";
import type { PerformedSet } from "../../src/domain/workout/types";

const now = new Date("2026-10-24T12:00:00.000Z");
const at = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
beforeEach(async () => { await db.open(); await db.delete(); await db.open(); });
afterEach(() => db.close());

async function session(id: string, days: number, status = "COMPLETED") {
  await db.workoutSessions.put({ id, schemaVersion: 1, beyondDayId: `day-${id}`, templateId: "A", sessionType: "STANDARD", status, startedAt: at(days), endedAt: at(days) } as WorkoutSession);
}
async function set(id: string, sessionId: string, exerciseId = "machine-chest-press", overrides: Partial<PerformedSet> = {}) {
  await db.performedSets.put({ id, beyondDayId: `day-${sessionId}`, sessionId, exerciseId, setNumber: 1, weight: 100, reps: 10, skipped: false, recordedAt: at(1), ...overrides } as never);
}

describe("getStrengthReview", () => {
  it("uses finished canonical sets and resolves built-in muscles", async () => {
    for (const [id, days] of [["r1", 2], ["r2", 12], ["p1", 30], ["p2", 40]] as const) { await session(id, days); await set(`s-${id}`, id, "machine-chest-press", { weight: days < 28 ? 110 : 100 }); }
    await session("active", 1, "ACTIVE"); await set("active-set", "active", "machine-chest-press", { weight: 999 });
    const result = await getStrengthReview(now);
    expect(result.lifts[0]).toMatchObject({ exerciseId: "machine-chest-press", status: "IMPROVING" });
    expect(result.muscleSetsPerWeek.Chest).toBe(.5);
    expect(result.names["machine-chest-press"]).toBe("Machine Chest Press");
  });
  it("excludes skipped, substituted and undone sets", async () => {
    await session("r", 2); await set("skip", "r", undefined, { skipped: true }); await set("sub", "r", undefined, { substitutedName: "Other" }); await set("undo", "r");
    await db.events.put({ id: "undo-event", schemaVersion: 1, type: "SET_UNDONE", beyondDayId: "day-r", occurredAt: at(1), recordedAt: at(1), seq: 1, payload: { performedSetId: "undo" } } as never);
    expect((await getStrengthReview(now)).lifts).toEqual([]);
  });
});
