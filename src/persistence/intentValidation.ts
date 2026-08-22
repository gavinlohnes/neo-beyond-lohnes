import { z } from "zod";
import type { Mission, Obligation } from "../domain/intent/types";

/**
 * Intent & Commitment Spine — Drop 01. Same shared-schema pattern as
 * schedulePatternValidation.ts: an *Input schema validates a command's
 * caller-supplied fields (throws via .parse() — a mistake here is the
 * user's own live edit, not a possibly-corrupted imported file, so it
 * should surface immediately); the full record schema validates what
 * comes back out of Dexie on every read (safeParse, never throws —
 * "invalid records must not silently become canonical truth" is
 * satisfied by simply excluding them from query results, not by
 * crashing or destructively deleting them).
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const missionStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
const obligationStatusSchema = z.enum(["OPEN", "WAITING", "SATISFIED", "RELEASED"]);
const sourceSchema = z.enum(["USER", "ENGINE", "SYSTEM"]);

const recurrenceRuleSchema = z.object({
  freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interval: z.number().int().min(1),
});

const missionInputFields = {
  title: z.string().trim().min(1, "Mission title is required"),
  description: z.string().trim().min(1).optional(),
};

/** Input to createMission. id/status/source/seq/createdAt/updatedAt are assigned by the command, not the caller. */
export const missionInputSchema = z.object(missionInputFields);
export type MissionInput = z.infer<typeof missionInputSchema>;

/** Input to modifyMission — same fields, all optional, at least one required. */
export const missionModifyInputSchema = z
  .object({ title: missionInputFields.title.optional(), description: missionInputFields.description })
  .refine((v) => v.title !== undefined || v.description !== undefined, "At least one field must change");
export type MissionModifyInput = z.infer<typeof missionModifyInputSchema>;

export const missionSchema = z.object({
  id: z.string().min(1),
  title: missionInputFields.title,
  description: missionInputFields.description,
  status: missionStatusSchema,
  source: sourceSchema,
  seq: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseMission(raw: unknown): Mission | null {
  const result = missionSchema.safeParse(raw);
  return result.success ? (result.data as Mission) : null;
}

const obligationInputFields = {
  title: z.string().trim().min(1, "Obligation title is required"),
  description: z.string().trim().min(1).optional(),
  missionId: z.string().min(1).optional(),
  dueAt: z.string().regex(DATE_ONLY, "dueAt must be YYYY-MM-DD").optional(),
  plannedAt: z.string().regex(DATE_ONLY, "plannedAt must be YYYY-MM-DD").optional(),
  recurrence: recurrenceRuleSchema.optional(),
};

/** Input to createObligation. */
export const obligationInputSchema = z.object(obligationInputFields);
export type ObligationInput = z.infer<typeof obligationInputSchema>;

/** Input to modifyObligation — same fields, all optional, at least one required. */
export const obligationModifyInputSchema = z
  .object({
    title: obligationInputFields.title.optional(),
    description: obligationInputFields.description,
    missionId: obligationInputFields.missionId,
    dueAt: obligationInputFields.dueAt,
    plannedAt: obligationInputFields.plannedAt,
    recurrence: obligationInputFields.recurrence,
  })
  .refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field must change");
export type ObligationModifyInput = z.infer<typeof obligationModifyInputSchema>;

export const obligationSchema = z.object({
  id: z.string().min(1),
  title: obligationInputFields.title,
  description: obligationInputFields.description,
  status: obligationStatusSchema,
  missionId: obligationInputFields.missionId,
  dueAt: obligationInputFields.dueAt,
  plannedAt: obligationInputFields.plannedAt,
  resolvedAt: z.string().optional(),
  resolutionNote: z.string().optional(),
  recurrence: recurrenceRuleSchema.optional(),
  source: sourceSchema,
  seq: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Never throws. Returns null on any validation failure so callers can exclude the row rather than crash on it. */
export function parseObligation(raw: unknown): Obligation | null {
  const result = obligationSchema.safeParse(raw);
  return result.success ? (result.data as Obligation) : null;
}
