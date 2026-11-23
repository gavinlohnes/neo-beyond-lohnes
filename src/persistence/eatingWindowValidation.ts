import { z } from "zod";
import type { EatingWindowSettings } from "../domain/common/types";

/**
 * GRAYSON C4.8a: Eating Window settings live on the schedulePatterns "current" row (native backups carry it). Nothing
 * checks a restored row's shape, so the read path validates and treats anything malformed as "not set up".
 */
export const EATING_HOURS_MIN = 6;
export const EATING_HOURS_MAX = 16;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const iso = z.string().refine((v) => Number.isFinite(Date.parse(v)), "use an ISO time");
export const eatingWindowSettingsSchema = z.object({
  enabled: z.boolean(),
  eatingHours: z.number().int().min(EATING_HOURS_MIN).max(EATING_HOURS_MAX),
  opensAt: z.object({ WORK: hhmm, RECOVERY: hhmm, OFF: hhmm }),
  safetyCheckedAt: iso,
  setAt: iso,
});

/** Never throws: missing or malformed reads as null (not set up). */
export function parseEatingWindowSettings(raw: unknown): EatingWindowSettings | null {
  const r = eatingWindowSettingsSchema.safeParse(raw);
  return r.success ? { enabled: r.data.enabled, eatingHours: r.data.eatingHours, opensAt: { ...r.data.opensAt }, safetyCheckedAt: r.data.safetyCheckedAt, setAt: r.data.setAt } : null;
}
