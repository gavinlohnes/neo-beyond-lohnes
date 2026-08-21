import { z } from "zod";
import type { SchedulePattern } from "../domain/common/types";

/**
 * Drop 02a: SchedulePattern becomes canonical BEYOND-owned state (Dexie
 * table, included in native export/import automatically). Unlike the
 * dexie-export-import round trip itself, nothing enforces field-level
 * shape on the way back in — a hand-edited or corrupted backup file could
 * contain a malformed row. Shared by both the read path (queries.ts,
 * falls back to DEFAULT_SCHEDULE_PATTERN on failure — "unknown is better
 * than false precision") and the write path (commands.ts, rejects
 * malformed input outright since that's the user's own live edit, not an
 * imported file).
 */
const scheduleWeekDefinitionSchema = z.object({
  workdays: z.array(z.number().int().min(0).max(6)),
});

const scheduleFields = {
  anchorMonday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "anchorMonday must be YYYY-MM-DD"),
  weeks: z.array(scheduleWeekDefinitionSchema).min(1),
  shiftStartHour: z.number().int().min(0).max(23),
  shiftEndHour: z.number().int().min(0).max(23),
  postWorkTailHours: z.number().min(0),
};

function shiftHoursDiffer(p: { shiftStartHour: number; shiftEndHour: number }) {
  return p.shiftStartHour !== p.shiftEndHour;
}
const shiftHoursRefinement = {
  message: "shiftStartHour and shiftEndHour must differ",
  path: ["shiftEndHour"],
};

/** Input shape for updateSchedulePattern — id/createdAt/updatedAt are assigned by the command, not the caller. */
export const schedulePatternInputSchema = z.object(scheduleFields).refine(shiftHoursDiffer, shiftHoursRefinement);
export type SchedulePatternInput = z.infer<typeof schedulePatternInputSchema>;

export const schedulePatternSchema = z
  .object({ id: z.string(), ...scheduleFields, createdAt: z.string(), updatedAt: z.string() })
  .refine(shiftHoursDiffer, shiftHoursRefinement);

/** Never throws. Returns null on any validation failure so callers can decide the fallback. */
export function parseSchedulePattern(raw: unknown): SchedulePattern | null {
  const result = schedulePatternSchema.safeParse(raw);
  return result.success ? (result.data as SchedulePattern) : null;
}
