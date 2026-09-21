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
 *
 * I3 (generalization proof, 2026-08-23): "progression" is the second
 * independent producer (engine/progression.ts's TRAIN advisory, composed
 * in engine/advisory.ts), proving this union — and the AdvisoryNote
 * contract itself — was never Obligation-specific. Each producer stays
 * ignorant of the others; only this shared type and the application-layer
 * orchestrator (advisoryQueries.ts's getAdvisoryNotes) know more than one
 * exists.
 *
 * JOURNAL-001 (2026-09-15): "decisionJournal" is the third producer
 * (engine/journalRelevance.ts's keyword-relevance match over reviewed
 * Decision Journal entries, composed in engine/advisory.ts) — same
 * pattern, still ignorant of the other two.
 *
 * DAY-ROLLOVER-001 (2026-09-21): "dayRolloverAmbiguity" flags a PRIMARY
 * sleep log landing on a BeyondDay that was itself created by an
 * automatic 16:30 rollover rather than an explicit/lazy start — real
 * ambiguity about which lived day that sleep actually closes, per the
 * Sleep/Day-Ownership Model's own "lived days, not calendar days"
 * reasoning. Never guessed/resolved automatically — only flagged.
 */
export type AdvisorySourceModule =
  | "obligationRelevance"
  | "progression"
  | "decisionJournal"
  | "shiftProtection"
  | "continuity"
  | "patternProposal"
  | "dayRolloverAmbiguity";

/**
 * FOUNDATION-1B (Attention Authority, 2026-09-20): a bounded, three-level
 * formalization of the attention-escalation concept
 * `OPERATOR_INTERFACE_DOCTRINE.md` already states in prose (its four-state
 * AVAILABLE/SUGGESTED/ATTENTION/CRITICAL model). QUIET/SURFACE/INTERRUPT is
 * a narrower, code-level vocabulary for exactly one thing: how insistently
 * an already-informational `AdvisoryNote` presents itself. It carries no
 * authority of its own — an INTERRUPT-tier note is still only ever an
 * `AdvisoryNote`: no priority, no suggestedCommand, never accepted/
 * declined/executed, never an `evaluate.ts` input (see this file's doc
 * comment above and `.claude/rules/engine.md`). Distinct from TodayScreen's
 * own pre-existing "ATTENTION" budget (the 2-slot Commitments/Capture/
 * pending-outcome surfacing mechanism) — that budget is unchanged by this
 * addition; INTERRUPT-tier notes still render through the same quiet
 * ADVISORY section, only more prominently within it.
 *
 * QUIET: BEYOND may know something without interrupting — the default for
 * every producer that existed before this Drop (obligation relevance,
 * TRAIN progression, Decision Journal lessons).
 * SURFACE: deserves elevated visibility at the appropriate moment, but not
 * urgent — used for a REINTRODUCE continuity resolution (still relevant,
 * currently appropriate, but not a protection-shaped conflict).
 * INTERRUPT: rare, reserved for a meaningful conflict or the protection of
 * an important constraint (FOUNDATION-1B's one narrow trigger: a
 * shift-protection concern per `engine/shiftProtection.ts`). Still
 * advisory — it never blocks, executes, or bypasses user decision.
 */
export type AttentionLevel = "QUIET" | "SURFACE" | "INTERRUPT";

export interface AdvisoryNote {
  id: string;
  sourceModule: AdvisorySourceModule;
  message: string;
  basis: AdvisoryNoteBasisEntry[];
  /** Optional link to the Recommendation this note accompanies — purely referential, never mutates it. */
  relatedRecommendationId?: string;
  /** See AttentionLevel's doc comment above. Required so every producer states its tier explicitly rather than an implicit default. */
  attentionLevel: AttentionLevel;
}
