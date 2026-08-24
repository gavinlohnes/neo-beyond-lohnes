import type { BeyondDay, Capacity } from "../domain/common/types";
import type { ScheduledContext } from "../engine/scheduledContext";
import { deriveCapacity } from "../engine/capacity";
import { getActiveDay, getLatestCheckIn, getScheduledContext, hasUnresolvedPostShift } from "./queries";

/**
 * Current Operational Context V1 (bounded implementation proof). A
 * read-only, ephemeral, application-layer VIEW that composes already-
 * canonical current operational facts and predictions for one bounded
 * presentation consumer (TODAY's context strip). It is explicitly NOT:
 *
 * - a universal Context object or extensible key/value bag — the field
 *   set below is the whole thing, not a starting point;
 * - a transactional/atomic point-in-time snapshot — each field's own
 *   canonical query runs independently; only the schedule prediction and
 *   `assembledAt` share one explicit `now`, per deriveScheduledContext's
 *   own purity contract (engine/scheduledContext.ts);
 * - command authority — nothing reads this to authorize or gate a
 *   command, and it is never passed into engine/evaluate.ts. TRAIN's
 *   command-layer capacity (src/application/trainCommands.ts) has its own
 *   independent canonical read for the same reason: command-layer
 *   enforcement must re-read authoritative state at execution time, never
 *   trust a value handed to it by a UI/caller — including this one;
 * - persisted or cached — recomposed fresh on every call, same posture as
 *   application/advisoryQueries.ts's getAdvisoryNotes.
 *
 * Every field reuses an existing canonical query/derivation verbatim;
 * none of their ordering or interpretation logic is reproduced here:
 * getActiveDay, getLatestCheckIn, deriveCapacity (LOCKED,
 * engine/capacity.ts), hasUnresolvedPostShift, getScheduledContext (which
 * itself already falls back to DEFAULT_SCHEDULE_PATTERN on missing/
 * invalid configuration — that existing fallback is preserved unchanged
 * and no new confidence/fallback metadata is invented here).
 */
export interface CurrentOperationalContext {
  /** FACT — the instant this view was assembled. */
  assembledAt: string;

  /**
   * FACT, or absent. Only `id` and `workContext` — getActiveDay() only
   * ever returns a BeyondDay with status "ACTIVE", so there is no ENDED
   * state for this view to represent; `null` alone means no active day.
   */
  activeDay: {
    id: string;
    workContext: BeyondDay["workContext"];
  } | null;

  /**
   * DERIVED FROM FACT — deriveCapacity() applied to the canonical latest
   * check-in (getLatestCheckIn, recordedAt + seq ordering). `null` when
   * there is no active day or no check-in yet — never guessed/defaulted.
   */
  capacity: Capacity | null;

  /** DERIVED FROM FACT — hasUnresolvedPostShift(), unchanged. `false` when there is no active day. */
  hasUnresolvedPostShift: boolean;

  /**
   * PREDICTED CONTEXT, in full, and never merged with `activeDay.workContext`.
   * A conflict between an explicit confirmed work context and this
   * prediction is not resolved here — both fields simply stay honest on
   * their own terms; resolving that conflict is the consumer's job.
   */
  schedulePrediction: ScheduledContext;
}

/**
 * Composes CurrentOperationalContext from already-canonical sources. Not
 * atomic: activeDay/capacity/hasUnresolvedPostShift each reflect Dexie
 * state as read at their own await, not one guaranteed-consistent
 * transaction — consistent with this being an assembled read view, not a
 * guaranteed point-in-time snapshot. `now` is captured once and reused
 * for every time-derived value in this call (`assembledAt` and the
 * schedule prediction), so they can never disagree with each other.
 */
export async function getCurrentOperationalContext(now: Date = new Date()): Promise<CurrentOperationalContext> {
  const assembledAt = now.toISOString();

  const [activeDayRecord, schedulePrediction] = await Promise.all([
    getActiveDay(),
    getScheduledContext(now),
  ]);

  const activeDay = activeDayRecord ? { id: activeDayRecord.id, workContext: activeDayRecord.workContext } : null;

  const [checkIn, unresolvedPostShift] = activeDayRecord
    ? await Promise.all([getLatestCheckIn(activeDayRecord.id), hasUnresolvedPostShift(activeDayRecord.id)])
    : [undefined, false];

  const capacity = checkIn ? deriveCapacity(checkIn).capacity : null;

  return {
    assembledAt,
    activeDay,
    capacity,
    hasUnresolvedPostShift: unresolvedPostShift,
    schedulePrediction,
  };
}
