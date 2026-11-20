import { db } from "../persistence/db";
import { DEFAULT_SCHEDULE_PATTERN } from "../engine/scheduledContext";
import { caffeineCutoffSchema, parseSleepPlanSettings } from "../persistence/sleepPlanSettingsValidation";
import type { SleepPlanSettings } from "../domain/common/types";

export { CAFFEINE_CUTOFF_MAX_HOURS, CAFFEINE_CUTOFF_MIN_HOURS } from "../persistence/sleepPlanSettingsValidation";

/**
 * C4.2a (Gavin, 2026-11-20, "Start it"): the shift sleep plan's caffeine cut-off as his own setting. Configuration,
 * not history, so like the key-moment alerts beside it there is no DomainEvent. It sits on the schedulePatterns
 * "current" row: native backups round-trip it, and no schema change is needed. Writing it never touches the
 * schedule's own fields or its updatedAt, so an unsaved (default) schedule stays unsaved.
 *
 * Two writers of the number, both on his tap: CHANGE (setBy OWNER) and APPROVE on DELTA's suggestion (setBy DELTA).
 * Each returns an UNDO that puts the settings back exactly as they were, and does nothing once a later change
 * replaced it. NOT NOW records only when he said it, so DELTA stays quiet for a while. Nothing here runs on its own.
 */
export async function getSleepPlanSettings(): Promise<SleepPlanSettings> {
  return parseSleepPlanSettings((await db.schedulePatterns.get("current"))?.sleepPlanSettings);
}

export interface CutoffSave {
  saved: SleepPlanSettings;
  /** Puts the settings back exactly as they were before this save. False when a later change replaced it. */
  undo: () => Promise<boolean>;
}

async function readSettings(): Promise<SleepPlanSettings> {
  return parseSleepPlanSettings((await db.schedulePatterns.get("current"))?.sleepPlanSettings);
}

async function writeSettings(next: SleepPlanSettings): Promise<void> {
  const existing = await db.schedulePatterns.get("current");
  const { sleepPlanSettings: _old, ...rest } = existing ?? DEFAULT_SCHEDULE_PATTERN;
  await db.schedulePatterns.put(next.caffeineCutoff || next.declinedAt ? { ...rest, sleepPlanSettings: next } : rest);
}

export async function setCaffeineCutoffHours(hours: number, setBy: "OWNER" | "DELTA", now = new Date()): Promise<CutoffSave> {
  const caffeineCutoff = caffeineCutoffSchema.parse({ hours, setAt: now.toISOString(), setBy });
  return db.transaction("rw", db.schedulePatterns, async () => {
    const previous = await readSettings();
    // A NOT NOW stays on record, so his own edit doesn't reset DELTA's quiet spell.
    const saved: SleepPlanSettings = { ...previous, caffeineCutoff };
    await writeSettings(saved);
    return {
      saved,
      undo: () => db.transaction("rw", db.schedulePatterns, async () => {
        const settings = await readSettings(), current = settings.caffeineCutoff;
        if (current?.setAt !== caffeineCutoff.setAt || current.hours !== caffeineCutoff.hours) return false;
        // Only the cut-off goes back; a NOT NOW said since stays.
        const { caffeineCutoff: _undone, ...others } = settings;
        await writeSettings(previous.caffeineCutoff ? { ...others, caffeineCutoff: previous.caffeineCutoff } : others);
        return true;
      }),
    };
  });
}

/** NOT NOW on DELTA's suggestion: the cut-off is unchanged; only the time he said it is kept. */
export async function declineCutoffSuggestion(now = new Date()): Promise<SleepPlanSettings> {
  return db.transaction("rw", db.schedulePatterns, async () => {
    const next: SleepPlanSettings = { ...(await readSettings()), declinedAt: now.toISOString() };
    await writeSettings(next);
    return next;
  });
}
