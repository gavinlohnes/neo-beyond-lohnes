// Domain layer must not import React, Dexie, or UI code.

/**
 * Intelligence Spine — I1 (architectural seam, first slice). The shared
 * contract any current or future pure interpretation module (today:
 * engine/advisory.ts; later: other read-only advisory sources) can emit.
 *
 * Locked scope for this Drop: informational only. An AdvisoryNote is
 * deliberately NOT a Recommendation and must never be treated like one —
 * that's why it has no `priority`, no `suggestedCommand`, and no field
 * resembling RecommendationKind. It cannot be accepted, declined, or
 * executed; it exists only to be read. INFORM -> INTERPRET -> RECOMMEND ->
 * USER DECIDES stays intact: the deterministic Engine (engine/evaluate.ts)
 * remains the sole source of RECOMMEND-stage output. AdvisoryNote is
 * INTERPRET-stage material a future bounded advisor may read alongside a
 * Recommendation — it never feeds back into Engine arbitration and never
 * silently overrides it or the user's own authority.
 *
 * `basis` mirrors DecisionTraceInput's shape (see domain/common/types.ts)
 * on purpose: the same "every recommendation carries a full WHY trace"
 * provenance doctrine applies here — an AdvisoryNote is never an opaque
 * assertion, always traceable to the already-true facts it summarizes.
 */
export interface AdvisoryNoteBasisEntry {
  key: string;
  value: string | number | boolean;
}

/**
 * Which pure interpretation module produced this note — provenance is
 * mandatory, matching Mission/Obligation's own `source` field doctrine
 * (BEYOND never surfaces unattributed interpretation).
 */
export type AdvisorySourceModule = "obligationRelevance";

export interface AdvisoryNote {
  id: string;
  sourceModule: AdvisorySourceModule;
  message: string;
  basis: AdvisoryNoteBasisEntry[];
  /** Optional link to the Recommendation this note accompanies — purely referential, never mutates it. */
  relatedRecommendationId?: string;
}
