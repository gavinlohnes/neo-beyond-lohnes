import type { Mission, Obligation } from "../../../domain/intent/types";
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

/**
 * The compact CollapsibleRow summary line — the obligation's own title,
 * then its headline relevance, then a plain count of anything else
 * unresolved.
 *
 * FIELD ALPHA Gate A correction (2026-08-22): CollapsibleRow's `name`
 * (its header) used to be `obligation.title` directly — real-device
 * evidence showed this reading as a second "NOW"-shaped label sitting
 * right below TODAY's own "Now" section header, with no role label to
 * say what kind of object it even was. The title now lives here, in the
 * summary line, and the header becomes the fixed role label
 * "COMMITMENT" (see TodayScreen.tsx's renderCommitmentsCard) — the same
 * label already shown once the row is expanded, so collapsed and
 * expanded now read consistently instead of the header text changing
 * identity when you tap it open.
 */
export function describeCommitmentsSummary(tier: ObligationRelevanceTier, obligation: Obligation, otherUnresolvedCount: number): string {
  const headline = `${obligation.title} · ${describeObligationRelevance(tier, obligation)}`;
  return otherUnresolvedCount > 0 ? `${headline} · +${otherUnresolvedCount} more unresolved` : headline;
}

/** Explicit stored context only; archived status is named so it is not presented as current direction. */
export function describeCommitmentMission(mission: Mission): string {
  return `Mission: ${mission.title}${mission.status === "ARCHIVED" ? " (archived)" : ""}`;
}
