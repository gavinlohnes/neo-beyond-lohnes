import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { submitCheckIn, startDay } from "../../src/application/commands";
import { quickCheckInValues } from "../../src/ui/screens/today/TodayScreen";

/**
 * Quick check-in (Context & Safety Decisions, 2026-08-19): a fast one-tap
 * "all good" option alongside the full 5-field check-in, which "still
 * produces a real StateCheckIn the Engine can use." Default values
 * confirmed with Gavin 2026-08-19 (energy=4, stress=2, mood=4, soreness=1,
 * alcoholUrge=0 — "a genuinely fine day," not the most extreme possible
 * values). This test guards against the constant drifting away from GREEN
 * if the capacity rule or the constant itself ever changes independently.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("quick check-in default values", () => {
  it("produces the confirmed 2026-08-19 values", () => {
    expect(quickCheckInValues).toEqual({
      energy: 4,
      stress: 2,
      mood: 4,
      soreness: 1,
      alcoholUrge: 0,
    });
  });

  it("is a real StateCheckIn that lands GREEN capacity through the actual Engine", async () => {
    const day = await startDay();
    const result = await submitCheckIn(day.id, quickCheckInValues);

    expect(result.checkIn.energy).toBe(4);
    const capacityInput = result.recommendation.trace.derived.find((d) => d.key === "capacity");
    expect(capacityInput?.value).toBe("GREEN");

    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    expect(events.some((e) => e.type === "STATE_CHECKED_IN")).toBe(true);
    expect(events.some((e) => e.type === "RECOMMENDATION_ISSUED")).toBe(true);
  });
});
