import type { Obligation } from "../domain/intent/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import type { ExercisePrescription } from "../domain/workout/types";
import type { RecommendationKind } from "../domain/common/types";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { classifyObligation, isAttentionWorthyTier } from "./obligationRelevance";
import type { ProgressionSuggestion } from "./progression";
import type { ShiftProtectionConcern } from "./shiftProtection";
import type { ContinuityResolution } from "./continuity";
import type { PatternProposal } from "./patternProposal";
import type { DayRolloverAmbiguity } from "./dayRollover";

/**
 * Intelligence Spine — I1 (architectural seam, first slice, approved
 * 2026-08-22) / I3 (second-producer generalization proof, approved
 * 2026-08-23) / JOURNAL-001 (third-producer, direct owner sign-off,
 * 2026-09-15). Pure, deterministic composition of already-locked
 * interpretation output — today from five independent sources
 * (obligationRelevance.ts's tier classification; progression.ts's TRAIN
 * advisory; journalRelevance.ts's keyword-relevance match over reviewed
 * Decision Journal entries; FOUNDATION-1B's shiftProtection.ts pre-shift
 * concern; FOUNDATION-1B's continuity.ts DROP/DEFER/REINTRODUCE
 * resolution) — into the shared AdvisoryNote contract
 * (domain/intelligence/types.ts). Each composer function below knows
 * about exactly one domain; none is aware the others exist — this file
 * is only where their outputs share a common shape, never where
 * cross-domain policy would live.
 *
 * Directionality is one-way and must stay that way: this module may
 * import from engine/obligationRelevance.ts, engine/progression.ts,
 * engine/journalRelevance.ts's types, engine/shiftProtection.ts,
 * engine/continuity.ts, and engine/evaluate.ts's types, but none of those
 * may import from this module (regression-tested in
 * tests/engine/advisory.test.ts). Advisory composition sits strictly
 * downstream of RECOMMEND-stage and INTERPRET-stage output — it never
 * feeds back into Engine arbitration. See .claude/rules/engine.md.
 *
 * No new judgment or threshold is introduced here: ATTENTION_WORTHY_TIERS
 * (obligationRelevance.ts), progression.ts's INCREASE/HOLD/REDUCE rule,
 * and journalRelevance.ts's relevance match are all already-decided
 * elsewhere. This module only restates already-true, already-selected
 * facts in the shared advisory shape — it does not decide anything new,
 * for any producer, including which journal entries counted as relevant
 * (that judgment lives entirely in journalRelevance.ts).
 */
export function composeAdvisoryNotesFromObligations(obligations: Obligation[], today: string): AdvisoryNote[] {
  const notes: AdvisoryNote[] = [];

  for (const obligation of obligations) {
    const tier = classifyObligation(obligation, today);
    if (!isAttentionWorthyTier(tier)) continue;

    notes.push({
      id: crypto.randomUUID(),
      sourceModule: "obligationRelevance",
      message: `${obligation.title} — ${tier}`,
      basis: [
        { key: "obligationId", value: obligation.id },
        { key: "tier", value: tier },
        ...(obligation.dueAt ? [{ key: "dueAt", value: obligation.dueAt }] : []),
        ...(obligation.plannedAt ? [{ key: "plannedAt", value: obligation.plannedAt }] : []),
      ],
      attentionLevel: "QUIET",
    });
  }

  return notes;
}

/**
 * I3: the second independent producer. Only INCREASE/REDUCE are advisory-
 * worthy — HOLD ("nothing changes") and NO_HISTORY ("nothing to advise on
 * yet") carry no new information to surface, mirroring how
 * composeAdvisoryNotesFromObligations only emits for attention-worthy
 * tiers. Returns null rather than a note for the non-notable cases — the
 * caller (advisoryQueries.ts) filters these out, same pattern as any
 * per-item classifier in this codebase.
 */
export function composeAdvisoryNoteFromProgression(
  prescription: ExercisePrescription,
  suggestion: ProgressionSuggestion,
): AdvisoryNote | null {
  if (suggestion.recommendation !== "INCREASE" && suggestion.recommendation !== "REDUCE") return null;

  return {
    id: crypto.randomUUID(),
    sourceModule: "progression",
    message: `${prescription.name} — ${suggestion.recommendation}`,
    basis: [
      { key: "exerciseId", value: prescription.exerciseId },
      { key: "recommendation", value: suggestion.recommendation },
      { key: "reason", value: suggestion.reason },
      ...(suggestion.lastWeight !== undefined ? [{ key: "lastWeight", value: suggestion.lastWeight }] : []),
      ...(suggestion.suggestedNextWeight !== undefined
        ? [{ key: "suggestedNextWeight", value: suggestion.suggestedNextWeight }]
        : []),
    ],
    attentionLevel: "QUIET",
  };
}

/**
 * JOURNAL-001: the third independent producer. Only entries that actually
 * carry a recorded Lesson are advisory-worthy — the approved scope is
 * "surface past Journal entries' Lessons," not bare decisions/outcomes
 * with nothing learned. A REVIEWED entry with no lesson returns null,
 * same pattern as composeAdvisoryNoteFromProgression's HOLD/NO_HISTORY
 * case. The caller (advisoryQueries.ts) already hands this composer only
 * entries journalRelevance.ts judged relevant to the current situation —
 * this function adds no relevance judgment of its own, only reshapes an
 * already-selected entry into the shared AdvisoryNote contract.
 */
