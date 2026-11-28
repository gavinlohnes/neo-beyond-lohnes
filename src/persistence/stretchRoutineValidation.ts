import { z } from "zod";
import { STRETCH_BY_ID, STRETCH_HOLD_MAX, STRETCH_HOLD_MIN, STRETCH_NAME_MAX, STRETCH_ROUNDS_MAX, STRETCH_STEPS_MAX, type StretchRoutine } from "../domain/workout/stretchLibrary";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: a STRETCH_ROUTINES_SET payload as stored. Never throws on read: a malformed event
 * is skipped and the one before it (or the starters) stands.
 */
const stepSchema = z.object({
  stretchId: z.string().refine((id) => STRETCH_BY_ID.has(id)),
  holdSeconds: z.number().int().min(STRETCH_HOLD_MIN).max(STRETCH_HOLD_MAX),
  bothSides: z.boolean(),
  rounds: z.number().int().min(1).max(STRETCH_ROUNDS_MAX),
});
const routineSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(STRETCH_NAME_MAX),
  steps: z.array(stepSchema).min(1).max(STRETCH_STEPS_MAX),
  starter: z.enum(["AFTER_SHIFT", "BEFORE_SLEEP", "AFTER_LIFTING"]).optional(),
});
export const stretchRoutinesPayloadSchema = z.object({
  commandId: z.string().min(1),
  previousId: z.string().min(1).nullable(),
  routines: z.array(routineSchema).max(50),
});
export type StretchRoutinesPayload = z.infer<typeof stretchRoutinesPayloadSchema>;

export function parseStretchRoutinesPayload(value: unknown): { previousId: string | null; routines: StretchRoutine[] } | null {
  const parsed = stretchRoutinesPayloadSchema.safeParse(value);
  if (!parsed.success) return null;
  return { previousId: parsed.data.previousId, routines: parsed.data.routines.map((r) => ({ id: r.id, name: r.name, steps: r.steps, ...(r.starter ? { starter: r.starter } : {}) })) };
}
