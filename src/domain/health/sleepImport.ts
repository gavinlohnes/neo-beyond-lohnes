/** GARMIN-001: portable evidence, never a canonical sleep log or Engine input. */
export const SLEEP_IMPORT_FORMAT = "BEYOND_HEALTH_CONNECT_SLEEP";
export const GARMIN_ORIGIN = "com.garmin.android.apps.connectmobile";
export const MAX_SLEEP_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SLEEP_RECORDS = 500;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
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
  if (to <= from || to - from > WEEK_MS || to > Date.parse(exportedAt)) return fail();
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
    if (!Array.isArray(r.stages) || r.stages.length > 1500 || (stageCount += r.stages.length) > 15000) return fail();
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
