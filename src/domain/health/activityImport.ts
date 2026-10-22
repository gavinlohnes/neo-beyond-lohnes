import { GARMIN_ORIGIN, MAX_EXPORT_WINDOW_MS } from "./sleepImport";

/**
 * GARMIN-002: measured steps and heart rate from BEYOND Health Bridge. Evidence only — never a
 * manual log, canonical event or Engine input. Hours are Health Connect aggregates, so a newer
 * export replaces an older one for the same hour instead of keeping revisions.
 */
export const ACTIVITY_IMPORT_FORMAT = "BEYOND_HEALTH_CONNECT_ACTIVITY";
export const MAX_ACTIVITY_FILE_BYTES = 8 * 1024 * 1024;
/** GARMIN-005: the most energy one hour can plausibly carry, kcal (matches the helper). */
export const MAX_HOUR_KCAL = 5000;
const HOUR_MS = 60 * 60 * 1000;

export interface ActivityHour {
  startTime: string; endTime: string; zoneOffsetSeconds: number | null; steps: number | null;
  heartRateMinBpm: number | null; heartRateAvgBpm: number | null; heartRateMaxBpm: number | null;
  /**
   * GARMIN-005: Garmin's total (resting + active) and active energy for the hour, kcal. Schema 2 files
   * only; rows from schema 1 files and earlier imports have no such fields and read as not measured.
   */
  totalCaloriesKcal?: number | null; activeCaloriesKcal?: number | null;
}
export interface RestingHeartRate {
  id: string; dataOriginPackage: string; lastModifiedTime: string; time: string; zoneOffsetSeconds: number | null; bpm: number;
}
export interface ActivitySnapshot {
  format: typeof ACTIVITY_IMPORT_FORMAT; schemaVersion: 1 | 2;
  producer: { name: "BEYOND Health Bridge"; version: string }; source: typeof GARMIN_ORIGIN;
  exportedAt: string; window: { startTime: string; endTime: string };
  hours: ActivityHour[]; restingHeartRate: RestingHeartRate[];
}
/** Stored hour, keyed by its UTC start. `exportedAt` decides which export is newer. */
export interface ExternalActivityHour extends ActivityHour {
  id: string; exportedAt: string; receiptId: string;
  /** Export that actually supplied each calorie field; later exports may lack calorie permission. */
  totalCaloriesExportedAt?: string; activeCaloriesExportedAt?: string;
}
export interface ExternalRestingHeartRate extends RestingHeartRate { key: string; importedAt: string; receiptId: string }

function fail(): never { throw new Error("This is not a supported BEYOND steps and heart rate export. Nothing was imported."); }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== keys.length || keys.some((key) => !Object.hasOwn(row, key))) return fail();
  return row;
}
function text(value: unknown, max = 200): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max || /[\u0000-\u001f]/.test(value)) return fail();
  return value;
}
function instant(value: unknown): string {
  const input = text(value, 40);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(input) || !Number.isFinite(Date.parse(input))) return fail();
  if (new Date(input).toISOString().slice(0, 19) !== input.slice(0, 19)) return fail();
  return input;
}
function offset(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || Math.abs(value) > 64800) return fail();
  return value;
}
function count(value: unknown, min: number, max: number): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return fail();
  return value;
}

