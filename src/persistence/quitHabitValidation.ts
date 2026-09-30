import { z } from "zod";
import type { QuitHabit } from "../domain/common/types";

/**
 * Drop 6 (quit tracker): same shared-schema pattern as
 * nutritionTargetValidation.ts — the read path falls back to "no habit set
 * up" on a malformed row; the write path rejects malformed input outright,
 * since that's the owner's own live edit. Omitted optional fields on save
 * mean "clear" here (unlike nutrition targets): the whole small form is
 * submitted every time, so an emptied field is a deliberate removal.
 */
const quitHabitFields = {
  name: z.string().trim().min(1).max(60),
  dailyCostUsd: z.number().min(0).max(10000).optional(),
  postShiftPlan: z.string().trim().max(280).optional(),
};

export const quitHabitInputSchema = z.object(quitHabitFields);
export type QuitHabitInput = z.infer<typeof quitHabitInputSchema>;

export const quitHabitSchema = z.object({
  id: z.string(),
  ...quitHabitFields,
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Never throws. Returns null on any validation failure so callers can decide the fallback. */
export function parseQuitHabit(raw: unknown): QuitHabit | null {
  const result = quitHabitSchema.safeParse(raw);
  return result.success ? (result.data as QuitHabit) : null;
}
