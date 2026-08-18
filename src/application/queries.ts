import { db } from "../persistence/db";
import type {
  BeyondDay,
  DomainEvent,
  HydrationEntry,
  Recommendation,
  StateCheckIn,
  WaterLogCorrectedPayload,
  WaterLoggedPayload,
} from "../domain/common/types";

export async function getActiveDay(): Promise<BeyondDay | undefined> {
  return db.beyondDays.filter((d: BeyondDay) => d.status === "ACTIVE").last();
}

export async function getLatestCheckIn(
  beyondDayId: string,
): Promise<StateCheckIn | undefined> {
  return db.checkIns.where("beyondDayId").equals(beyondDayId).last();
}

export async function getLatestRecommendation(
  beyondDayId: string,
): Promise<Recommendation | undefined> {
  return db.recommendations.where("beyondDayId").equals(beyondDayId).last();
}

export async function wasRecommendationRecorded(
  beyondDayId: string,
  recommendationId: string,
): Promise<boolean> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  return events.some(
    (e) =>
      (e.type === "NO_ACTION_RECORDED" || e.type === "RECOMMENDATION_ACCEPTED") &&
      (e.payload as { recommendationId?: string }).recommendationId === recommendationId,
  );
}

/**
 * Reconstructs effective hydration truth from the raw event stream.
 * WATER_LOGGED starts a chain; WATER_LOG_CORRECTED events supersede the
 * amount without erasing the original fact. Effective total = sum of each
 * chain's current HEAD value, never the sum of every raw entry.
 */
export async function getHydrationEntries(
  beyondDayId: string,
): Promise<HydrationEntry[]> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const logged = events.filter(
    (e): e is DomainEvent<WaterLoggedPayload> => e.type === "WATER_LOGGED",
  );
  const corrections = events.filter(
    (e): e is DomainEvent<WaterLogCorrectedPayload> => e.type === "WATER_LOG_CORRECTED",
  );

  return logged
    .map((root): HydrationEntry => {
      let headId = root.id;
      let headAmount = root.payload.amountOz;
      let count = 0;
      // Walk the chain forward: find the correction targeting the current
      // head, repeat, until no further correction exists.
      let next = corrections.find((c) => c.payload.supersedesEventId === headId);
      while (next) {
        headId = next.id;
        headAmount = next.payload.amountOz;
        count += 1;
        next = corrections.find((c) => c.payload.supersedesEventId === headId);
      }
      return {
        rootEventId: root.id,
        headEventId: headId,
        originalAmountOz: root.payload.amountOz,
        effectiveAmountOz: headAmount,
        correctionCount: count,
        recordedAt: root.recordedAt,
      };
    })
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export async function getEffectiveHydrationTotal(beyondDayId: string): Promise<number> {
  const entries = await getHydrationEntries(beyondDayId);
  return entries.reduce((sum, e) => sum + e.effectiveAmountOz, 0);
}

export async function getEventCount(beyondDayId?: string): Promise<number> {
  if (!beyondDayId) return db.events.count();
  return db.events.where("beyondDayId").equals(beyondDayId).count();
}

export async function getRecommendationCount(beyondDayId?: string): Promise<number> {
  if (!beyondDayId) return db.recommendations.count();
  return db.recommendations.where("beyondDayId").equals(beyondDayId).count();
}

export async function getDayCount(): Promise<number> {
  return db.beyondDays.count();
}
