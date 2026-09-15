import type { Obligation } from "../domain/intent/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import type { ExercisePrescription } from "../domain/workout/types";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { classifyObligation, isAttentionWorthyTier } from "./obligationRelevance";
import type { ProgressionSuggestion } from "./progression";

/**
 * Intelligence Spine — I1 (architectural seam, first slice, approved
 * 2026-08-22) / I3 (second-producer generalization proof, approved
 * 2026-08-23) / JOURNAL-001 (third-producer, direct owner sign-off,
 * 2026-09-15). Pure, deterministic composition of already-locked
 * interpretation output — today from three independent sources
 * (obligationRelevance.ts's tier classification; progression.ts's TRAIN
 * advisory; journalRelevance.ts's keyword-relevance match over reviewed
 * Decision Journal entries) — into the shared AdvisoryNote contract
 * (domain/intelligence/types.ts). Each composer function below knows
 * about exactly one domain; none is aware the others exist — this file
 * is only where their outputs share a common shape, never where
 * cross-domain policy would live.
 *
 * Directionality is one-way and must stay that way: this module may
 * import from engine/obligationRelevance.ts, engine/progression.ts,
 * engine/journalRelevance.ts's types, and engine/evaluate.ts's types, but
 * none of those may import from this module (regression-tested in
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
  };
}
