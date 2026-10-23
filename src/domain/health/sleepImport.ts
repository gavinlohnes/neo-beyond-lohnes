/** GARMIN-001: portable evidence, never a canonical sleep log or Engine input. */
export const SLEEP_IMPORT_FORMAT = "BEYOND_HEALTH_CONNECT_SLEEP";
export const GARMIN_ORIGIN = "com.garmin.android.apps.connectmobile";
// GARMIN-003: a full-history export covers up to 366 days; the daily read still covers 7.
export const MAX_SLEEP_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_SLEEP_RECORDS = 2000;
export const MAX_EXPORT_WINDOW_MS = 366 * 24 * 60 * 60 * 1000;
export const SLEEP_STAGES = ["AWAKE", "SLEEPING", "OUT_OF_BED", "LIGHT", "DEEP", "REM", "AWAKE_IN_BED", "UNKNOWN"] as const;
export interface SleepStage { startTime: string; endTime: string; type: (typeof SLEEP_STAGES)[number] }
export interface ExternalSleep {
  id: string; dataOriginPackage: string; lastModifiedTime: string;
  startTime: string; endTime: string; startZoneOffsetSeconds: number | null; endZoneOffsetSeconds: number | null;
  stages: SleepStage[];
}
export interface SleepSnapshot {
  format: typeof SLEEP_IMPORT_FORMAT; schemaVersion: 1;
  producer: { name: "BEYOND Health Bridge"; version: string };
  exportedAt: string; window: { startTime: string; endTime: string }; records: ExternalSleep[];
}
export interface ExternalSleepRevision {
  id: string; recordKey: string; sourceVersion: string; evidence: ExternalSleep;
  importedAt: string; receiptId: string; associatedDayId: string | null;
}
export interface ExternalSleepRecord {
  id: string; revisionId: string; startTime: string; lastModifiedTime: string;
}
export interface HealthImportReceipt {
  id: string; importedAt: string; exportedAt: string; producerVersion: string;
  inserted: number; revised: number; skipped: number;
}
export function sleepRecordKey(record: Pick<ExternalSleep, "dataOriginPackage" | "id">): string {
  return JSON.stringify([record.dataOriginPackage, record.id]);
}
/** Validated UTC instants, including Health Connect's nanosecond source versions. */
export function compareSleepInstants(a: string, b: string): number {
  const nanos = (s: string) => BigInt(Date.parse(s.slice(0, 19) + "Z")) * 1000000n + BigInt((s.match(/\.(\d+)Z$/)?.[1] ?? "").padEnd(9, "0"));
  const left = nanos(a), right = nanos(b);
  return left < right ? -1 : left > right ? 1 : 0;
}
function fail(): never { throw new Error("This is not a supported BEYOND sleep export. Nothing was imported."); }
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
  // Refuse calendar overflow (for example Feb 30); retain source precision.
  if (new Date(input).toISOString().slice(0, 19) !== input.slice(0, 19)) return fail();
  return input;
}
function offset(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || Math.abs(value) > 64800) return fail();
  return value;
}
/** Full validation/copy at both preview and command boundary. Unknown fields are refused. */
export function validateSleepSnapshot(value: unknown): SleepSnapshot {
  const root = object(value, ["format", "schemaVersion", "producer", "exportedAt", "window", "records"]);
  if (root.format !== SLEEP_IMPORT_FORMAT || root.schemaVersion !== 1) return fail();
  const producer = object(root.producer, ["name", "version"]);
  if (producer.name !== "BEYOND Health Bridge") return fail();
  const version = text(producer.version, 40);
  const exportedAt = instant(root.exportedAt);
  const window = object(root.window, ["startTime", "endTime"]);
  const startTime = instant(window.startTime), endTime = instant(window.endTime);
  const from = Date.parse(startTime), to = Date.parse(endTime);
  if (to <= from || to - from > MAX_EXPORT_WINDOW_MS || to > Date.parse(exportedAt)) return fail();
  if (!Array.isArray(root.records) || root.records.length > MAX_SLEEP_RECORDS) return fail();
  const seen = new Set<string>(); let stageCount = 0;
  const records = root.records.map((input): ExternalSleep => {
    const r = object(input, ["id", "dataOriginPackage", "lastModifiedTime", "startTime", "endTime", "startZoneOffsetSeconds", "endZoneOffsetSeconds", "stages"]);
    const id = text(r.id);
    if (r.dataOriginPackage !== GARMIN_ORIGIN || seen.has(id)) return fail();
    seen.add(id);
    const start = instant(r.startTime), end = instant(r.endTime), modified = instant(r.lastModifiedTime);
    const begin = Date.parse(start), finish = Date.parse(end);
    if (finish <= begin || begin < from || finish > to) return fail();
    if (!Array.isArray(r.stages) || r.stages.length > 1500 || (stageCount += r.stages.length) > 60000) return fail();
    let previous = begin;
    const stages = r.stages.map((input): SleepStage => {
      const s = object(input, ["startTime", "endTime", "type"]);
      const a = instant(s.startTime), b = instant(s.endTime);
      if (typeof s.type !== "string" || !(SLEEP_STAGES as readonly string[]).includes(s.type) || Date.parse(a) < previous || Date.parse(b) <= Date.parse(a) || Date.parse(b) > finish) return fail();
      previous = Date.parse(b);
      return { startTime: a, endTime: b, type: s.type as SleepStage["type"] };
    });
    return { id, dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: modified, startTime: start, endTime: end,
      startZoneOffsetSeconds: offset(r.startZoneOffsetSeconds), endZoneOffsetSeconds: offset(r.endZoneOffsetSeconds), stages };
  });
  return { format: SLEEP_IMPORT_FORMAT, schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version }, exportedAt, window: { startTime, endTime }, records };
}
export function parseSleepSnapshot(input: string): SleepSnapshot {
  if (new TextEncoder().encode(input).byteLength > MAX_SLEEP_FILE_BYTES) throw new Error("Sleep export is too large. Export a smaller window.");
  let value: unknown;
  try { value = JSON.parse(input); } catch { return fail(); }
  return validateSleepSnapshot(value);
}
/** A session span is not an asleep total. Gaps/unknown stages do not become sleep. */
export function sleepDurations(record: ExternalSleep): { spanMinutes: number; asleepMinutes: number | null } {
  const span = Date.parse(record.endTime) - Date.parse(record.startTime);
  let covered = 0, asleep = 0;
  for (const stage of record.stages) {
    const length = Date.parse(stage.endTime) - Date.parse(stage.startTime);
    if (stage.type !== "UNKNOWN") covered += length;
    if (["SLEEPING", "LIGHT", "DEEP", "REM"].includes(stage.type)) asleep += length;
  }
  return { spanMinutes: span / 60000, asleepMinutes: covered === span ? asleep / 60000 : null };
}

