import { z } from "zod";
import type { DecisionJournalEntry } from "../domain/journal/types";

/**
 * Decision Journal. Same shared-schema pattern as intentValidation.ts: an
 * *Input schema validates a command's caller-supplied fields (throws via
 * .parse()); the full record schema validates what comes back out of
 * Dexie on every read (safeParse, never throws — an invalid row is
 * excluded from query results, not treated as canonical truth).
 */

const statusSchema = z.enum(["OPEN", "REVIEWED"]);
const sourceSchema = z.enum(["USER", "ENGINE", "SYSTEM"]);

const entryInputFields = {
  title: z.string().trim().min(1, "Decision title is required"),
  context: z.string().trim().min(1).optional(),
  options: z.string().trim().min(1).optional(),
  decision: z.string().trim().min(1, "Decision is required"),
  reasoning: z.string().trim().min(1).optional(),
  expectation: z.string().trim().min(1).optional(),
};

/** Input to createDecisionJournalEntry. id/status/source/seq/createdAt/updatedAt are assigned by the command, not the caller. */
export const decisionJournalEntryInputSchema = z.object(entryInputFields);
export type DecisionJournalEntryInput = z.infer<typeof decisionJournalEntryInputSchema>;

/** Input to modifyDecisionJournalEntry — same fields, all optional, at least one required. */
export const decisionJournalEntryModifyInputSchema = z
  .object({
    title: entryInputFields.title.optional(),
    context: entryInputFields.context,
    options: entryInputFields.options,
    decision: entryInputFields.decision.optional(),
    reasoning: entryInputFields.reasoning,
    expectation: entryInputFields.expectation,
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field must change");
export type DecisionJournalEntryModifyInput = z.infer<typeof decisionJournalEntryModifyInputSchema>;

/** Input to reviewDecisionJournalEntry — both required; a review without at least an outcome isn't a review. */
export const decisionJournalEntryReviewInputSchema = z.object({
  outcome: z.string().trim().min(1, "Outcome is required to review a decision"),
  lesson: z.string().trim().min(1).optional(),
});
export type DecisionJournalEntryReviewInput = z.infer<typeof decisionJournalEntryReviewInputSchema>;

export const decisionJournalEntrySchema = z.object({
  id: z.string().min(1),
  title: entryInputFields.title,
  context: entryInputFields.context,
  options: entryInputFields.options,
  decision: entryInputFields.decision,
  reasoning: entryInputFields.reasoning,
  expectation: entryInputFields.expectation,
  outcome: z.string().optional(),
  lesson: z.string().optional(),
  status: statusSchema,
  linkedRecommendationId: z.string().min(1).optional(),
  source: sourceSchema,
  seq: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewedAt: z.string().optional(),
});

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseDecisionJournalEntry(raw: unknown): DecisionJournalEntry | null {
  const result = decisionJournalEntrySchema.safeParse(raw);
  return result.success ? (result.data as DecisionJournalEntry) : null;
}
