import { afterEach, expect, it, vi } from "vitest";
import { seedShortSleepDraft } from "./helpers/shortSleepDraft";
import { getRecommendationDraft } from "../src/application/recommendationDraftQueries";
import { submitCheckIn } from "../src/application/commands";
import { db } from "../src/persistence/db";
afterEach(() => vi.useRealTimers());
it("reads real personal sleep evidence, writes nothing, and yields to a confirmed RED check-in", async () => {
  const id = await seedShortSleepDraft();
  const before = [await db.events.count(), await db.checkIns.count(), await db.recommendations.count()];
  expect(await getRecommendationDraft(id)).toMatchObject({ kind: "RECOVER", nights: [{ minutes: 290 }, { minutes: 310 }] });
  expect([await db.events.count(), await db.checkIns.count(), await db.recommendations.count()]).toEqual(before);
  expect(await getRecommendationDraft("another-day")).toBeNull();
  const { recommendation } = await submitCheckIn(id, { energy: 1, stress: 2, mood: 4, soreness: 0, alcoholUrge: 0 });
  expect(recommendation.kind).toBe("STABILIZE");
  expect(await getRecommendationDraft(id)).toBeNull();
});
it("with one short night, provides no invented recovery draft", async () => {
  expect(await getRecommendationDraft(await seedShortSleepDraft([420, 290]))).toBeNull();
});
