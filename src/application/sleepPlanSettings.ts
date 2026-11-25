import { db } from "../persistence/db";
import { DEFAULT_SCHEDULE_PATTERN } from "../engine/scheduledContext";
import { caffeineCutoffSchema, parseSleepPlanSettings } from "../persistence/sleepPlanSettingsValidation";
import type { SleepPlanSettings } from "../domain/common/types";
import { FLIP_FIELDS, type FlipField } from "../persistence/sleepPlanSettingsValidation";
import { DEFAULT_FLIP, type FlipSetBy, type FlipSettings } from "../domain/flipPlan";

export { CAFFEINE_CUTOFF_MAX_HOURS, CAFFEINE_CUTOFF_MIN_HOURS } from "../persistence/sleepPlanSettingsValidation";

/**
 * C4.2a (Gavin, 2026-11-20, "Start it"): the shift sleep plan's caffeine cut-off as his own setting. Configuration,
 * not history, so like the key-moment alerts beside it there is no DomainEvent. It sits on the schedulePatterns
 * "current" row: native backups round-trip it, and no schema change is needed. Writing it never touches the
 * schedule's own fields or its updatedAt, so an unsaved (default) schedule stays unsaved.
 *
 * Only an explicit owner SAVE writes the number. UNDO restores the prior setting unless a later change replaced it.
 * No automated proposal, confidence or suppression state is part of this objective.
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
  // GRAYSON-FLIP-PLAN-001: keep the settings while either part is set (before, a flip-only save would have been dropped).
  const keep: SleepPlanSettings = { ...(next.caffeineCutoff ? { caffeineCutoff: next.caffeineCutoff } : {}), ...(next.flip ? { flip: next.flip } : {}) };
  await db.schedulePatterns.put(keep.caffeineCutoff || keep.flip ? { ...rest, sleepPlanSettings: keep } : rest);
}

export async function setCaffeineCutoffHours(hours: number, now = new Date()): Promise<CutoffSave> {
  const caffeineCutoff = caffeineCutoffSchema.parse({ hours, setAt: now.toISOString(), setBy: "OWNER" });
  return db.transaction("rw", db.schedulePatterns, async () => {
    const previous = await readSettings();
    const saved: SleepPlanSettings = { ...previous, caffeineCutoff };
    await writeSettings(saved);
    return {
      saved,
      undo: () => db.transaction("rw", db.schedulePatterns, async () => {
        const settings = await readSettings(), current = settings.caffeineCutoff;
        if (current?.setAt !== caffeineCutoff.setAt || current.hours !== caffeineCutoff.hours) return false;
        // #723 review: put back only the cut-off; a flip SAVE made since stays.
        const { caffeineCutoff: _mine, ...rest } = settings;
        await writeSettings(previous.caffeineCutoff ? { ...rest, caffeineCutoff: previous.caffeineCutoff } : rest);
        return true;
      }),
    };
  });
}

/** GRAYSON-FLIP-PLAN-001: the flip settings in use, and which of them are his own. */
export async function getFlipSettingsView(): Promise<{ settings: FlipSettings; setBy: FlipSetBy; setAt?: string }> {
  const own = (await readSettings()).flip;
  const setBy: FlipSetBy = {};
  const settings = { ...DEFAULT_FLIP };
  if (own) for (const key of Object.keys(FLIP_FIELDS) as FlipField[]) {
    if (own[key] !== undefined) { (settings as Record<string, unknown>)[key] = own[key]; setBy[key] = "OWNER"; }
  }
  return { settings, setBy, ...(own ? { setAt: own.setAt } : {}) };
}

export interface FlipSave { undo: () => Promise<boolean> }
/**
 * SAVE: his changed values (a value equal to the default is still his once he saves it). Validated per field; a bad
 * one is refused with nothing saved. UNDO puts the flip settings back exactly as they were, unless a later SAVE
 * replaced them. The caffeine cut-off is never touched.
 */
export async function saveFlipSettings(patch: Partial<FlipSettings>, now = new Date()): Promise<FlipSave> {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in FLIP_FIELDS) || !FLIP_FIELDS[key as FlipField].safeParse(value).success) throw new Error("That value isn't allowed. Nothing was saved.");
  }
  const setAt = now.toISOString();
  return db.transaction("rw", db.schedulePatterns, async () => {
    const previous = await readSettings();
    await writeSettings({ ...previous, flip: { ...(previous.flip ?? {}), ...patch, setAt } });
    return {
      undo: () => db.transaction("rw", db.schedulePatterns, async () => {
        const current = await readSettings();
        if (current.flip?.setAt !== setAt) return false;
        const { flip: _mine, ...rest } = current;
        await writeSettings(previous.flip ? { ...rest, flip: previous.flip } : rest);
        return true;
      }),
    };
  });
}
