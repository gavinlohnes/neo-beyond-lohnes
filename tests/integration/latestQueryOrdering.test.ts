import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getLatestCheckIn, getLatestRecommendation } from "../../src/application/queries";

/**
 * Regression test for a real bug found while building CP8: Dexie's
 * .last() on a `.where('beyondDayId').equals(x)` collection orders by
 * PRIMARY KEY (a random UUID) among rows sharing that beyondDayId, not by
 * insertion/recorded time. With more than one check-in/recommendation per
 * day (an entirely normal case — check-ins happen throughout a BeyondDay),
 * the old implementation could silently return a check-in/recommendation
 * that was NOT actually the most recent one. Fixed by sorting explicitly
 * on recordedAt/issuedAt. This test creates enough check-ins that the
 * bug would very likely reproduce under the old (removed) implementation.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("getLatestCheckIn / getLatestRecommendation ordering", () => {
  it("returns the most recently submitted check-in and recommendation, not an arbitrary one", async () => {
    const day = await startDay();

    await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 });
    await submitCheckIn(day.id, { energy: 2, stress: 4, mood: 2, soreness: 2, alcoholUrge: 1 }); // YELLOW
    const last = await submitCheckIn(day.id, { energy: 1, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 }); // RED

    const latestCheckIn = await getLatestCheckIn(day.id);
    expect(latestCheckIn!.id).toBe(last.checkIn.id);
    expect(latestCheckIn!.energy).toBe(1);

    const latestRecommendation = await getLatestRecommendation(day.id);
    expect(latestRecommendation!.id).toBe(last.recommendation.id);
    expect(latestRecommendation!.kind).toBe("STABILIZE");
  });

  it("holds across many rapid check-ins, not just three", async () => {
    const day = await startDay();
    let expectedLastId = "";
    for (let i = 0; i < 12; i++) {
      const result = await submitCheckIn(day.id, {
        energy: 3,
        stress: 3,
        mood: 3,
        soreness: 0,
        alcoholUrge: 0,
      });
      expectedLastId = result.checkIn.id;
    }
    expect((await getLatestCheckIn(day.id))!.id).toBe(expectedLastId);
  });
});
