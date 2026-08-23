import type { Mission, Obligation } from "../domain/intent/types";

/**
 * Intent Lifecycle Integrity — owner-approved correction (2026-08-23, see
 * docs/UX_DECISIONS.md "Intent & Commitment — Mission archival and
 * Obligation current-attention eligibility"). Pure, deterministic
 * parallel interpretation layer — same shape as obligationRelevance.ts —
 * answering a distinct question: is this already-unresolved Obligation
 * still CURRENTLY eligible to be surfaced as live/actionable, given its
 * parent Mission's own lifecycle state?
 *
 * Locked rule (Option B): an Obligation with no missionId is never
 * affected by Mission lifecycle at all — always eligible. An Obligation
 * whose missionId points to an ACTIVE Mission is eligible. An Obligation
 * whose missionId points to an ARCHIVED Mission is NOT eligible — it
 * remains historically unresolved (status untouched, still returned by
 * application/intentQueries.ts's getUnresolvedObligations for management)
 * but must not participate in TODAY commitment/attention, AdvisoryNotes,
 * or any other current-intelligence consumer while its parent stays
 * archived. Conservative-by-construction for an unresolved/invalid parent
 * reference too: `mission` is `undefined` whenever the caller couldn't
 * resolve a live Mission for a set missionId (already-archived-out of a
 * caller's active-only fetch, or a row that failed validation) — treated
 * identically to ARCHIVED, never as a confident current-attention signal
 * merely because the Obligation's own status happens to be OPEN.
 *
 * Deliberately NOT a mutation, NOT stored, NOT a schema change — a pure
 * read-time projection, matching this repo's "no hidden mutation from a
 * read/query" and "no derived state ever stored on a Mission/Obligation"
 * doctrine (see tests/integration/missionLifecycle.test.ts).
 */
export function isObligationCurrentlyEligible(obligation: Obligation, mission: Mission | undefined): boolean {
  if (!obligation.missionId) return true;
  return mission?.status === "ACTIVE";
}

/**
 * Filters an already-fetched Obligation list down to the ones currently
 * eligible for attention/intelligence consumption, given an already-fetched
 * lookup of Missions by id. Pure — no I/O; the caller (application layer)
 * does the fetching. `missionsById` need only contain the Missions actually
 * referenced; a missing entry is treated as "unresolved reference" (see
 * isObligationCurrentlyEligible's doc comment).
 */
export function filterCurrentlyEligibleObligations(
  obligations: Obligation[],
  missionsById: ReadonlyMap<string, Mission>,
): Obligation[] {
  return obligations.filter((o) =>
    isObligationCurrentlyEligible(o, o.missionId ? missionsById.get(o.missionId) : undefined),
  );
}
