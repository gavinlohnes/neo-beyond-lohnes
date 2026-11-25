/**
 * GRAYSON-WHAT-MOVES-001 (Gavin, 2026-11-24): his window for "What moves your numbers" and the lines he hid. A UI
 * preference in localStorage like restMemory.ts: no event, no schema change. It travels in the backup's settings block
 * (settingsTransfer.ts). Never throws; anything unreadable falls back to the default.
 */
const KEY = "beyond:whatMovesPreference";

export type WhatMovesWindow = 90 | 180 | "ALL";
export interface WhatMovesPreference { window: WhatMovesWindow; hidden: string[] }
export const DEFAULT_WHAT_MOVES_PREFERENCE: WhatMovesPreference = { window: 90, hidden: [] };
const MAX_HIDDEN = 200;

export function getWhatMovesPreference(): WhatMovesPreference {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_WHAT_MOVES_PREFERENCE, hidden: [] };
    const v = raw as { window?: unknown; hidden?: unknown };
    const window: WhatMovesWindow = v.window === 90 || v.window === 180 || v.window === "ALL" ? v.window : DEFAULT_WHAT_MOVES_PREFERENCE.window;
    const hidden = Array.isArray(v.hidden) ? [...new Set(v.hidden.filter((h): h is string => typeof h === "string" && h.length <= 200))].slice(0, MAX_HIDDEN) : [];
    return { window, hidden };
  } catch {
    return { ...DEFAULT_WHAT_MOVES_PREFERENCE, hidden: [] };
  }
}

export function setWhatMovesPreference(preference: WhatMovesPreference): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ window: preference.window, hidden: [...new Set(preference.hidden)].slice(0, MAX_HIDDEN) }));
  } catch { /* storage blocked: the default stays */ }
}
