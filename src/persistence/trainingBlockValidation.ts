import { z } from "zod";
import type { TrainingBlockSetPayload } from "../domain/workout/trainingBlock";

/** GRAYSON-BLOCK-CYCLE-001: a TRAINING_BLOCK_SET payload as stored. Never throws; a malformed one is skipped on read. */
const blockSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weeks: z.number().int().min(4).max(6),
  focus: z.array(z.string().min(1).max(40)).max(3),
  lightLastWeek: z.boolean(),
  normalWeeks: z.array(z.number().int().min(1).max(6)).optional(),
  endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weightDrops: z.record(z.string().min(1), z.number().min(1).max(50)).optional(),
});
const settingsSchema = z.object({
  sessionsShare: z.number().gt(0).max(1),
  weightDropPercent: z.number().min(1).max(50),
  lightFraction: z.number().gt(0).lt(1),
  focusRanges: z.record(z.string().min(1), z.tuple([z.number().int().min(0).max(40), z.number().int().min(0).max(40)])),
});
export const trainingBlockSetPayloadSchema = z.object({
  commandId: z.string().min(1),
  block: blockSchema.nullable(),
  settings: settingsSchema,
  reason: z.enum(["START", "CHANGE", "END", "NORMAL_WEEK", "SETTINGS", "UNDO", "NEXT"]),
  undoesEventId: z.string().min(1).optional(),
});

export function parseTrainingBlockSetPayload(raw: unknown): TrainingBlockSetPayload | null {
  const result = trainingBlockSetPayloadSchema.safeParse(raw);
  return result.success ? (result.data as TrainingBlockSetPayload) : null;
}
