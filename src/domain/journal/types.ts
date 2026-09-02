// Domain layer must not import React, Dexie, or UI code.

/**
 * Decision Journal (approved under the Whole-Life Capability North Star,
 * DEC-007; built 2026-09-02). General-purpose reflective journal for any
 * decision the operator wants to think through — not limited to BEYOND's
 * own Engine recommendations, though an entry may optionally reference
 * one. Shape: Context -> Options -> Decision -> Reasoning -> Expectation
 * (recorded at the time of the decision) -> Outcome -> Lesson (recorded
 * later, once there's something to review).
 *
 * Same treatment as Mission/Obligation (domain/intent/types.ts): the
 * canonical record is directly mutated (current state), while every
 * meaningful lifecycle change also produces a real historical
 * DomainEvent — never both a mutation AND silence. This is deliberately
 * NOT a correction chain like water/sleep/protein/bodyweight logs: a
 * journal entry evolves in place (you don't yet know the outcome when
 * you record the decision), matching Obligation's own directly-mutated
 * treatment rather than the *_CORRECTED event pattern.
 */

export type DecisionJournalStatus = "OPEN" | "REVIEWED";

export interface DecisionJournalEntry {
  id: string;
  title: string;
  context?: string;
  options?: string;
  decision: string;
  reasoning?: string;
  expectation?: string;
  /** Set only by reviewDecisionJournalEntry, alongside reviewedAt — what actually happened. */
  outcome?: string;
  /** Set only by reviewDecisionJournalEntry, alongside reviewedAt — what this decision teaches for next time. */
  lesson?: string;
  status: DecisionJournalStatus;
  /**
   * Optional tie-in to a specific BEYOND Recommendation, when this entry
   * is about one — e.g. "why did I decline this, and how did it actually
   * go." Stored so a future Drop that builds a picker UI for this doesn't
   * need a schema migration first (same reasoning as Obligation's
   * dormant `recurrence` field) — nothing in this Drop's UI sets it yet.
   */
  linkedRecommendationId?: string;
  /** See Mission.source's doc comment — same vocabulary, same reservation for a future BEYOND-proposed flow. Always "USER" today. */
  source: "USER" | "ENGINE" | "SYSTEM";
  /** See StateCheckIn.seq's doc comment in ../common/types.ts — same deterministic tie-break, same shared counter. */
  seq?: number;
  createdAt: string;
  updatedAt: string;
  /** Set only alongside outcome/lesson, when status becomes REVIEWED. */
  reviewedAt?: string;
}