/** Full validation/copy at both preview and command boundary. Unknown fields are refused. */
export function validateActivitySnapshot(value: unknown): ActivitySnapshot {
  const root = object(value, ["format", "schemaVersion", "producer", "source", "exportedAt", "window", "hours", "restingHeartRate"]);
  // GARMIN-005: schema 2 adds hourly calories; schema 1 files from older helpers still import.
  if (root.format !== ACTIVITY_IMPORT_FORMAT || (root.schemaVersion !== 1 && root.schemaVersion !== 2) || root.source !== GARMIN_ORIGIN) return fail();
  const schemaVersion = root.schemaVersion as 1 | 2;
  const producer = object(root.producer, ["name", "version"]);
  if (producer.name !== "BEYOND Health Bridge") return fail();
  const version = text(producer.version, 40);
  const exportedAt = instant(root.exportedAt);
  const window = object(root.window, ["startTime", "endTime"]);
  const startTime = instant(window.startTime), endTime = instant(window.endTime);
  const from = Date.parse(startTime), to = Date.parse(endTime);
  if (to <= from || to - from > MAX_EXPORT_WINDOW_MS || to > Date.parse(exportedAt)) return fail();
  if (!Array.isArray(root.hours) || root.hours.length > 366 * 24) return fail();
  const seenHours = new Set<string>();
  const hours = root.hours.map((input): ActivityHour => {
    const h = object(input, ["startTime", "endTime", "zoneOffsetSeconds", "steps", "heartRateMinBpm", "heartRateAvgBpm", "heartRateMaxBpm",
      ...(schemaVersion === 2 ? ["totalCaloriesKcal", "activeCaloriesKcal"] : [])]);
    const start = instant(h.startTime), end = instant(h.endTime);
    const begin = Date.parse(start);
    if (begin % HOUR_MS !== 0 || Date.parse(end) !== begin + HOUR_MS || begin < from || begin + HOUR_MS > to || seenHours.has(start)) return fail();
    seenHours.add(start);
    const steps = count(h.steps, 0, 100_000);
    const min = count(h.heartRateMinBpm, 20, 300), avg = count(h.heartRateAvgBpm, 20, 300), max = count(h.heartRateMaxBpm, 20, 300);
    const total = schemaVersion === 2 ? count(h.totalCaloriesKcal, 0, MAX_HOUR_KCAL) : null;
    const active = schemaVersion === 2 ? count(h.activeCaloriesKcal, 0, MAX_HOUR_KCAL) : null;
    if (steps === null && avg === null && total === null && active === null) return fail();
    return { startTime: start, endTime: end, zoneOffsetSeconds: offset(h.zoneOffsetSeconds), steps, heartRateMinBpm: min, heartRateAvgBpm: avg, heartRateMaxBpm: max,
      ...(schemaVersion === 2 ? { totalCaloriesKcal: total, activeCaloriesKcal: active } : {}) };
  });
  if (!Array.isArray(root.restingHeartRate) || root.restingHeartRate.length > 1000) return fail();
  const seenIds = new Set<string>();
  const restingHeartRate = root.restingHeartRate.map((input): RestingHeartRate => {
    const r = object(input, ["id", "dataOriginPackage", "lastModifiedTime", "time", "zoneOffsetSeconds", "bpm"]);
    const id = text(r.id);
    if (r.dataOriginPackage !== GARMIN_ORIGIN || seenIds.has(id)) return fail();
    seenIds.add(id);
    const time = instant(r.time);
    if (Date.parse(time) < from || Date.parse(time) >= to) return fail();
    const bpm = count(r.bpm, 20, 300);
    if (bpm === null) return fail();
    return { id, dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: instant(r.lastModifiedTime), time, zoneOffsetSeconds: offset(r.zoneOffsetSeconds), bpm };
  });
  return { format: ACTIVITY_IMPORT_FORMAT, schemaVersion, producer: { name: "BEYOND Health Bridge", version }, source: GARMIN_ORIGIN,
    exportedAt, window: { startTime, endTime }, hours, restingHeartRate };
}
export function parseActivitySnapshot(input: string): ActivitySnapshot {
  if (new TextEncoder().encode(input).byteLength > MAX_ACTIVITY_FILE_BYTES) throw new Error("Steps and heart rate export is too large.");
  let value: unknown;
  try { value = JSON.parse(input); } catch { return fail(); }
  return validateActivitySnapshot(value);
}
export function restingHeartRateKey(record: Pick<RestingHeartRate, "dataOriginPackage" | "id">): string {
  return JSON.stringify([record.dataOriginPackage, record.id]);
}

