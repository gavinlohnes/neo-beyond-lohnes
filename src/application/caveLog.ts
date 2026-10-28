import type { DomainEvent, Recommendation } from "../domain/common/types";
import { db } from "../persistence/db";
import { getCaveRoute, type CaveRoute } from "./caveRoute";
import { byTimeThenSeq, getActiveDay } from "./queries";

/**
 * SUIT-ALIVE S8 — the cave, Log (owner approval 2026-10-28). What the cave said is not stored: it is
 * rebuilt from the same records at each point in time — every recommendation issued today and each
 * route callout at the moment its point passed — beside the recorder, today's events as recorded.
 * Read only; nothing new is written to make it.
 */
export interface CaveLogData {
  events: DomainEvent[];
  recommendations: Recommendation[];
  route: CaveRoute | null;
}

export async function getCaveLogData(now: Date = new Date()): Promise<CaveLogData | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [events, recommendations, route] = await Promise.all([
    db.events.where("beyondDayId").equals(day.id).toArray(),
    db.recommendations.where("beyondDayId").equals(day.id).toArray(),
    getCaveRoute(now),
  ]);
  return {
    events: events.sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq)),
    recommendations: recommendations.sort((a, b) => byTimeThenSeq(a.issuedAt, a.seq, b.issuedAt, b.seq)),
    route,
  };
}
