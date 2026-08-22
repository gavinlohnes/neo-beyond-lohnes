import type { Obligation } from "../domain/intent/types";
import type { AdvisoryNote } from "../domain/intelligence/types";
import { classifyObligation, isAttentionWorthyTier } from "./obligationRelevance";

/**
 * Intelligence Spine — I1 (architectural seam, first slice, approved
 * 2026-08-22). Pure, deterministic composition of already-locked
 * interpretation output (obligationRelevance.ts's tier classification)
 * into the shared AdvisoryNote contract (domain/intelligence/types.ts).
 *
 * Directionality is one-way and must stay that way: this module may
 * import from engine/obligationRelevance.ts and engine/evaluate.ts's
 * types, but obligationRelevance.ts and evaluate.ts must never import
 * from this module (regression-tested in tests/engine/advisory.test.ts).
 * Advisory composition sits strictly downstream of RECOMMEND-stage and
 * INTERPRET-stage output — it never feeds back into Engine arbitration.
 * See .claude/rules/engine.md.
 *
 * No new judgment or threshold is introduced here: ATTENTION_WORTHY_TIERS
 * (obligationRelevance.ts) and the temporal classification rule it
 * implements are both already-locked Drop 02 product rulings. This module
 * only restates already-true, already-classified facts in the shared
 * advisory shape — it does not decide anything new.
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