export interface MeasuredActivity {
  hours: number; steps: number | null; heartRateMinBpm: number | null; heartRateMaxBpm: number | null;
  /** Hour averages weighted equally; Health Connect does not export sample counts. */
  heartRateAvgBpm: number | null;
}
/** Totals for the measured hours that start inside [from, to). Missing hours stay missing, never zero. */
export function summarizeActivity(hours: readonly ActivityHour[], from: number, to: number): MeasuredActivity {
  const inside = hours.filter((h) => { const t = Date.parse(h.startTime); return t >= from && t < to; });
  const steps = inside.filter((h) => h.steps !== null);
  const hr = inside.filter((h) => h.heartRateAvgBpm !== null);
  const mins = inside.map((h) => h.heartRateMinBpm).filter((v): v is number => v !== null);
  const maxs = inside.map((h) => h.heartRateMaxBpm).filter((v): v is number => v !== null);
  return {
    hours: inside.length,
    steps: steps.length ? steps.reduce((sum, h) => sum + h.steps!, 0) : null,
    heartRateMinBpm: mins.length ? Math.min(...mins) : null,
    heartRateMaxBpm: maxs.length ? Math.max(...maxs) : null,
    heartRateAvgBpm: hr.length ? Math.round(hr.reduce((sum, h) => sum + h.heartRateAvgBpm!, 0) / hr.length) : null,
  };
}

const DAY_MS = 24 * HOUR_MS;
export interface MeasuredPeriod extends Period {
  measured: MeasuredActivity; restingHeartRateBpm: number | null;
}
export interface Period { dayId: string | null; from: number; to: number }
/**
 * The period a moment belongs to: its lived day (at most 24 hours), or, with no BEYOND day, a 24-hour
 * period stepped from the nearest day start so the 16:30 edges hold. Shared by BODY and baselines.
 */
export function periodLocator(days: readonly { id: string; startedAt: string }[]): (t: number) => Period {
  const starts = days.map((d) => ({ id: d.id, at: Date.parse(d.startedAt) })).sort((a, b) => a.at - b.at);
  return (t) => {
    let i = -1;
    for (let j = 0; j < starts.length && starts[j]!.at <= t; j++) i = j;
    if (i === -1) {
      const first = starts[0]?.at ?? Math.floor(t / DAY_MS) * DAY_MS + DAY_MS;
      const from = first - Math.ceil((first - t) / DAY_MS) * DAY_MS;
      return { dayId: null, from, to: Math.min(from + DAY_MS, first) };
    }
    const start = starts[i]!.at, next = starts[i + 1]?.at ?? Infinity;
    const k = Math.floor((t - start) / DAY_MS), from = start + k * DAY_MS;
    return { dayId: k === 0 ? starts[i]!.id : null, from, to: Math.min(from + DAY_MS, next) };
  };
}

/**
 * Splits measurements into lived days, each capped at 24 hours. Hours BEYOND has no day for get
 * their own 24-hour periods, stepped from the nearest day start, so they keep the same 16:30 edges
 * instead of piling into the previous day. Newest first.
 */
export function measuredPeriods(days: readonly { id: string; startedAt: string }[], hours: readonly ActivityHour[],
  resting: readonly RestingHeartRate[], now: number): MeasuredPeriod[] {
  const periodOf = periodLocator(days);
  const periods = new Map<number, Period>();
  for (const t of [...hours.map((h) => Date.parse(h.startTime)), ...resting.map((r) => Date.parse(r.time))]) {
    const p = periodOf(t); periods.set(p.from, p);
  }
  return [...periods.values()].sort((a, b) => b.from - a.from).map((p) => {
    const to = Math.min(p.to, Math.max(now, p.from + HOUR_MS));
    const latest = resting.filter((r) => { const t = Date.parse(r.time); return t >= p.from && t < p.to; })
      .sort((a, b) => b.time.localeCompare(a.time))[0];
    return { ...p, measured: summarizeActivity(hours, p.from, p.to), restingHeartRateBpm: latest?.bpm ?? null, to };
  });
}
