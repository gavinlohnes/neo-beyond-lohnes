import { z } from "zod";
import { WEEKDAY_SLOTS, ROTATION_SLOTS } from "../domain/workout/trainingProgramme";
export const trainingProgrammeSchema = z.object({
  mode: z.enum(["WEEKDAYS", "ROTATION"]),
  slots: z.record(z.string().min(1).max(10), z.string().trim().min(1).max(100)),
}).strict().superRefine((value, ctx) => {
  const keys: readonly string[] = value.mode === "WEEKDAYS" ? WEEKDAY_SLOTS : ROTATION_SLOTS;
  for (const key of Object.keys(value.slots)) if (!keys.includes(key)) ctx.addIssue({ code: "custom", path: ["slots", key], message: "Unknown programme slot." });
});
export const trainingProgrammeEventSchema = z.object({
  commandId: z.string().min(1), previousId: z.string().min(1).nullable(), programme: trainingProgrammeSchema.nullable(),
}).strict();
