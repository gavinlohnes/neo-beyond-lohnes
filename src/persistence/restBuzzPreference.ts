/**
 * GRAYSON-TRAIN-REST-001 (Gavin, 2026-11-24): whether the phone buzzes when rest ends, and how strongly. A UI
 * preference in localStorage like restMemory.ts: no domain event, no schema change. It travels in the backup's
 * beyondSettings block (settingsTransfer.ts). Never throws; anything unreadable falls back to the default.
 */
const KEY = "beyond:restBuzzPreference";

export type RestBuzzStrength = "SHORT" | "LONG";
export interface RestBuzzPreference { enabled: boolean; strength: RestBuzzStrength }
export const DEFAULT_REST_BUZZ_PREFERENCE: RestBuzzPreference = { enabled: true, strength: "SHORT" };

export function getRestBuzzPreference(): RestBuzzPreference {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_REST_BUZZ_PREFERENCE };
    const value = raw as { enabled?: unknown; strength?: unknown };
    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_REST_BUZZ_PREFERENCE.enabled,
      strength: value.strength === "LONG" || value.strength === "SHORT" ? value.strength : DEFAULT_REST_BUZZ_PREFERENCE.strength,
    };
  } catch {
    return { ...DEFAULT_REST_BUZZ_PREFERENCE };
  }
}

export function setRestBuzzPreference(preference: RestBuzzPreference): void {
  try { localStorage.setItem(KEY, JSON.stringify({ enabled: preference.enabled, strength: preference.strength })); } catch { /* storage blocked: default stays */ }
}
