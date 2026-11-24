import {
  DEFAULT_QUIET_SETTINGS, QUIET_LINE_DEFAULT_ORDER, QUIET_MAX_CHOICES,
  type QuietLineId, type QuietLineSettings, type QuietMax,
} from "./attentionPolicy";
import { livedDayKey } from "../../components/BootSequence";
import { readLogNudgeSettings, writeLogNudgeSettings } from "./logNudgeStore";
import { readBridgePlanSettings, writeBridgePlanSettings } from "../../../application/bridgePlan";

/**
 * GRAYSON-TODAY-CALM-001: his TODAY quiet-line settings (MORE → Settings → TODAY), saved on this phone at once and
 * carried by the backup ("TODAY quiet lines"), and the "N MORE" opened state, which is this phone's for the lived day
 * (16:30 → 16:30) only and doesn't travel. A convenience, not a record: nothing here is written to history.
 */
export const TODAY_QUIET_KEY = "beyond.todayQuiet.v1";
const OPENED = "beyond.todayQuiet.opened.v1";

const KNOWN = new Set<string>(QUIET_LINE_DEFAULT_ORDER);
const isId = (v: unknown): v is QuietLineId => typeof v === "string" && KNOWN.has(v);

/** Unknown ids are dropped, duplicates kept once, and ids he hasn't placed yet join at their default place. */
export function normalizeQuietOrder(saved: readonly unknown[]): QuietLineId[] {
  const order: QuietLineId[] = [];
  for (const id of saved) if (isId(id) && !order.includes(id)) order.push(id);
  QUIET_LINE_DEFAULT_ORDER.forEach((id, i) => {
    if (order.includes(id)) return;
    // Insert after the nearest earlier default neighbour he already has, so a new line lands where its brief put it.
    let at = 0;
    for (let j = i - 1; j >= 0; j -= 1) { const k = order.indexOf(QUIET_LINE_DEFAULT_ORDER[j]!); if (k >= 0) { at = k + 1; break; } }
    order.splice(at, 0, id);
  });
  return order;
}

/**
 * Lines whose switch lives with their own feature, so there is one switch per line: the logging nudge's, and
 * GRAYSON-PLAN-FRESH-001's "Show 'Phone alerts are behind' on TODAY" (beyond.bridgePlan.settings.v1). Never stored here.
 */
const OWN_SWITCH: ReadonlySet<QuietLineId> = new Set(["LOG_NUDGE", "PHONE_ALERTS_BEHIND"]);

export function readTodayQuietSettings(): QuietLineSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(TODAY_QUIET_KEY) ?? "null") as Partial<Record<keyof QuietLineSettings, unknown>> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_QUIET_SETTINGS };
    const max = (QUIET_MAX_CHOICES as readonly unknown[]).includes(raw.max) ? raw.max as QuietMax : DEFAULT_QUIET_SETTINGS.max;
    const order = Array.isArray(raw.order) ? normalizeQuietOrder(raw.order) : [...QUIET_LINE_DEFAULT_ORDER];
    const off = Array.isArray(raw.off) ? [...new Set(raw.off.filter(isId))].filter((id) => !OWN_SWITCH.has(id)) : [];
    return { max, order, off, oneAfterShift: raw.oneAfterShift !== false };
  } catch { return { ...DEFAULT_QUIET_SETTINGS }; }
}

export function writeTodayQuietSettings(next: QuietLineSettings): void {
  // LOG_NUDGE's switch is the logging nudge's own (one switch per line), so it is never stored here.
  const stored = { max: next.max, order: [...next.order], off: next.off.filter((id) => !OWN_SWITCH.has(id)), oneAfterShift: next.oneAfterShift };
  try { localStorage.setItem(TODAY_QUIET_KEY, JSON.stringify(stored)); } catch { /* not remembered */ }
}

/** Whether a line is on. LOG_NUDGE reads the logging nudge's own switch, so either place turns it off in both. */
export function quietLineOn(settings: QuietLineSettings, id: QuietLineId): boolean {
  if (id === "LOG_NUDGE") return readLogNudgeSettings().enabled;
  if (id === "PHONE_ALERTS_BEHIND") return readBridgePlanSettings().showBehind;
  return !settings.off.includes(id);
}

/** Turns one line on or off and returns the new settings. LOG_NUDGE writes the logging nudge's own switch. */
export function setQuietLineOn(settings: QuietLineSettings, id: QuietLineId, on: boolean): QuietLineSettings {
  if (id === "LOG_NUDGE") { writeLogNudgeSettings({ ...readLogNudgeSettings(), enabled: on }); return settings; }
  if (id === "PHONE_ALERTS_BEHIND") { writeBridgePlanSettings({ ...readBridgePlanSettings(), showBehind: on }); return settings; }
  const off = on ? settings.off.filter((x) => x !== id) : [...new Set([...settings.off, id])];
  const next = { ...settings, off };
  writeTodayQuietSettings(next);
  return next;
}

/** The lines off right now, including LOG_NUDGE when the logging nudge is off. */
export function effectiveQuietOff(settings: QuietLineSettings): QuietLineId[] {
  const off: QuietLineId[] = settings.off.filter((id) => !OWN_SWITCH.has(id));
  if (!readLogNudgeSettings().enabled) off.push("LOG_NUDGE");
  if (!readBridgePlanSettings().showBehind) off.push("PHONE_ALERTS_BEHIND");
  return off;
}

/** Whether he opened "N MORE" on this lived day, on this phone. */
export function quietMoreOpened(now: Date): boolean {
  try { return localStorage.getItem(OPENED) === livedDayKey(now); } catch { return false; }
}
export function markQuietMoreOpened(now: Date): void {
  try { localStorage.setItem(OPENED, livedDayKey(now)); } catch { /* not remembered; the lines show for now anyway */ }
}
