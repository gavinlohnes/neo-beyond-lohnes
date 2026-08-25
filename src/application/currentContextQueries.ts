import type { BeyondDay } from "../domain/common/types";
import type { ScheduledContext } from "../engine/scheduledContext";
import { getScheduledContext, hasUnresolvedPostShift } from "./queries";

/**
 * Current Operational Context V1 (bounded implementation proof, tightened
 * after review). A read-only, ephemeral, application-layer VIEW composing
 * already-canonical current operational facts and predictions for one
 * bounded presentation consumer: TODAY's context strip
 * (describeContextStrip, src/ui/screens/today/workContextCopy.ts), which
 * consumes exactly `workContext`, `hasUnresolvedPostShift`, and
 * `schedulePrediction` — nothing else. It is explicitly NOT:
 *
 * - a universal Context object or extensible key/value bag — this is the
 *   whole shape, not a starting point. `capacity` and a day-identity field
 *   were both dropped from the original draft because the first proof
 *   consumer never reads them (capacity is already sourced independently
 *   by TODAY's own `capacityResult` state for its own display);
 * - a transactional/atomic point-in-time snapshot — `hasUnresolvedPostShift`
 *   and `schedulePrediction` each come from their own independent query;
 * - command authority — never read to authorize/gate a command, never
 *   passed into engine/evaluate.ts. TRAIN's command-layer capacity
 *   (trainCommands.ts) has its own independent canonical read for the
 *   same reason: command-layer enforcement must re-read authoritative
 *   state at execution time, never trust a value handed to it — including
 *   this one;
 * - persisted or cached — recomposed fresh on every call, same posture as
 *   application/advisoryQueries.ts's getAdvisoryNotes.
 *
 * Day-identity safety: this function deliberately does NOT call
 * getActiveDay() itself. It takes the already-resolved active day as a
 * parameter instead, so the composed view can never independently
 * disagree with the caller's own idea of "which day is current" — there
 * is only ever one read of "what's the active day," in the caller's own
 * refresh cycle, and this function composes around it. (A caller that
 * calls this from more than one overlapping refresh is still responsible
 * for its own request-ownership — see TodayScreen.tsx's use of it for the
 * monotonic-request-id + mounted-guard pattern that protects against an
 * older refresh's result arriving after a newer one's.)
 */
export interface CurrentOperationalContext {
  /** FACT, or null with no active day. */
  workContext: BeyondDay["workContext"] | null;

  /** DERIVED FROM FACT — hasUnresolvedPostShift(), unchanged. `false` when there is no active day. */
  hasUnresolvedPostShift: boolean;

  /**
   * PREDICTED CONTEXT, in full, and never merged with `workContext`. A
   * conflict between an explicit confirmed work context and this
   * prediction is not resolved here — both fields stay honest on their
   * own terms; resolving that conflict is the consumer's job.
   */
  schedulePrediction: ScheduledContext;
}

export async function getCurrentOperationalContext(
  activeDay: { id: string; workContext: BeyondDay["workContext"] } | null,
  now: Date = new Date(),
): Promise<CurrentOperationalContext> {
  const [unresolvedPostShift, schedulePrediction] = await Promise.all([
    activeDay ? hasUnresolvedPostShift(activeDay.id) : Promise.resolve(false),
    getScheduledContext(now),
  ]);

  return {
    workContext: activeDay ? activeDay.workContext : null,
    hasUnresolvedPostShift: unresolvedPostShift,
    schedulePrediction,
  };
}
