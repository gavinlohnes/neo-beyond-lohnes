import { db } from "../persistence/db";
import { writeAtomically } from "./atomicWrite";
import { logIntentEvent } from "./intentCommands";
import { learningResponseSchema, projectResponses, verdictOf, type LearningResponse } from "./learningLifecycle";
import type { LearningAction, LearningEvidence, NarrowPreset } from "../domain/learningLifecycle";

/**
 * GRAYSON C6.1: his answer to one of Delta's learnings, appended as LEARNING_RESPONDED. Global (not day-scoped):
 * a learning outlives the day he answered on. `expectedHeadId` is the latest answer he saw; if another answer landed
 * since, nothing is written (the same tap twice is idempotent). Never touches recommendations, plans or the Engine.
 */
export async function respondToLearning(input: {
  learningId: string; action: LearningAction; statement: string; evidence: LearningEvidence;
  context?: { preset?: NarrowPreset | undefined; words?: string | undefined } | undefined;
  expectedHeadId: string | null;
}): Promise<LearningResponse> {
  return writeAtomically([], async () => {
    const chain = projectResponses(await db.events.where("type").equals("LEARNING_RESPONDED").toArray()).get(input.learningId) ?? [];
    const head = chain.at(-1) ?? null;
    const words = input.context?.words?.trim();
    const payload = learningResponseSchema.safeParse({
      learningId: input.learningId, action: input.action, statement: input.statement, evidence: input.evidence,
      ...(input.action === "NARROW" ? { context: { ...(input.context?.preset ? { preset: input.context.preset } : {}), ...(words ? { words } : {}) } } : {}),
      supersedes: input.expectedHeadId,
    });
    if (!payload.success) throw new Error(input.action === "NARROW" ? "Pick when it applies, or say it in a few words. Nothing was saved." : "That answer couldn't be saved. Nothing was changed.");
    if ((head?.id ?? null) !== input.expectedHeadId) {
      // The same answer already landed (a double tap): return it.
      if (head && head.supersedes === input.expectedHeadId && head.action === input.action && JSON.stringify(head.context) === JSON.stringify(payload.data.context)) return head;
      throw new Error("This learning changed elsewhere. Reopen it before answering. Nothing was saved.");
    }
    if (input.action === "UNDO" && !verdictOf(chain)) throw new Error("There's no answer to undo. Nothing was changed.");
    const id = await logIntentEvent("LEARNING_RESPONDED", payload.data, "USER", input.learningId, {}, input.expectedHeadId ?? undefined);
    const saved = projectResponses(await db.events.where("type").equals("LEARNING_RESPONDED").toArray()).get(input.learningId)!.find((r) => r.id === id);
    if (!saved) throw new Error("That answer couldn't be saved. Nothing was changed.");
    return saved;
  });
}
