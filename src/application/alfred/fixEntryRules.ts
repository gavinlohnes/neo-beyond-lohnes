import type { DayLogEntry, LogKind } from "../logEntries";
import { resolveWhen } from "../logTimes";

/**
 * ALFRED-FIX-001: the pure rules of a fix card (no storage), shared by Alfred and the free helper. See fixEntries.ts.
 */
export type FixAction = "move" | "correct" | "remove";
export interface FixValues { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; oz?: number; grams?: number }
/** What the card shows and the confirm re-checks: the entry as it stood when the card was made. */
export interface FixSnapshot {
  beyond_day_id: string; kind: LogKind; name: string; at: string;
  calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; oz?: number; grams?: number;
}
export interface FixProposal {
  kind: "fix_entry"; action: FixAction; entry_id: string;
  /** "HH:MM" as asked (move). */
  time?: string | undefined;
  values?: FixValues | undefined;
  /** Filled by BEYOND before the card shows. */
  entry?: FixSnapshot | undefined;
  to_at?: string | undefined;
}

export const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const r1 = (n: number | undefined) => Math.round((n ?? 0) * 10) / 10;
export function snapshotOf(e: DayLogEntry): FixSnapshot {
  return {
    beyond_day_id: e.beyondDayId, kind: e.kind, name: e.name, at: e.at,
    ...(e.calories !== undefined ? { calories: e.calories } : {}), ...(e.proteinG !== undefined ? { protein_g: e.proteinG } : {}),
    ...(e.carbsG !== undefined ? { carbs_g: e.carbsG } : {}), ...(e.fatG !== undefined ? { fat_g: e.fatG } : {}),
    ...(e.oz !== undefined ? { oz: e.oz } : {}), ...(e.grams !== undefined ? { grams: e.grams } : {}),
  };
}
export function describeAmount(s: FixSnapshot): string {
  if (s.kind === "WATER") return `${r1(s.oz)} oz`;
  if (s.kind === "PROTEIN") return `${r1(s.grams)} g protein`;
  return `${Math.round(s.calories ?? 0)} kcal · ${r1(s.protein_g)} g protein`;
}

const VALUE_KEYS: Record<LogKind, (keyof FixValues)[]> = { MEAL: ["calories", "protein_g", "carbs_g", "fat_g"], WATER: ["oz"], PROTEIN: ["grams"] };
/** The values a correction may carry for this kind; null when none change or one is out of range. */
export function cleanValues(kind: LogKind, values: FixValues | undefined, current: FixSnapshot): FixValues | null {
  const out: FixValues = {};
  for (const k of VALUE_KEYS[kind]) {
    const v = values?.[k];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0 || (kind !== "MEAL" && v <= 0) || v > (k === "calories" ? 10000 : 1000)) return null;
    if (Math.round(v * 10) !== Math.round((current[k] ?? 0) * 10)) out[k] = Math.round(v * 10) / 10;
  }
  return Object.keys(out).length ? out : null;
}

/** "HH:MM" inside the entry's lived day (16:30 to 16:30, so later than now is allowed, as LOG-TIME-001), or null. */
export function placeTime(time: string, dayStartedAt: string, now = new Date()): string | null {
  // A real clock time only: "25:00" must be refused, not rolled over to 01:00.
  const m = time.match(/^(\d{2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return resolveWhen({ kind: "AT", hhmm: time }, dayStartedAt, now) ?? null;
}

const LABELS: Record<keyof FixValues, [string, string]> = { calories: ["", " kcal"], protein_g: ["protein ", " g"], carbs_g: ["carbs ", " g"], fat_g: ["fat ", " g"], oz: ["", " oz"], grams: ["", " g protein"] };
/** One line for the confirm card, from the real record. */
export function describeFix(p: FixProposal): string {
  const e = p.entry;
  if (!e) return "Fix an entry";
  if (p.action === "move") return `Move ${e.name} · ${hhmm(e.at)} → ${hhmm(p.to_at!)}`;
  if (p.action === "remove") return `Remove ${e.name} (${describeAmount(e)} · ${hhmm(e.at)})`;
  const changes = (Object.keys(p.values ?? {}) as (keyof FixValues)[]).map((k) => { const [pre, post] = LABELS[k]; return `${pre}${r1(e[k])} → ${r1(p.values![k])}${post}`; });
  return `Correct ${e.name} · ${changes.join("; ")}`;
}

