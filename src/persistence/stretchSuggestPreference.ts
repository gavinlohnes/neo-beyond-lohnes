/**
 * GRAYSON-HOME-STRETCH-001 slice B: TRAIN's "fits the hour" stretch suggestion, on or off, and its three windows
 * (hours after a shift, before his usual sleep, after lifting). Set in MORE · Train settings; a UI preference in
 * localStorage that travels with the backup (settingsTransfer.ts). Never throws; anything unreadable reads as default.
 */
export const STRETCH_SUGGEST_KEY = "beyond.stretchSuggest.v1";

export interface StretchSuggestSettings { on: boolean; afterShiftHours: number; beforeSleepHours: number; afterLiftingHours: number }
export const DEFAULT_STRETCH_SUGGEST: StretchSuggestSettings = { on: true, afterShiftHours: 2, beforeSleepHours: 2, afterLiftingHours: 1 };

const hours = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0.5 && v <= 6 ? Math.round(v * 2) / 2 : fallback);

export function readStretchSuggestSettings(): StretchSuggestSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(STRETCH_SUGGEST_KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_STRETCH_SUGGEST };
    const d = DEFAULT_STRETCH_SUGGEST;
    return {
      on: typeof raw.on === "boolean" ? raw.on : d.on,
      afterShiftHours: hours(raw.afterShiftHours, d.afterShiftHours),
      beforeSleepHours: hours(raw.beforeSleepHours, d.beforeSleepHours),
      afterLiftingHours: hours(raw.afterLiftingHours, d.afterLiftingHours),
    };
  } catch {
    return { ...DEFAULT_STRETCH_SUGGEST };
  }
}

export function writeStretchSuggestSettings(settings: StretchSuggestSettings): void {
  try { localStorage.setItem(STRETCH_SUGGEST_KEY, JSON.stringify(settings)); } catch { /* storage blocked: the default stays */ }
}
