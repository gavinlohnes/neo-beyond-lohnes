import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { declineRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { getLatestRecommendation } from "../../src/application/queries";
import { readPresence } from "../../src/ui/presence";

/** PRESENCE-001 (review of #382): "Next" is the Engine's open action only; once decided it goes quiet. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("shows the open ACTION, and nothing once he has declined it", async () => {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 4, alcoholUrge: 0 });
  const rec = (await getLatestRecommendation(day.id))!;
  expect(rec.statusAtIssue).toBe("ACTION");
  expect((await readPresence())?.next).toBe(rec.title);
  await declineRecommendation(day.id, rec);
  expect((await readPresence())?.next).toBeNull();
});
