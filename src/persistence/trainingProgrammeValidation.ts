import { z } from "zod";
import { WEEKDAY_SLOTS, ROTATION_SLOTS } from "../domain/workout/trainingProgramme";
import { customWorkoutTemplateInputSchema } from "./workoutTemplateValidation";

const assignedProgrammeSchema = z.object({
  mode: z.enum(["WEEKDAYS", "ROTATION"]),
  slots: z.record(z.string().min(1).max(10), z.string().trim().min(1).max(100)),
}).strict().superRefine((value, ctx) => {
  const keys: readonly string[] = value.mode === "WEEKDAYS" ? WEEKDAY_SLOTS : ROTATION_SLOTS;
  for (const key of Object.keys(value.slots)) if (!keys.includes(key)) ctx.addIssue({ code: "custom", path: ["slots", key], message: "Unknown programme slot." });
});

const sequenceMemberSchema = z.object({
  key: z.enum(["A", "B", "C"]),
  templateId: z.string().trim().min(1).max(100),
  snapshot: customWorkoutTemplateInputSchema,
  home: z.object({ templateId: z.string().trim().min(1).max(100), snapshot: customWorkoutTemplateInputSchema }).strict().optional(),
}).strict();

const sequenceProgrammeSchema = z.object({
  mode: z.literal("SEQUENCE"),
  members: z.tuple([sequenceMemberSchema, sequenceMemberSchema, sequenceMemberSchema]),
  startTemplateId: z.string().trim().min(1).max(100),
}).strict().superRefine((value, ctx) => {
  const ids = value.members.map((member) => member.templateId);
  if (new Set(ids).size !== 3) ctx.addIssue({ code: "custom", path: ["members"], message: "Sequence members must use three different templates." });
  if (value.members.map((member) => member.key).join("") !== "ABC") ctx.addIssue({ code: "custom", path: ["members"], message: "Sequence member keys must be A, B and C in order." });
  if (!ids.includes(value.startTemplateId)) ctx.addIssue({ code: "custom", path: ["startTemplateId"], message: "Starting member must belong to the sequence." });
  const homeIds = value.members.flatMap((member) => member.home ? [member.home.templateId] : []);
  if (new Set(homeIds).size !== homeIds.length) ctx.addIssue({ code: "custom", path: ["members"], message: "HOME forms must use different templates." });
});

export const trainingProgrammeSchema = z.union([assignedProgrammeSchema, sequenceProgrammeSchema]);
export const trainingProgrammeEventSchema = z.object({
  commandId: z.string().min(1), previousId: z.string().min(1).nullable(), programme: trainingProgrammeSchema.nullable(),
}).strict();
