import type { Obligation } from "../../../domain/intent/types";
import type { ObligationRelevanceTier } from "../../../engine/obligationRelevance";

/**
 * Intent & Commitment Spine — Drop 02 (temporal corrections binding,
 * 2026-08-22). Pure copy for the single headline commitment TODAY may
 * show — same per-feature copy-module convention as capacityCopy.ts/
 * resetShiftDownCopy.ts/etc. No judgment happens here; it only describes
 * what engine/obligationRelevance.ts already decided.
 */
export function describeObligationRelevance(tier: ObligationRelevanceTier, obligation: Obligation): string {
  switch (tier) {
    case "OVERDUE":
      return obligation.dueAt ? `Overdue — was due ${obligation.dueAt}` : "Overdue";
    case "DUE_TODAY":
      return "Due today";
    case "DUE_SOON":
      return obligation.dueAt ? `Due ${obligation.dueAt}` : "Due soon";
    case "PLANNED_TODAY":
      return "Planned for today";
    case "WAITING":
      return "Waiting";
    case "QUIET":
      return "No pressing date";
  }
}

/** The compact CollapsibleRow summary line — headline relevance, plus a plain count of anything else unresolved. */
export function describeCommitmentsSummary(tier: ObligationRelevanceTier, obligation: Obligation, otherUnresolvedCount: number): string {
  const headline = describeObligationRelevance(tier, obligation);
  return otherUnresolvedCount > 0 ? `${headline} · +${otherUnresolvedCount} more unresolved` : headline;
}
