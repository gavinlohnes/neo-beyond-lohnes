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

/**
 * Only one BeyondDay should ever be ACTIVE at a time (startDay() closes
 * any prior ACTIVE day first). Sorted by startedAt rather than relying on
 * Dexie's .last() (primary-key order, not time) for defense in depth if
 * that invariant is ever violated.
 */
export async function getActiveDay(): Promise<BeyondDay | undefined> {
  const days = await db.beyondDays.filter((d: BeyondDay) => d.status === "ACTIVE").toArray();
  return days.sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
}

/**
 * NOTE: intentionally does not use Dexie's .last() on this where() query.
 * For a non-unique index like beyondDayId, .last() orders by primary key
 * (a random UUID) among same-beyondDayId rows, not by insertion/recorded
 * time — so it does NOT reliably return the most recent check-in when
 * more than one exists for the day. Sorting by recordedAt explicitly is
 * the correct "latest" query.
 */
export async function getLatestCheckIn(
  beyondDayId: string,
): Promise<StateCheckIn | undefined> {
  const all = await db.checkIns.where("beyondDayId").equals(beyondDayId).toArray();
  return all.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1);
}

/** See getLatestCheckIn's note — same fix, sorted by issuedAt. */
export async function getLatestRecommendation(
  beyondDayId: string,
): Promise<Recommendation | undefined> {
  const all = await db.recommendations.where("beyondDayId").equals(beyondDayId).toArray();
  return all.sort((a, b) => a.issuedAt.localeCompare(b.issuedAt)).at(-1);
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

/**
 * The Engine suggests ending the BeyondDay right after primary sleep is
 * logged (Context & Safety Decisions, 2026-08-19) — a suggestion, not an
 * automatic close. True once a SLEEP_LOGGED event exists for this day and
 * it hasn't already been ended.
 */
export async function shouldSuggestEndDay(beyondDayId: string): Promise<boolean> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const hasSleepLogged = events.some((e) => e.type === "SLEEP_LOGGED");
  const hasEnded = events.some((e) => e.type === "DAY_ENDED");
  return hasSleepLogged && !hasEnded;
}

/**
 * Most recent primary sleep duration logged for this BeyondDay, if any.
 * Duration only — no goal/target. See getLatestCheckIn's note: sorted
 * explicitly by recordedAt rather than relying on Dexie's .last(), which
 * would order by primary key (random UUID) among same-beyondDayId rows.
 */
export async function getLatestSleepMinutes(beyondDayId: string): Promise<number | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const latest = events
    .filter((e) => e.type === "SLEEP_LOGGED")
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1);
  return latest ? (latest.payload as { durationMinutes: number }).durationMinutes : undefined;
}

/** Most recent bodyweight logged for this BeyondDay, if any. A fact only — no goal/target. Sorted as above. */
export async function getLatestBodyweight(beyondDayId: string): Promise<number | undefined> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  const latest = events
    .filter((e) => e.type === "BODYWEIGHT_LOGGED")
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1);
  return latest ? (latest.payload as { weightLbs: number }).weightLbs : undefined;
}

/** Total protein logged for this BeyondDay (sum of all entries — no target/goal). */
export async function getTotalProteinGrams(beyondDayId: string): Promise<number> {
  const events = await db.events.where("beyondDayId").equals(beyondDayId).toArray();
  return events
    .filter((e) => e.type === "PROTEIN_LOGGED")
    .reduce((sum, e) => sum + (e.payload as { grams: number }).grams, 0);
}
