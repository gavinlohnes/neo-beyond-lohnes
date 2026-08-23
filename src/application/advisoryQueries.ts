import { composeAdvisoryNotesFromObligations } from "../engine/advisory";
import { formatLocalDate } from "../engine/scheduledContext";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";

/**
 * Intelligence Spine — I2 (controlled consumption proof, approved
 * 2026-08-22). The minimum application-layer seam between I1's engine
 * composer and a real UI consumer: fetch already-existing Obligation data
 * via the existing intentQueries.ts query, hand it unchanged to the
 * existing I1 composer. This function orchestrates/translates only — it
 * adds no judgment, threshold, or interpretation of its own; the
 * deterministic classification remains solely engine/obligationRelevance.ts
 * and engine/advisory.ts's, matching `now`'s default-parameter/injectable
 * pattern already established by application/queries.ts's getScheduledContext.
 *
 * Intent Lifecycle Integrity (2026-08-23, see docs/UX_DECISIONS.md):
 * sources from getCurrentlyEligibleUnresolvedObligations, not
 * getUnresolvedObligations directly — advisory.ts itself carries no
 * archived-Mission special case (and must not); Mission-lifecycle
 * eligibility is Intent & Commitment's own already-correct current-state
 * truth by the time it reaches this composer.
 */
export async function getAdvisoryNotes(now: Date = new Date()): Promise<AdvisoryNote[]> {
  const obligations = await getCurrentlyEligibleUnresolvedObligations();
  return composeAdvisoryNotesFromObligations(obligations, formatLocalDate(now));
}
