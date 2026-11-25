/**
 * GRAYSON C8.1 (Q6), "Settings travel with the backup" (Gavin, 2026-11-24: "Go ahead and start"): the non-secret
 * preferences this phone keeps in localStorage ride along in every native backup and come back on restore, so a new
 * phone gets the whole setup, not only the records.
 *
 * The backup stays the unchanged dexie-export-import document; the preferences sit beside it in one extra top-level
 * block, `beyondSettings`, which dexie-export-import and every older BEYOND build ignore. Only the keys below travel.
 * Everything else in localStorage stays on the phone by design:
 * - secrets and sign-ins: the Alfred API key, the IFTTT config (holds its webhook key), the Google Calendar store,
 *   the Drive backup link (its key lives in IndexedDB outside db.export, see driveKeyStore.ts);
 * - screen privacy (stealth: "never an event or backup record", SUIT-001);
 * - device bookkeeping: drafts, seen/snooze flags, last-backup and last-sent clocks, spend counters, caches.
 *
 * Values travel as the exact strings the app stored. Each reader already falls back to its default on a missing or
 * malformed value, so a damaged block can never break a screen; values are still bounded here.
 */
export const SETTINGS_BLOCK_VERSION = 1;

/** The allowlist: key → what it is, for the restore preview and the docs. */
export const TRAVELLING_SETTINGS: Readonly<Record<string, string>> = {
  "beyond.alfredCap": "Alfred monthly spend cap",
  "beyond.alfredAuto": "Alfred automatic mode",
  "beyond.alfredSpeak": "Alfred spoken replies",
  "beyond.delta.voice.v1": "Delta's voice",
  "beyond:checkInReminderPreference": "Check-in reminder",
  "beyond:autoBackupPreference": "Automatic backup preference",
  "beyond:restSecondsByExercise": "Rest timer per exercise",
  "beyond.exerciseHowTo.v1": "Exercise how-to edits",
  "beyond:restBuzzPreference": "Rest timer buzz",
  "beyond:runningBuzz": "Running buzz",
  "beyond:runningHalfwayCue": "Running halfway cue",
  "beyond:runningKeepAwake": "Running keeps the screen on",
  "beyond.runCues.v1": "Run cue words and voice",
  "beyond.lockScreenSets.v1": "Lock-screen sets",
  "beyond.exerciseNotes.v1": "Exercise notes",
  "beyond.standardTargets.v1": "Standards targets",
  "beyond:weightTrendPreference": "Weight trend",
  "beyond:whatMovesPreference": "What moves your numbers",
  "beyond.hiddenFeatures": "Hidden features",
  "beyond.vision": "Vision mode",
  "beyond.more.favorites.v1": "MORE favorites",
  "beyond.close.prompts.v1": "Evening close prompts",
  "beyond.close.gaps.v1": "Evening close gaps",
  "beyond.logNudge.v1": "Logging nudge",
  "beyond.todayQuiet.v1": "TODAY quiet lines",
  // GRAYSON-PLAN-FRESH-001: his two phone-alert switches. What was last sent to the phone (beyond.bridgePlan.sent.v1)
  // is this phone's state and doesn't travel.
  "beyond.bridgePlan.settings.v1": "Phone alert updates",
  // GRAYSON-DICTATE-001: the TALK buttons and "sort what I say into logs".
  "beyond.dictation.v1": "Voice (TALK buttons)",
  // GRAYSON-WORK-RECORD-001: his yearly training-hours goal, the month his year starts, per-kind reminder days.
  "beyond.workRecord.v1": "Work record",
  // GRAYSON-CHALLENGE-LADDER-001: the habits he told Delta to stop asking about.
  "beyond.habitLadder.v1": "Habit check-ins: habits Delta doesn't ask about",
};

const MAX_VALUE_LENGTH = 16_384;

/** `oversized`: travelling keys left out for size (over 16 KB); restore leaves those as they are on the target. */
export interface SettingsBlock { version: number; values: Record<string, string>; oversized?: string[] }

/** This phone's travelling preferences, as stored. Keys never set are left out. */
export function readTravellingSettings(): SettingsBlock {
  const values: Record<string, string> = {};
  const oversized: string[] = [];
  for (const key of Object.keys(TRAVELLING_SETTINGS)) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) continue;
      if (value.length <= MAX_VALUE_LENGTH) values[key] = value; else oversized.push(key);
    } catch { /* Storage unavailable: nothing to carry. */ }
  }
  return oversized.length ? { version: SETTINGS_BLOCK_VERSION, values, oversized } : { version: SETTINGS_BLOCK_VERSION, values };
}

/** A backup's settings block if it is one this build understands, else null (older backups have none). */
export function parseSettingsBlock(raw: unknown): SettingsBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const block = raw as { version?: unknown; values?: unknown; oversized?: unknown };
  if (block.version !== SETTINGS_BLOCK_VERSION || !block.values || typeof block.values !== "object" || Array.isArray(block.values)) return null;
  const values: Record<string, string> = {};
  // A value too large to trust is skipped like one the backup left out for size: the target keeps its own.
  const oversized = Array.isArray(block.oversized) ? block.oversized.filter((key): key is string => typeof key === "string" && Object.hasOwn(TRAVELLING_SETTINGS, key)) : [];
  for (const [key, value] of Object.entries(block.values as Record<string, unknown>)) {
    if (!Object.hasOwn(TRAVELLING_SETTINGS, key) || typeof value !== "string") continue;
    if (value.length <= MAX_VALUE_LENGTH) values[key] = value; else oversized.push(key);
  }
  return oversized.length ? { version: SETTINGS_BLOCK_VERSION, values, oversized } : { version: SETTINGS_BLOCK_VERSION, values };
}

/**
 * Replace-only, like the data: the block is authoritative for the travelling keys. A key it holds is written; a
 * travelling key it lacks returns to its default. Keys outside the allowlist are never touched. A backup with no
 * block (made before C8.1) leaves this phone's preferences as they are.
 */
export function applySettingsBlock(block: SettingsBlock | null): void {
  if (!block) return;
  for (const key of Object.keys(TRAVELLING_SETTINGS)) {
    try {
      if (Object.hasOwn(block.values, key)) localStorage.setItem(key, block.values[key]!);
      else if (!block.oversized?.includes(key)) localStorage.removeItem(key);
    } catch { /* Storage unavailable: the data restore still stands. */ }
  }
}

/** The native export with the settings block added beside it. The dexie document itself is unchanged. */
export function withSettingsBlock(exported: Blob): Blob {
  const head = `{"beyondSettings":${JSON.stringify(readTravellingSettings())},`;
  // dexie-export-import always writes one JSON object; its first character is "{".
  return new Blob([head, exported.slice(1)], { type: exported.type });
}
