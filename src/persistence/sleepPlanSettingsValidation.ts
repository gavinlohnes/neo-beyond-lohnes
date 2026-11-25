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
/** GRAYSON-FLIP-PLAN-001: each flip value on its own; a bad one falls back to its default, never the others. */
const minuteOfDay = (min: number, max: number) => z.number().int().min(min).max(max);
const choice = z.enum(["FLIP_BACK", "STAY_LATE"]);
export const FLIP_FIELDS = {
  show: z.boolean(),
  getUpBy: minuteOfDay(11 * 60, 15 * 60).refine((m) => m % 15 === 0, "15-minute steps"),
  shortBreak: choice,
  longBreak: choice,
  stayLateBed: minuteOfDay(0, 23 * 60 + 59),
  stayLateWake: minuteOfDay(0, 23 * 60 + 59),
  laterHours: z.number().int().min(0).max(3),
  daylightStart: minuteOfDay(6 * 60, 18 * 60),
  daylightMinutes: z.number().int().min(30).max(4 * 60),
} as const;
export type FlipField = keyof typeof FLIP_FIELDS;

/** Never throws: anything missing or malformed reads as no settings, meaning the cited defaults. Each part on its own. */
export function parseSleepPlanSettings(raw: unknown): SleepPlanSettings {
  const obj = raw && typeof raw === "object" ? raw as { caffeineCutoff?: unknown; flip?: unknown } : {};
  const caffeine = caffeineCutoffSchema.safeParse(obj.caffeineCutoff);
  const out: SleepPlanSettings = caffeine.success ? { caffeineCutoff: { hours: caffeine.data.hours, setAt: caffeine.data.setAt, setBy: caffeine.data.setBy } } : {};
  const flipRaw = obj.flip && typeof obj.flip === "object" ? obj.flip as Record<string, unknown> : null;
  const setAt = flipRaw ? iso.safeParse(flipRaw.setAt) : null;
  if (flipRaw && setAt?.success) {
    const flip: Record<string, unknown> = {};
    for (const key of Object.keys(FLIP_FIELDS) as FlipField[]) {
      const v = FLIP_FIELDS[key].safeParse(flipRaw[key]);
      if (v.success) flip[key] = v.data;
    }
    out.flip = { ...(flip as NonNullable<SleepPlanSettings["flip"]>), setAt: setAt.data };
  }
  return out;
}
