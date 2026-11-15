import { db } from "../persistence/db";
import { DEFAULT_SCHEDULE_PATTERN } from "../engine/scheduledContext";
import { keyMomentAlertSettingsSchema, parseKeyMomentAlerts } from "../persistence/keyMomentAlertsValidation";
import type { KeyMomentAlertSettings } from "../domain/common/types";

/**
 * BRIDGE-NOTIFY-001 (Gavin, 2026-11-15: "per-kind off switches, quiet hours"): the owner's key-moment alert
 * settings. Configuration, not history, so like updateSchedulePattern there is no DomainEvent. They sit on the
 * schedulePatterns "current" row: native backups round-trip them, and no schema change is needed. Writing them
 * never touches the schedule's own fields or its updatedAt, so an unsaved (default) schedule stays unsaved.
 */
export async function getKeyMomentAlerts(): Promise<KeyMomentAlertSettings> {
  return parseKeyMomentAlerts((await db.schedulePatterns.get("current"))?.keyMomentAlerts);
}

export async function setKeyMomentAlerts(input: KeyMomentAlertSettings): Promise<KeyMomentAlertSettings> {
  const parsed = keyMomentAlertSettingsSchema.parse(input);
  const settings: KeyMomentAlertSettings = { off: [...new Set(parsed.off)], quietFrom: parsed.quietFrom, quietTo: parsed.quietTo };
  await db.transaction("rw", db.schedulePatterns, async () => {
    const existing = await db.schedulePatterns.get("current");
    await db.schedulePatterns.put({ ...(existing ?? DEFAULT_SCHEDULE_PATTERN), keyMomentAlerts: settings });
  });
  return settings;
}
