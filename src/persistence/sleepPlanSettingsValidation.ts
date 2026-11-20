import { z } from "zod";
import type { SleepPlanSettings } from "../domain/common/types";

/**
 * C4.2a: the shift sleep plan's settings live on the schedulePatterns "current" row, which native backups already
 * carry. Like the key-moment alert settings beside them, nothing checks a restored row's shape, so the read path
 * validates and falls back to no settings (the cited defaults) on anything malformed.
 */
/** Owner-selectable whole hours; bounds constrain configuration, not a learned personal threshold. */
export const CAFFEINE_CUTOFF_MIN_HOURS = 3;
export const CAFFEINE_CUTOFF_MAX_HOURS = 12;

const iso = z.string().refine((v) => Number.isFinite(Date.parse(v)), "use an ISO time");
export const caffeineCutoffSchema = z.object({
  hours: z.number().int().min(CAFFEINE_CUTOFF_MIN_HOURS).max(CAFFEINE_CUTOFF_MAX_HOURS),
  setAt: iso,
  setBy: z.literal("OWNER"),
});
export const sleepPlanSettingsSchema = z.object({ caffeineCutoff: caffeineCutoffSchema.optional() });

/** Never throws: anything missing or malformed reads as no settings, meaning the cited defaults. */
export function parseSleepPlanSettings(raw: unknown): SleepPlanSettings {
  const result = sleepPlanSettingsSchema.safeParse(raw);
  if (!result.success) return {};
  const { caffeineCutoff } = result.data;
  return { ...(caffeineCutoff ? { caffeineCutoff: { hours: caffeineCutoff.hours, setAt: caffeineCutoff.setAt, setBy: caffeineCutoff.setBy } } : {}) };
}
