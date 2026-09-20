import type { RecommendationKind } from "../domain/common/types";

/**
 * FOUNDATION-1B — Section 6 (Outcome Feedback), Scenario F ("learning
 * without takeover"). Deliberately the smallest possible read: a single,
 * non-persistent, non-automatic "surface a proposal" computation, never a
 * scoring system, never a stored pattern record, never anything that
 * silently adjusts a plan/doctrine/threshold. Per this Drop's own
 * exclusions and the README's "Explicitly out of scope: any AI/learning
 * layer over workout data" — this is the one narrow exception the
 * FOUNDATION-1B brief itself authorizes (PATTERN -> PROPOSAL -> USER
 * DECIDES), scoped to exactly one deterministic rule with an explicit,
 * named small-N count in its own copy (OPERATOR_INTERFACE_DOCTRINE.md's
 * "Small-N observations can suggest a pattern... but cannot silently
 * become doctrine, universal truth, or automation").
 *
 * Pure: recomputed fresh from already-stored Outcome ratings on every
 * read (application/continuityQueries.ts's getPatternProposal) — nothing
 * here is itself stored, and nothing it returns can be accepted/declined/
 * executed. It is read-only INTERPRET-adjacent material, same posture as
 * every other AdvisoryNote producer.
 */

export const PATTERN_PROPOSAL_MIN_COUNT = 3;

export interface RatedOutcomeSample {
  kind: RecommendationKind;
  rating: "GOOD" | "NEUTRAL" | "BAD";
}

export interface PatternProposal {
  kind: RecommendationKind;
  rating: "GOOD" | "BAD";
  count: number;
}

/**
 * `samples` must already be sorted most-recent-first by the caller (same
 * discipline every other engine module leaves to its application-layer
 * caller — this module does no I/O and knows nothing about `recordedAt`).
 * Fires only when the most recent PATTERN_PROPOSAL_MIN_COUNT ratings share
 * both the same Recommendation kind and the same non-NEUTRAL rating —
 * NEUTRAL is deliberately never proposal-worthy (nothing to act on).
 */
export function detectRepeatedRatingPattern(samples: RatedOutcomeSample[]): PatternProposal | null {
  if (samples.length < PATTERN_PROPOSAL_MIN_COUNT) return null;

  const recent = samples.slice(0, PATTERN_PROPOSAL_MIN_COUNT);
  const first = recent[0]!;
  if (first.rating === "NEUTRAL") return null;

  const allSame = recent.every((s) => s.kind === first.kind && s.rating === first.rating);
  if (!allSame) return null;

  return { kind: first.kind, rating: first.rating, count: PATTERN_PROPOSAL_MIN_COUNT };
}
