/**
 * GRAYSON-LIGHTER-NIGHT-001: the lighter-last-night card's switches (MORE · TODAY), and what he took on one lived day.
 *
 * - `beyond.lighterNight.v1` holds the switches: the card, and each of its three parts. Default all on; the card still
 *   changes nothing until he taps. It travels in the backup's settings block (settingsTransfer.ts).
 * - `beyond.lighterNight.day.<beyondDayId>` holds that lived day's NOT TONIGHT, the parts he took and what each UNDO
 *   needs. It's placement on this phone, like WorkoutCall's LATER, so it never travels and never becomes an event.
 *
 * No event, no schema change. Never throws; anything unreadable reads as the default.
 */
export const LIGHTER_NIGHT_KEY = "beyond.lighterNight.v1";
const DAY_PREFIX = "beyond.lighterNight.day.";

export interface LighterNightSettings { on: boolean; lift: boolean; food: boolean; home: boolean }
export const DEFAULT_LIGHTER_NIGHT_SETTINGS: LighterNightSettings = { on: true, lift: true, food: true, home: true };

export interface LighterHomeMove { id: string; title: string; from: string; to: string; updatedAt: string }
export interface LighterNightDay {
  dismissed?: true | undefined;
  /** The SHORT form he took: TRAIN's REDUCED variant or the programme's linked SHORT; `previous` is the plan answer before. */
  lift?: { name: string; form: "REDUCED" | "LINKED"; previous: boolean | null } | undefined;
  food?: true | undefined;
  home?: { moves: LighterHomeMove[]; at: string; toLabel: string } | undefined;
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

export function readLighterNightSettings(): LighterNightSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LIGHTER_NIGHT_KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_LIGHTER_NIGHT_SETTINGS };
    const d = DEFAULT_LIGHTER_NIGHT_SETTINGS;
    return { on: bool(raw.on, d.on), lift: bool(raw.lift, d.lift), food: bool(raw.food, d.food), home: bool(raw.home, d.home) };
  } catch {
    return { ...DEFAULT_LIGHTER_NIGHT_SETTINGS };
  }
}

export function writeLighterNightSettings(settings: LighterNightSettings): void {
  try { localStorage.setItem(LIGHTER_NIGHT_KEY, JSON.stringify(settings)); } catch { /* storage blocked: the default stays */ }
}

function validMove(m: unknown): m is LighterHomeMove {
  const x = m as Record<string, unknown> | null;
  return !!x && typeof x === "object" && ["id", "title", "from", "to", "updatedAt"].every((k) => typeof x[k] === "string");
}

export function readLighterNightDay(dayId: string): LighterNightDay {
  try {
    const raw = JSON.parse(localStorage.getItem(DAY_PREFIX + dayId) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return {};
    const out: LighterNightDay = {};
    if (raw.dismissed === true) out.dismissed = true;
    const lift = raw.lift as Record<string, unknown> | undefined;
    if (lift && typeof lift.name === "string" && (lift.form === "REDUCED" || lift.form === "LINKED") && (lift.previous === null || typeof lift.previous === "boolean")) {
      out.lift = { name: lift.name, form: lift.form, previous: lift.previous };
    }
    if (raw.food === true) out.food = true;
    const home = raw.home as Record<string, unknown> | undefined;
    if (home && Array.isArray(home.moves) && home.moves.every(validMove) && home.moves.length > 0 && typeof home.at === "string" && typeof home.toLabel === "string") {
      out.home = { moves: home.moves, at: home.at, toLabel: home.toLabel };
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLighterNightDay(dayId: string, value: LighterNightDay): void {
  try {
    const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) localStorage.removeItem(DAY_PREFIX + dayId);
    else localStorage.setItem(DAY_PREFIX + dayId, JSON.stringify(clean));
  } catch { /* storage blocked: the card simply forgets on reload */ }
}

/** TRAIN and Fits now read these two. */
export const lighterLiftFor = (dayId: string) => readLighterNightDay(dayId).lift ?? null;
export const lighterFoodFor = (dayId: string) => readLighterNightDay(dayId).food === true;
