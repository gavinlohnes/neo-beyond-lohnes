import type { Outcome } from "../../../domain/common/types";
import type { RecommendationDecision } from "../../../application/queries";
import type { RecommendationDisposition } from "../../../engine/continuity";

/**
 * REVIEW 0.1: plain-language labels for the Recommendation Ledger.
 * Deliberately narrow — this file states only what already happened
 * (FACT-tier), never a trend, frequency, or effectiveness claim. See
 * docs/UX_DECISIONS.md's REVIEW entry for the explicit word list this
 * avoids ("usually", "often", "tends to", "works better", "success
 * rate", "improving", "declining").
 */
export function describeLedgerDecision(decision: RecommendationDecision | undefined): string {
  if (decision === undefined) return "Not yet decided";
  if (decision === "ACCEPTED") return "Accepted";
  if (decision === "DECLINED") return "Declined";
  return "No action recorded";
}

/** "Not yet rated" is never rendered as, or adjacent to, BAD — missing evidence and a bad outcome must stay visibly distinct. */
export function describeLedgerRating(rating: NonNullable<Outcome["rating"]> | undefined): string {
  return rating ?? "Not yet rated";
}

/**
 * FOUNDATION-1B: plain-language label for the read-time-derived lifecycle
 * disposition (engine/continuity.ts). Same FACT-tier discipline as the
 * two functions above — states what happened, never a trend/frequency
 * claim.
 */
export function describeLedgerDisposition(disposition: RecommendationDisposition): string {
  switch (disposition) {
    case "PENDING":
      return "Still open";
    case "COMPLETED":
      return "Resolved";
    case "DISMISSED":
      return "Dismissed";
    case "SUPERSEDED":
      return "Superseded by a later recommendation";
    case "EXPIRED":
      return "Expired unresolved";
  }
}
