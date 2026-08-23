import { db } from "../persistence/db";
import type { BeyondDay, Outcome, Recommendation } from "../domain/common/types";
import { byTimeThenSeq, getRecommendationDecision, type RecommendationDecision } from "./queries";

export interface LedgerEntry {
  recommendation: Recommendation;
  /** undefined = not yet decided — a real, honest state, never rendered as any of the three real decisions. */
  decision: RecommendationDecision | undefined;
  /** undefined = no Outcome evidence exists yet. Never conflate with a BAD rating. */
  rating: NonNullable<Outcome["rating"]> | undefined;
  ratedAt: string | undefined;
}

export interface LedgerDay {
  day: BeyondDay;
  entries: LedgerEntry[];
}

/**
 * REVIEW 0.1 / Recommendation Ledger: a read-only join of every historical
 * Recommendation with its recorded decision (ACCEPTED/DECLINED/
 * NO_ACTION_RECORDED, or undefined if never decided) and, if one exists,
 * its Outcome rating. This is a pure generalization of
 * getPriorOutcomeMemory's already-proven join — same FK
 * (Outcome.recommendationId, never BeyondDay co-location), same
 * byTimeThenSeq + id tie-break determinism discipline — widened from "the
 * one most recent qualifying match" to "every Recommendation, faithfully."
 *
 * Never evaluates the Engine, never mutates anything, never produces a
 * trend/pattern/statistical claim (see docs/UX_DECISIONS.md's REVIEW
 * entry) — it only replays facts that already exist. "No rating yet" and
 * "rated BAD" are kept strictly distinct throughout: `rating` is
 * `undefined`, never a synthesized "unknown" sentinel that could be
 * mistaken for a real rating value.
 */
export async function getRecommendationLedger(): Promise<LedgerDay[]> {
  const [days, recommendations, outcomes] = await Promise.all([
    db.beyondDays.toArray(),
    db.recommendations.toArray(),
    db.outcomes.toArray(),
  ]);

  // Latest rated Outcome per recommendationId — identical tie-break
  // discipline to getPriorOutcomeMemory (queries.ts): recordedAt desc,
  // id as the stable final tie-break for a genuine same-instant collision.
  const ratedOutcomes = outcomes
    .filter(
      (o): o is Outcome & { recommendationId: string; rating: NonNullable<Outcome["rating"]> } =>
        o.recommendationId !== undefined && o.rating !== undefined,
    )
    .sort((a, b) => {
      const byRecordedAt = b.recordedAt.localeCompare(a.recordedAt);
      return byRecordedAt !== 0 ? byRecordedAt : a.id.localeCompare(b.id);
    });
  const latestRatingByRecommendation = new Map<string, (typeof ratedOutcomes)[number]>();
  for (const outcome of ratedOutcomes) {
    if (!latestRatingByRecommendation.has(outcome.recommendationId)) {
      latestRatingByRecommendation.set(outcome.recommendationId, outcome);
    }
  }

  const entriesByDay = new Map<string, LedgerEntry[]>();
  for (const recommendation of recommendations) {
    // Decision is reconstructed the exact same way TODAY's own WHY panel
    // does (getRecommendationDecision) — never inferred, never a second
    // interpretation of the same event stream.
    const decision = await getRecommendationDecision(recommendation.beyondDayId, recommendation.id);
    const outcome = latestRatingByRecommendation.get(recommendation.id);
    const entry: LedgerEntry = {
      recommendation,
      decision,
      rating: outcome?.rating,
      ratedAt: outcome?.recordedAt,
    };
    const list = entriesByDay.get(recommendation.beyondDayId) ?? [];
    list.push(entry);
    entriesByDay.set(recommendation.beyondDayId, list);
  }

  // Day ordering matches getHistoryDays exactly (most-recent-first by
  // startedAt) — same known, documented residual limitation (BeyondDay
  // carries no seq; see historyQueries.ts's comment) rather than a new one.
  const sortedDays = [...days].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const result: LedgerDay[] = [];
  for (const day of sortedDays) {
    const entries = entriesByDay.get(day.id);
    if (!entries || entries.length === 0) continue;
    // Most-recent-first within the day. A genuine same-instant tie (equal
    // issuedAt AND equal/absent seq) falls back to id — deterministic and
    // reproducible on every read, never a silently different order between
    // renders, but not itself a claim of proven causal precedence.
    entries.sort((a, b) => {
      const byRecency = byTimeThenSeq(
        b.recommendation.issuedAt,
        b.recommendation.seq,
        a.recommendation.issuedAt,
        a.recommendation.seq,
      );
      return byRecency !== 0 ? byRecency : a.recommendation.id.localeCompare(b.recommendation.id);
    });
    result.push({ day, entries });
  }
  return result;
}
