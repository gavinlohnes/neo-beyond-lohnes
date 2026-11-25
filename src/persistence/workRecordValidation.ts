import { z } from "zod";
import {
  WORK_DATE_TYPES, WORK_HOURS_MAX, WORK_NOTE_MAX, WORK_REMIND_MAX, WORK_TITLE_MAX, isWorkDate, isWorkTime,
  type WorkRecord,
} from "../domain/workRecords";

/**
 * GRAYSON-WORK-RECORD-001: a hand-edited or damaged backup can hold a malformed work-record row. Readers use this to
 * skip such a row, never to crash Work record or TODAY.
 */
const date = z.string().refine(isWorkDate);
const iso = z.string().refine((v) => Number.isFinite(Date.parse(v)));
const fields = {
  kind: z.enum(["TRAINING", "CERTIFICATION", "WORK_DATE", "MILESTONE"]),
  title: z.string().min(1).max(WORK_TITLE_MAX),
  date: date.optional(),
  hours: z.number().positive().max(WORK_HOURS_MAX).optional(),
  note: z.string().max(WORK_NOTE_MAX).optional(),
  earnedOn: date.optional(),
  expiresOn: date.optional(),
  time: z.string().refine(isWorkTime).optional(),
  workType: z.enum(WORK_DATE_TYPES as unknown as [string, ...string[]]).optional(),
  remind: z.boolean().optional(),
  remindDays: z.number().int().min(0).max(WORK_REMIND_MAX).optional(),
  doneAt: iso.optional(),
};
const fieldsSchema = z.object(fields);
const workRecordSchema = z.object({
  ...fields,
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "REMOVED"]),
  history: z.array(z.object({ at: iso, action: z.enum(["ADDED", "CHANGED", "REMOVED", "RESTORED"]), before: fieldsSchema.optional() })),
  createdAt: iso,
  updatedAt: iso,
}).refine((r) => r.kind === "CERTIFICATION" || r.date !== undefined)
  .refine((r) => r.kind !== "TRAINING" || r.hours !== undefined);

/** The row as a WorkRecord, or null if it is malformed. */
export function parseWorkRecord(row: unknown): WorkRecord | null {
  const parsed = workRecordSchema.safeParse(row);
  return parsed.success ? (parsed.data as WorkRecord) : null;
}