/** GARMIN-003: provenance on a sleep entry that Garmin filled in. */
export interface GarminSleepSource { kind: "GARMIN"; recordKey: string; sourceVersion: string }
export interface GarminSleepAssignment {
  dayId: string; recordKey: string; kind: "PRIMARY" | "SUPPLEMENTAL"; minutes: number; endTime: string; sourceVersion: string;
}
const DAY_MS = 24 * 60 * 60 * 1000;
/** Shorter sessions are left as evidence only. */
export const MIN_GARMIN_SLEEP_MINUTES = 10;
/** SLEEP-FILING-001: a lived day recorded as a work day and the shift it owns, epoch ms. */
export interface ShiftWindow { dayId: string; start: number; end: number }
/** A Garmin "sleep" overlapping a worked shift by at least this much is not filed as sleep. */
export const SHIFT_OVERLAP_MINUTES = 60;
/** Garmin sleep left out of the day's sleep entries, and why. Very short sessions are not listed. */
export type GarminSleepUnfiled =
  | { recordKey: string; reason: "DURING_SHIFT"; dayId: string; minutes: number }
  | { recordKey: string; reason: "NO_DAY"; minutes: number };
type SleepRecordInput = { recordKey: string; sourceVersion: string; evidence: ExternalSleep; associatedDayId?: string | null };
/**
 * GARMIN-003 (owner ruling, approach A), amended by SLEEP-FILING-001 (owner approval 2026-10-23):
 * which lived day each Garmin sleep belongs to and whether it is that day's main sleep.
 * - The owner's explicit link from the import preview wins.
 * - Otherwise the existing day it starts in (day start ≤ sleep start < next day start, at most 24
 *   hours); if no day covers the start, the day it ends in. With neither it is NO_DAY: evidence only,
 *   and said so rather than silently dropped.
 * - A sleep overlapping a recorded work day's shift by SHIFT_OVERLAP_MINUTES or more is DURING_SHIFT:
 *   not filed, because a watch can't tell a quiet stretch at work from sleep. Days off and sleep
 *   outside shifts file as before, so naps and changing sleep times are unaffected.
 * The longest filed sleep in a day is PRIMARY; the rest are SUPPLEMENTAL. Minutes are the asleep total
 * when the stages are complete, otherwise the session span.
 */