export function composeAdvisoryNoteFromJournal(entry: DecisionJournalEntry): AdvisoryNote | null {
  if (!entry.lesson) return null;

  return {
    id: crypto.randomUUID(),
    sourceModule: "decisionJournal",
    message: `${entry.title} — ${entry.lesson}`,
    basis: [
      { key: "decisionJournalEntryId", value: entry.id },
      { key: "decision", value: entry.decision },
      { key: "lesson", value: entry.lesson },
      ...(entry.outcome ? [{ key: "outcome", value: entry.outcome }] : []),
    ],
    attentionLevel: "QUIET",
  };
}

/**
 * FOUNDATION-1B — the fourth producer, and the only one that ever emits at
 * INTERRUPT tier. Reshapes an already-computed `ShiftProtectionConcern`
 * (`engine/shiftProtection.ts`) into the shared AdvisoryNote contract — it
 * adds no new judgment of its own, same "restate, don't decide" discipline
 * every other composer in this file follows. Doctrine test before calling
 * this INTERRUPT rather than SURFACE: "reserved for meaningful conflicts or
 * protection of important obligations" — a pre-shift hydration/protein gap
 * is exactly that (irreversible once the shift starts), and
 * `evaluateShiftProtection` already gates this to only fire when capacity
 * is not already RED/YELLOW (something else already has authority then).
 */
export function composeAdvisoryNoteFromShiftProtection(concern: ShiftProtectionConcern): AdvisoryNote {
  const items = concern.unmetItems.map((item) => item.toLowerCase()).join(" and ");
  return {
    id: crypto.randomUUID(),
    sourceModule: "shiftProtection",
    message: `Shift is coming up and ${items} still ${concern.unmetItems.length > 1 ? "haven't" : "hasn't"} been logged today.`,
    basis: concern.unmetItems.map((item) => ({ key: "unmetItem", value: item })),
    attentionLevel: "INTERRUPT",
  };
}

/**
 * FOUNDATION-1B — the fifth producer. Only a REINTRODUCE resolution is
 * advisory-worthy: DROP and DEFER are both deliberately silent (NO_CATCH_UP
 * — BEYOND does not narrate every piece of history it chose not to carry
 * forward), matching how composeAdvisoryNoteFromProgression's HOLD case and
 * composeAdvisoryNotesFromObligations' non-attention-worthy tiers already
 * return nothing rather than a note. SURFACE, not INTERRUPT: "still
 * relevant and currently appropriate" is real information, not a conflict
 * or a protected constraint.
 */
export function composeAdvisoryNoteFromContinuity(
  priorKind: RecommendationKind,
  priorTitle: string,
  resolution: ContinuityResolution,
): AdvisoryNote | null {
  if (resolution !== "REINTRODUCE") return null;

  return {
    id: crypto.randomUUID(),
    sourceModule: "continuity",
    message: `"${priorTitle}" from last time is still relevant today.`,
    basis: [
      { key: "priorKind", value: priorKind },
      { key: "resolution", value: resolution },
    ],
    attentionLevel: "SURFACE",
  };
}

/**
 * FOUNDATION-1B — the sixth producer, Scenario F. Named small-N in its own
 * message text (never "you usually..." or any confidence claim beyond the
 * literal count) — NO_FAKE_PRECISION and doctrine's "Small-N observations
 * can suggest a pattern... but cannot silently become doctrine." Purely
 * observational: naming the proposal is the entire behavior. Nothing here
 * changes any plan, threshold, or Engine input — USER DECIDES what, if
 * anything, to do about it.
 */
export function composeAdvisoryNoteFromPatternProposal(proposal: PatternProposal): AdvisoryNote {
  return {
    id: crypto.randomUUID(),
    sourceModule: "patternProposal",
    message: `Your last ${proposal.count} "${proposal.kind}" outcomes were all rated ${proposal.rating}. Worth a look — nothing has changed automatically.`,
    basis: [
      { key: "kind", value: proposal.kind },
      { key: "rating", value: proposal.rating },
      { key: "count", value: proposal.count },
    ],
    attentionLevel: "SURFACE",
  };
}

/**
 * DAY-ROLLOVER-001 — the seventh producer. Reshapes an already-computed
 * DayRolloverAmbiguity (engine/dayRollover.ts) into the shared
 * AdvisoryNote contract, same "restate, don't decide" discipline as every
 * other composer here. SURFACE, not INTERRUPT: real information worth a
 * look, not a protection-shaped conflict — it never blocks, reassigns, or
 * mutates the sleep log it flags.
 */
export function composeAdvisoryNoteFromDayRolloverAmbiguity(concern: DayRolloverAmbiguity): AdvisoryNote {
  return {
    id: crypto.randomUUID(),
    sourceModule: "dayRolloverAmbiguity",
    message: "A primary sleep log landed on a day that started from an automatic rollover — worth checking it's attributed to the day you meant.",
    basis: [{ key: "concern", value: concern.kind }],
    attentionLevel: "SURFACE",
  };
}
