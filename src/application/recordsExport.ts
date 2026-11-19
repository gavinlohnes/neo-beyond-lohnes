import { getDaySummaries } from "./dayLedgerQueries";
import { getBodyweightHistoryWithSources } from "./bodyTrendQueries";
import { getMealEntries } from "./nutritionQueries";
import { getTrainingHistory, getWorkoutSessionRecord } from "./trainHistoryQueries";
import { getMeasurements } from "./measurementQueries";
import { getMeasuredSnapshot } from "./measuredQueries";

/**
 * EXPORT-001 (Gavin, 2026-11-19, approved list item 2): readable CSV files of your own records. Read only: the same
 * corrected values the screens show (superseded and undone entries never appear), one row per record, the 16:30 lived
 * day on every row, empty cells for missing values (never 0), sources kept visible. Not a backup: it never touches the
 * backup reminder and has no import.
 */
export type ExportArea = "weight" | "workouts" | "meals" | "days" | "measurements";
export const EXPORT_AREAS: readonly [ExportArea, string][] = [
  ["days", "Daily totals"], ["weight", "Weight"], ["meals", "Meals"], ["workouts", "Workouts"], ["measurements", "Measurements"],
];
type Cell = string | number | null | undefined;
export interface RecordsExport { area: ExportArea; header: string[]; rows: Cell[][]; from: string | null; to: string | null }

/**
 * One CSV cell (RFC 4180): quoted when it holds a comma, quote or line break, quotes doubled. A cell starting with =, +,
 * - or @ that isn't a plain number is prefixed with ' so a spreadsheet shows it as text instead of running it.
 */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
  if (typeof value === "string" && /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: readonly string[], rows: readonly Cell[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** The lived day as a calendar date (its 16:30 start's local date), e.g. 2026-11-14. */
const ymd = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const clock = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const round1 = (n: number) => Math.round(n * 10) / 10;

function span(rows: Cell[][]): { from: string | null; to: string | null } {
  const days = rows.map((r) => r[0]).filter((d): d is string => typeof d === "string" && d !== "").sort();
  return { from: days[0] ?? null, to: days.at(-1) ?? null };
}

export async function getRecordsExport(area: ExportArea, now = Date.now()): Promise<RecordsExport> {
  const summaries = await getDaySummaries();
  const livedOf = new Map(summaries.map((s) => [s.beyondDayId, ymd(s.livedDayStart)]));
  const sorted = [...summaries].sort((a, b) => a.livedDayStart.localeCompare(b.livedDayStart));
  let header: string[]; let rows: Cell[][];

  if (area === "weight") {
    header = ["lived_day", "time", "weight", "unit", "source"];
    rows = (await getBodyweightHistoryWithSources()).map((w) => [w.beyondDayId ? livedOf.get(w.beyondDayId) ?? ymd(w.recordedAt) : ymd(w.recordedAt), clock(w.recordedAt), w.weightLbs, "lb", "you"]);
  } else if (area === "meals") {
    header = ["lived_day", "time", "name", "calories", "protein_g", "carbs_g", "fat_g", "source"];
    rows = [];
    for (const day of sorted) {
      const lived = ymd(day.livedDayStart);
      for (const m of [...(await getMealEntries(day.beyondDayId))].sort((a, b) => a.at.localeCompare(b.at))) {
        rows.push([lived, clock(m.at), m.name, Math.round(m.effectiveCalories), round1(m.effectiveProteinG), round1(m.effectiveCarbsG), round1(m.effectiveFatG), "you"]);
      }
    }
  } else if (area === "workouts") {
    header = ["lived_day", "time", "session", "status", "exercise", "substituted_as", "set", "set_kind", "weight_lb", "reps", "skipped"];
    rows = [];
    const sessions = [...(await getTrainingHistory())].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    for (const s of sessions) {
      const record = await getWorkoutSessionRecord(s.id);
      if (!record) continue;
      const lived = livedOf.get(s.beyondDayId) ?? ymd(s.startedAt);
      const session = `${s.templateId}${s.sessionType === "STANDARD" ? "" : ` ${s.sessionType}`}`;
      for (const ex of record.exercises) for (const set of ex.sets) {
        rows.push([lived, clock(s.startedAt), session, s.status, ex.name, set.substitutedName, set.setNumber, set.setKind === "WARMUP" ? "warm-up" : "working", set.skipped ? null : set.weight, set.skipped ? null : set.reps, set.skipped ? "yes" : "no"]);
      }
    }
  } else if (area === "measurements") {
    header = ["lived_day", "site", "value", "unit", "source"];
    rows = [...(await getMeasurements())].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn)).map((m) => [m.measuredOn.slice(0, 10), m.site.toLowerCase(), m.inches, "in", "you"]);
  } else {
    header = ["lived_day", "work_or_off", "water_oz", "protein_g", "calories_eaten", "main_sleep_min", "steps", "steps_source"];
    // Steps are Garmin's watch measurements (owner entries win upstream, GARMIN-004); everything else is your logs.
    const snapshot = await getMeasuredSnapshot(now);
    const stepsOf = new Map(snapshot.steps.flatMap((p) => (p.dayId && p.value !== null ? [[p.dayId, p.value] as const] : [])));
    rows = sorted.map((d) => {
      const steps = stepsOf.get(d.beyondDayId);
      return [ymd(d.livedDayStart), d.work.declared === "UNKNOWN" ? null : d.work.declared.toLowerCase(), d.waterOz, d.proteinG === undefined ? null : round1(d.proteinG),
        d.kcal === undefined ? null : Math.round(d.kcal), d.sleep.primaryMinutes, steps, steps === undefined ? null : "garmin"];
    });
  }
  return { area, header, rows, ...span(rows) };
}

/** The file name for an area's export on a given day: beyond-weight-2026-11-19.csv. */
export const exportFileName = (area: ExportArea, now = new Date()) => `beyond-${area}-${ymd(now.toISOString())}.csv`;