export function classifyGarminSleep(days: readonly { id: string; startedAt: string }[], records: readonly SleepRecordInput[],
  shiftWindows: readonly ShiftWindow[] = []): { assignments: GarminSleepAssignment[]; unfiled: GarminSleepUnfiled[] } {
  const starts = days.map((d) => ({ id: d.id, at: Date.parse(d.startedAt) })).sort((a, b) => a.at - b.at);
  const byDay = new Map<string, Omit<GarminSleepAssignment, "kind">[]>();
  const known = new Set(starts.map((s) => s.id));
  const unfiled: GarminSleepUnfiled[] = [];
  const dayCovering = (t: number): string | null => {
    let i = -1;
    for (let j = 0; j < starts.length && starts[j]!.at <= t; j++) i = j;
    if (i === -1) return null;
    return t < Math.min(starts[i]!.at + DAY_MS, starts[i + 1]?.at ?? Infinity) ? starts[i]!.id : null;
  };
  for (const r of records) {
    const { spanMinutes, asleepMinutes } = sleepDurations(r.evidence);
    const minutes = Math.round(asleepMinutes ?? spanMinutes);
    if (minutes < MIN_GARMIN_SLEEP_MINUTES) continue;
    const from = Date.parse(r.evidence.startTime), to = Date.parse(r.evidence.endTime);
    // The owner's explicit link from the import preview wins over the automatic rules.
    let dayId: string | null = r.associatedDayId && known.has(r.associatedDayId) ? r.associatedDayId : null;
    if (!dayId) {
      const shift = shiftWindows.find((w) => Math.min(to, w.end) - Math.max(from, w.start) >= SHIFT_OVERLAP_MINUTES * 60000);
      if (shift) { unfiled.push({ recordKey: r.recordKey, reason: "DURING_SHIFT", dayId: shift.dayId, minutes }); continue; }
      dayId = dayCovering(from) ?? dayCovering(to);
      if (!dayId) { unfiled.push({ recordKey: r.recordKey, reason: "NO_DAY", minutes }); continue; }
    }
    const list = byDay.get(dayId) ?? [];
    list.push({ dayId, recordKey: r.recordKey, minutes, endTime: r.evidence.endTime, sourceVersion: r.sourceVersion });
    byDay.set(dayId, list);
  }
  const assignments = [...byDay.values()].flatMap((list) => list
    .sort((a, b) => b.minutes - a.minutes || a.endTime.localeCompare(b.endTime))
    .map((a, i) => ({ ...a, kind: i === 0 ? "PRIMARY" as const : "SUPPLEMENTAL" as const })));
  return { assignments, unfiled };
}
export function assignGarminSleep(days: readonly { id: string; startedAt: string }[], records: readonly SleepRecordInput[],
  shiftWindows: readonly ShiftWindow[] = []): GarminSleepAssignment[] {
  return classifyGarminSleep(days, records, shiftWindows).assignments;
}
