import type { Capacity } from "../domain/common/types";
import type { SchedulePhase } from "./scheduledContext";

/**
 * FOUNDATION-1B (Arbitration Hierarchy — PROTECT, resolved 2026-09-20):
 * Scenario B needs a pre-shift protection concern (food/hydration before a
 * shift) to earn meaningfully elevated attention. Investigation found this
 * conflicts, if implemented as a new/re-ranked `evaluate.ts` kind, with the
 * locked INTENT-ARBITRATION-001 ruling (2026-09-15), which explicitly put
 * `OBLIGATION_DUE` below `EXECUTE_PLANNED_WORK` and explicitly rejected
 * ranking it higher. Direct owner ruling (this session, 2026-09-20):
 * **Advisory-only PROTECT** — `evaluate.ts`'s kind set/ranking stay exactly
 * as locked; this module is a pure, standalone interpretation layer (same
 * shape as `obligationRelevance.ts`) that composes into an INTERRUPT-tier
 * `AdvisoryNote` (`engine/advisory.ts`'s `composeAdvisoryNoteFromShiftProtection`)
 * — never an `evaluate.ts` input, never a competing Engine kind.
 *
 * Deliberately reuses MINIMUM DAY's already-locked hydrate/protein
 * thresholds (`application/queries.ts`'s `getMinimumDayStatus`,
 * MINIMUM_DAY_HYDRATE_OZ=40 / a 25g protein floor) rather than inventing a
 * new, unconfigured "shift protection" threshold — those numbers are
 * already the repository's one real, owner-locked answer to "what counts
 * as a meaningful hydration/protein requirement," so reusing them avoids
 * NO_FAKE_PRECISION (a second, independently-invented number for the same
 * physiological concern) and satisfies "use existing repo concepts where
 * available" directly.
 *
 * Gated on RED/YELLOW never applying: STABILIZE/POST_SHIFT_TRANSITION/
 * RECOVER already take precedence over anything discretionary when
 * capacity is constrained — this module only ever has something to say
 * when capacity is GREEN (or unknown, i.e. no check-in yet), matching
 * doctrine's "the operator's own physical/temporal state... always wins."
 */

export type ShiftProtectionItem = "HYDRATE" | "PROTEIN";

export interface ShiftProtectionInput {
  phase: SchedulePhase;
  todayIsScheduledWorkDay: boolean;
  capacity: Capacity | null;
  minimumDay: { hydrate: boolean; protein: boolean };
}

export interface ShiftProtectionConcern {
  unmetItems: ShiftProtectionItem[];
}

/**
 * Pure: same input always derives the same concern (or none). Fires only
 * for PRE_WORK on a real scheduled work day, with capacity not already
 * constrained (RED/YELLOW), and at least one Minimum Day protection item
 * still unmet. Returns null — no concern — for every other combination,
 * including SCHEDULED_SHIFT/EXPECTED_POST_WORK/OFF (this is deliberately
 * PRE_WORK-only: once the shift has started, "protect before it starts" no
 * longer applies, and EXPECTED_POST_WORK is already POST_SHIFT_TRANSITION's
 * territory).
 */
export function evaluateShiftProtection(input: ShiftProtectionInput): ShiftProtectionConcern | null {
  if (input.phase !== "PRE_WORK" || !input.todayIsScheduledWorkDay) return null;
  if (input.capacity === "RED" || input.capacity === "YELLOW") return null;

  const unmetItems: ShiftProtectionItem[] = [];
  if (!input.minimumDay.hydrate) unmetItems.push("HYDRATE");
  if (!input.minimumDay.protein) unmetItems.push("PROTEIN");

  if (unmetItems.length === 0) return null;
  return { unmetItems };
}
