import { db } from "../persistence/db";
import type { RunningCueKind } from "../domain/workout/runningCues";

/**
 * GRAYSON-TRAIN-RUN-CUES-001 (Gavin, 2026-11-24): his choices for the run cues Health Bridge speaks with the phone
 * locked. Preferences, not events: nothing about a run changes when he edits them. Stored in localStorage key
 * `beyond.runCues.v1`, validated on read like the other beyond.*.v1 preferences (anything unreadable falls back to
 * the default, never throws), and carried in the backup's settings block (settingsTransfer.ts).
 *
 * `on` is the VOICE CUES switch, remembered for next time; unset means "not chosen yet", and the default then comes
 * from whether Health Bridge has ever sent BEYOND data ([runCueSwitchDefault]).
 */
export const RUN_CUES_KEY = "beyond.runCues.v1";

export const RUN_CUE_KINDS: readonly RunningCueKind[] = ["WARMUP", "RUN", "WALK", "HALFWAY", "COOLDOWN", "FINISH"];

/** The longest line he can set for one cue. */
export const RUN_CUE_WORDS_MAX = 120;

export interface RunCuePrefs {
  on?: boolean;
  voice: boolean;
  buzz: boolean;
  words: Partial<Record<RunningCueKind, string>>;
  speak: Partial<Record<RunningCueKind, boolean>>;
}

export const DEFAULT_RUN_CUE_PREFS: RunCuePrefs = { voice: true, buzz: true, words: {}, speak: {} };

const isKind = (k: string): k is RunningCueKind => (RUN_CUE_KINDS as readonly string[]).includes(k);

export function readRunCuePrefs(): RunCuePrefs {
  let raw: unknown;
  try { raw = JSON.parse(localStorage.getItem(RUN_CUES_KEY) ?? "null"); } catch { raw = null; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_RUN_CUE_PREFS, words: {}, speak: {} };
  const v = raw as Record<string, unknown>;
  const words: RunCuePrefs["words"] = {};
  if (v.words && typeof v.words === "object" && !Array.isArray(v.words)) {
    for (const [k, w] of Object.entries(v.words as Record<string, unknown>)) {
      if (isKind(k) && typeof w === "string" && w.trim() !== "") words[k] = w.slice(0, RUN_CUE_WORDS_MAX);
    }
  }
  const speak: RunCuePrefs["speak"] = {};
  if (v.speak && typeof v.speak === "object" && !Array.isArray(v.speak)) {
    for (const [k, s] of Object.entries(v.speak as Record<string, unknown>)) if (isKind(k) && typeof s === "boolean") speak[k] = s;
  }
  return {
    ...(typeof v.on === "boolean" ? { on: v.on } : {}),
    voice: typeof v.voice === "boolean" ? v.voice : DEFAULT_RUN_CUE_PREFS.voice,
    buzz: typeof v.buzz === "boolean" ? v.buzz : DEFAULT_RUN_CUE_PREFS.buzz,
    words,
    speak,
  };
}

export function writeRunCuePrefs(prefs: RunCuePrefs): void {
  const words: RunCuePrefs["words"] = {};
  for (const k of RUN_CUE_KINDS) {
    const w = prefs.words[k];
    if (typeof w === "string" && w.trim() !== "") words[k] = w.slice(0, RUN_CUE_WORDS_MAX);
  }
  const speak: RunCuePrefs["speak"] = {};
  for (const k of RUN_CUE_KINDS) if (typeof prefs.speak[k] === "boolean") speak[k] = prefs.speak[k];
  const value = { ...(typeof prefs.on === "boolean" ? { on: prefs.on } : {}), voice: prefs.voice, buzz: prefs.buzz, words, speak };
  try { localStorage.setItem(RUN_CUES_KEY, JSON.stringify(value)); } catch { /* storage blocked: the defaults stay */ }
}

/** CUE WORDS → RESET: every cue back to its own words and spoken; the switches stay as he set them. */
export function resetRunCueWords(prefs: RunCuePrefs): RunCuePrefs {
  const next: RunCuePrefs = { ...prefs, words: {}, speak: {} };
  writeRunCuePrefs(next);
  return next;
}

/** Whether a cue kind is spoken (on unless he switched it off). */
export const runCueSpeaks = (prefs: RunCuePrefs, kind: RunningCueKind): boolean => prefs.speak[kind] !== false;

/**
 * Default 4: on once BEYOND has ever received data from Health Bridge, because that proves the helper is installed.
 * Every Health Bridge import that adds or revises anything leaves a receipt (health import receipts).
 */
export async function runCueSwitchDefault(): Promise<boolean> {
  try { return (await db.healthImportReceipts.count()) > 0; } catch { return false; }
}

/** The VOICE CUES switch as it stands: his choice if he's made one, otherwise the default. */
export const runCueSwitchOn = (prefs: RunCuePrefs, bridgeSeen: boolean): boolean => prefs.on ?? bridgeSeen;
