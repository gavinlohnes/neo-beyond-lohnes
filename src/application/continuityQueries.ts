import { db } from "../persistence/db";
import type { BeyondDay, Recommendation } from "../domain/common/types";
import {
  deriveRecommendationDisposition,
  isMateriallyNewEvidence,
  resolveContinuity,
  type ContinuityResolution,
  type RecommendationDisposition,
} from "../engine/continuity";
import { deriveCapacity } from "../engine/capacity";
import { detectRepeatedRatingPattern, type PatternProposal, type RatedOutcomeSample } from "../engine/patternProposal";
import { byTimeThenSeq, getLatestCheckIn, getLatestRecommendation, getRecommendationDecision, hasUnresolvedPostShift } from "./queries";

/**
 * FOUNDATION-1B — application-layer gateway to engine/continuity.ts. Same
 * "persistence retrieves, engine interprets" split as scheduledContext.ts/
 * getScheduledContext: every function here does I/O only, and hands
 * already-true facts to a pure engine function rather than deciding
 * anything itself.
 */

/** All BeyondDays strictly before `beforeDay`, most-recent-first by startedAt. */
async function priorDays(beforeDay: BeyondDay): Promise<BeyondDay[]> {
  const all = await db.beyondDays.toArray();
  return all
    .filter((d) => d.startedAt < beforeDay.startedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export interface ContinuityCandidate {
  recommendation: Recommendation;
  resolution: ContinuityResolution;
}

/**
 * The most recent strictly-prior day's own latest Recommendation, resolved
 * into DROP/DEFER/REINTRODUCE against today's current capacity/post-shift
 * state. Returns null when there is no prior day, or its latest
 * Recommendation has nothing to resolve (DROP is a valid, common, silent
 * result — see composeAdvisoryNoteFromContinuity, which only emits a note
 * for REINTRODUCE).
 */
export async function resolvePriorDayContinuity(activeDay: BeyondDay): Promise<ContinuityCandidate | null> {
  const [earlierDays, checkIn, unresolvedPostShift] = await Promise.all([
    priorDays(activeDay),
    getLatestCheckIn(activeDay.id),
    hasUnresolvedPostShift(activeDay.id),
  ]);
  const priorDay = earlierDays[0];
  if (!priorDay) return null;

  const priorRecommendation = await getLatestRecommendation(priorDay.id);
  if (!priorRecommendation) return null;

  const priorDecision = await getRecommendationDecision(priorDay.id, priorRecommendation.id);

  const todayCapacity = checkIn ? deriveCapacity(checkIn).capacity : null;

  const resolution = resolveContinuity({
    priorKind: priorRecommendation.kind,
    priorDecision,
    todayCapacity,
    todayHasUnresolvedPostShift: unresolvedPostShift,
  });

  return { recommendation: priorRecommendation, resolution };
}

/**
 * REVIEW's read-time disposition for one Recommendation — reuses the exact
 * same decision-reconstruction path (getRecommendationDecision) as
 * TODAY's own WHY panel and getRecommendationLedger, so this is never a
 * second interpretation of the same event stream.
 */
export async function getRecommendationDisposition(recommendation: Recommendation): Promise<RecommendationDisposition> {
  const [decision, day, laterSiblings] = await Promise.all([
    getRecommendationDecision(recommendation.beyondDayId, recommendation.id),
    db.beyondDays.get(recommendation.beyondDayId),
    db.recommendations.where("beyondDayId").equals(recommendation.beyondDayId).toArray(),
  ]);

  const hasLaterRecommendationSameDay = laterSiblings.some(
    (other) =>
      other.id !== recommendation.id &&
      byTimeThenSeq(other.issuedAt, other.seq, recommendation.issuedAt, recommendation.seq) > 0,
  );

  return deriveRecommendationDisposition(
    decision,
    hasLaterRecommendationSameDay,
    day?.status ?? "ENDED",
  );
}

/**
 * Scenario E: was `current` preceded, on the exact same day, by a DECLINED
 * Recommendation whose full DecisionTrace is indistinguishable from
 * `current`'s own? Used to soften repeat-nagging presentation without
 * changing submitCheckIn's own issuance contract — the new Recommendation
 * row is still written and still honestly represents "the Engine
 * reassessed," this only answers whether the *result* is a genuine repeat.
 */
export async function wasRecommendationMateriallyRepeated(current: Recommendation): Promise<boolean> {
  const siblings = await db.recommendations.where("beyondDayId").equals(current.beyondDayId).toArray();
  const priorDeclined = siblings
    .filter(
      (other) =>
        other.id !== current.id &&
        byTimeThenSeq(other.issuedAt, other.seq, current.issuedAt, current.seq) < 0,
    )
    .sort((a, b) => byTimeThenSeq(b.issuedAt, b.seq, a.issuedAt, a.seq))[0];
  if (!priorDeclined) return false;

  const decision = await getRecommendationDecision(current.beyondDayId, priorDeclined.id);
  if (decision !== "DECLINED") return false;

  return !isMateriallyNewEvidence(priorDeclined.trace, current.trace);
}

/**
 * Scenario F: the most recent rated Outcomes, joined to their
 * Recommendation's kind, most-recent-first — the read
 * engine/patternProposal.ts's detectRepeatedRatingPattern requires.
 * Recomputed fresh on every call; nothing here is itself stored.
 */
export async function getPatternProposal(): Promise<PatternProposal | null> {
  const [outcomes, recommendations] = await Promise.all([db.outcomes.toArray(), db.recommendations.toArray()]);
  const recommendationById = new Map(recommendations.map((r) => [r.id, r]));

  const rated = outcomes
    .filter((o): o is typeof o & { recommendationId: string; rating: NonNullable<typeof o.rating> } =>
      o.recommendationId !== undefined && o.rating !== undefined,
    )
    .sort((a, b) => {
      const byRecordedAt = b.recordedAt.localeCompare(a.recordedAt);
      return byRecordedAt !== 0 ? byRecordedAt : a.id.localeCompare(b.id);
    });

  const samples: RatedOutcomeSample[] = [];
  for (const outcome of rated) {
    const recommendation = recommendationById.get(outcome.recommendationId);
    if (!recommendation) continue;
    samples.push({ kind: recommendation.kind, rating: outcome.rating });
  }

  return detectRepeatedRatingPattern(samples);
}
