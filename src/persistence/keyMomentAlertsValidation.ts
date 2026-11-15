import { z } from "zod";
import type { KeyMomentAlertSettings } from "../domain/common/types";

/**
 * BRIDGE-NOTIFY-001: the key-moment alert settings live on the schedulePatterns "current" row, which native
 * backups already carry. Like the schedule itself, nothing checks a restored row's shape, so the read path
 * validates and falls back to the defaults (every kind on, no quiet hours) on anything malformed.
 */
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "use HH:MM");
export const KEY_MOMENT_KINDS = ["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE"] as const;

export const keyMomentAlertSettingsSchema = z
  .object({
    off: z.array(z.enum(KEY_MOMENT_KINDS)).max(KEY_MOMENT_KINDS.length),
    quietFrom: clock.nullable(),
    quietTo: clock.nullable(),
  })
  .refine((s) => (s.quietFrom === null) === (s.quietTo === null), { message: "quiet hours need both a start and an end", path: ["quietTo"] })
  .refine((s) => s.quietFrom === null || s.quietFrom !== s.quietTo, { message: "quiet hours can't start and end at the same time", path: ["quietTo"] });

export const DEFAULT_KEY_MOMENT_ALERTS: KeyMomentAlertSettings = { off: [], quietFrom: null, quietTo: null };

/** Never throws: anything missing or malformed reads as the defaults. */
export function parseKeyMomentAlerts(raw: unknown): KeyMomentAlertSettings {
  const result = keyMomentAlertSettingsSchema.safeParse(raw);
  return result.success ? { off: [...new Set(result.data.off)], quietFrom: result.data.quietFrom, quietTo: result.data.quietTo } : DEFAULT_KEY_MOMENT_ALERTS;
}
