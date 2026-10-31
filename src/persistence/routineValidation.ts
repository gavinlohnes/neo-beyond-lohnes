import { z } from "zod";
import { ROUTINE_MOMENTS, type Routine } from "../domain/routines";

/** ROUTINES-001. Same shared-schema pattern as intentValidation.ts. */
export const MAX_ROUTINE_STEPS = 15;
const stepText = z.string().trim().min(1, "A step needs words").max(120);
const title = z.string().trim().min(1, "Routine name is required").max(80);
const moment = z.enum(ROUTINE_MOMENTS);

export const routineInputSchema = z.object({ title, moment, steps: z.array(stepText).min(1, "Add at least one step").max(MAX_ROUTINE_STEPS) });
export type RoutineInput = z.infer<typeof routineInputSchema>;

/** Steps keep their id when kept (so today's ticks stay with them); new ones get an id. */
export const routineModifyInputSchema = z.object({
  title: title.optional(),
  moment: moment.optional(),
  steps: z.array(z.object({ id: z.string().min(1).optional(), text: stepText })).min(1).max(MAX_ROUTINE_STEPS).optional(),
}).refine((v) => v.title !== undefined || v.moment !== undefined || v.steps !== undefined, "At least one field must change");
export type RoutineModifyInput = z.infer<typeof routineModifyInputSchema>;

export const routineSchema = z.object({
  id: z.string().min(1), title, moment,
  steps: z.array(z.object({ id: z.string().min(1), text: stepText })).min(1).max(MAX_ROUTINE_STEPS),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  source: z.enum(["USER", "ENGINE", "SYSTEM"]),
  seq: z.number().optional(), createdAt: z.string(), updatedAt: z.string(),
});

/** Never throws; an invalid row is excluded rather than trusted. */
export function parseRoutine(raw: unknown): Routine | null {
  const r = routineSchema.safeParse(raw);
  return r.success ? (r.data as Routine) : null;
}
