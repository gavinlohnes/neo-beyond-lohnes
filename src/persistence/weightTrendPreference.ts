/**
 * GRAYSON-WEIGHT-TREND-001 (Gavin, 2026-11-24): whether BODY shows the smoothed trend weight, and how quickly it
 * follows the scale. A display preference in localStorage, like restMemory.ts: not domain history, no schema
 * change. It travels in the backup's beyondSettings block (settingsTransfer.ts). Never throws on missing or
 * malformed data; anything unreadable falls back to the default.
 */
const KEY = "beyond:weightTrendPreference";

export type WeightTrendSmoothing = "STEADY" | "QUICKER";
export interface WeightTrendPreference { show: boolean; smoothing: WeightTrendSmoothing }

export const DEFAULT_WEIGHT_TREND_PREFERENCE: WeightTrendPreference = { show: true, smoothing: "STEADY" };

export function readWeightTrendPreference(): WeightTrendPreference {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_WEIGHT_TREND_PREFERENCE };
    const value = raw as { show?: unknown; smoothing?: unknown };
    return {
      show: typeof value.show === "boolean" ? value.show : DEFAULT_WEIGHT_TREND_PREFERENCE.show,
      smoothing: value.smoothing === "QUICKER" || value.smoothing === "STEADY" ? value.smoothing : DEFAULT_WEIGHT_TREND_PREFERENCE.smoothing,
    };
  } catch {
    return { ...DEFAULT_WEIGHT_TREND_PREFERENCE };
  }
}

export function writeWeightTrendPreference(preference: WeightTrendPreference): void {
  try { localStorage.setItem(KEY, JSON.stringify({ show: preference.show, smoothing: preference.smoothing })); } catch { /* storage full or blocked: keep the default */ }
}
