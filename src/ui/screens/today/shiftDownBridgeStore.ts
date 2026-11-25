import { mostRecentBoundaryAtOrBefore } from "../../../engine/dayRollover";

/**
 * GRAYSON-SHIFTDOWN-TAPS-001: his "Before you go" settings (travel with the backup) and tonight's "first at home" pick
 * (this phone, this lived day only; never a record, never read by the Engine, recommendations, Delta or the close).
 */
export const BRIDGE_KEY = "beyond.shiftDownBridge.v1";
export const HOME_FIRST_KEY = "beyond.shiftDownHomeFirst.v1";
export const BREATH_MINUTES = [1, 2, 3, 5] as const;
export type BreathMinutes = (typeof BREATH_MINUTES)[number];
export const SOMETHING_ELSE = "Something else";
export const HOME_CHIP_MAX = 20;
/** Six chips at most, counting Something else, which always stays last. */
export const HOME_CHIPS_MAX = 6;
export const HOME_OTHER_MAX = 40;
export interface BridgeSettings { show: boolean; park: boolean; breathe: boolean; home: boolean; minutes: BreathMinutes; chips: string[] }
export const DEFAULT_BRIDGE: BridgeSettings = { show: true, park: true, breathe: true, home: true, minutes: 1, chips: ["Elle", "The dogs", "Food", "Shower", "Sleep"] };

/** His chips, cleaned: trimmed, 1–20 characters, no duplicates, no "Something else" (it's added last), at most 5. */
export function cleanChips(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_BRIDGE.chips];
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const t = c.trim();
    if (!t || t.length > HOME_CHIP_MAX || t.toLowerCase() === SOMETHING_ELSE.toLowerCase() || out.some((o) => o.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length === HOME_CHIPS_MAX - 1) break;
  }
  return out;
}
export function readBridgeSettings(): BridgeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(BRIDGE_KEY) ?? "null") as Partial<Record<keyof BridgeSettings, unknown>> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_BRIDGE, chips: [...DEFAULT_BRIDGE.chips] };
    const flag = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
    return {
      show: flag(raw.show, true), park: flag(raw.park, true), breathe: flag(raw.breathe, true), home: flag(raw.home, true),
      minutes: (BREATH_MINUTES as readonly unknown[]).includes(raw.minutes) ? raw.minutes as BreathMinutes : 1,
      chips: raw.chips === undefined ? [...DEFAULT_BRIDGE.chips] : cleanChips(raw.chips),
    };
  } catch { return { ...DEFAULT_BRIDGE, chips: [...DEFAULT_BRIDGE.chips] }; }
}
export function writeBridgeSettings(next: BridgeSettings): void {
  try { localStorage.setItem(BRIDGE_KEY, JSON.stringify({ ...next, chips: cleanChips(next.chips) })); } catch { /* not remembered */ }
}
/** The chips shown: his, then Something else. */
export const homeChips = (s: BridgeSettings) => [...s.chips, SOMETHING_ELSE];

/** The lived day's end: the 16:30 after its start. */
export function livedDayEnd(dayStartedAt: string): Date {
  const start = mostRecentBoundaryAtOrBefore(new Date(dayStartedAt));
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, start.getHours(), start.getMinutes());
}
/** Tonight's pick, only for its own lived day and only until that day ends. */
export function homeFirstFor(dayId: string, dayStartedAt: string, now: Date = new Date()): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(HOME_FIRST_KEY) ?? "null") as { dayId?: unknown; pick?: unknown } | null;
    if (!raw || raw.dayId !== dayId || typeof raw.pick !== "string" || !raw.pick.trim()) return null;
    if (now.getTime() >= livedDayEnd(dayStartedAt).getTime()) return null;
    return raw.pick.trim().slice(0, HOME_OTHER_MAX);
  } catch { return null; }
}
export function setHomeFirst(dayId: string, pick: string | null): void {
  try {
    const t = pick?.trim().slice(0, HOME_OTHER_MAX);
    if (t) localStorage.setItem(HOME_FIRST_KEY, JSON.stringify({ dayId, pick: t })); else localStorage.removeItem(HOME_FIRST_KEY);
  } catch { /* not remembered */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HOME_FIRST_EVENT));
}
export const HOME_FIRST_EVENT = "beyond:home-first-changed";
