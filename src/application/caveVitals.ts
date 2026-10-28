import type { StateCheckIn } from "../domain/common/types";
import { quantile } from "../engine/livedDaySeries";
import { BAND_HIGH_QUANTILE, BAND_LOW_QUANTILE, MIN_BASELINE_DAYS } from "../engine/personalBaselines";
import { getLatestCheckIn } from "./queries";
import { describePace, getPaceHistories, minuteOfDay, paceReading, type PaceReading } from "./pace";
import { getSystemsReadout, type SystemsReadout } from "./systemsReadoutQueries";
import { getWholePicture } from "./wholePictureQueries";
import { runPositions } from "./rotationProjection";
import { pictureMean, type PictureRow } from "./wholePictureProjection";

/**
 * SUIT-ALIVE S2 — the cave, Vitals (owner approval 2026-10-28, "go S2"; brief docs/agent/SUIT-ALIVE.md).
 * One reading in depth: today's value, the last 14 finished lived days, your usual range for this kind
 * of day, where you usually are at this place in a run, the records behind it, what it feeds and where
 * it came from. Read-only and derived on read: it composes the SYSTEMS readout and Whole Picture and
 * reuses the personal-baselines range rule (middle half of the same kind of day, at least
 * MIN_BASELINE_DAYS). No score, no combined number, no Engine input, nothing stored.
 */
export type CaveVitalId = "sleep" | "energy" | "protein" | "water" | "resting" | "steps";
/** CAVE-DATA D5 adds Garmin's resting heart rate and steps, judged on finished days only. */
export const CAVE_VITALS: readonly CaveVitalId[] = ["sleep", "energy", "protein", "water", "resting", "steps"];
export const CAVE_TREND_DAYS = 14;

type DayKind = "WORK" | "OFF";
export type CaveUsual =
  | { kind: "RANGE"; dayKind: DayKind | "ALL"; low: number; high: number; median: number; days: number }
  | { kind: "LEARNING"; dayKind: DayKind | "ALL"; days: number; need: number };

export interface CaveVital {
  id: CaveVitalId;
  title: string;
  unit: "h" | "/5" | "g" | "oz" | "bpm" | "steps";
  /** Today's reading. Protein and water are running totals, so `partial` is true: they are judged only by pace (S5), never against a full-day range. */
  today: { value: number | undefined; partial: boolean };
  /** Last finished lived days, oldest first; a missing reading stays undefined. */
  trend: { start: string; value: number | undefined }[];
  usual: CaveUsual;
  /** Complete readings against their range; running totals against their pace. */
  verdict: "BELOW" | "INSIDE" | "ABOVE" | undefined;
  /** Where you usually are: this place in the run (sleep and energy), work days, days off. */
  position: { label: string; value: number | undefined; days: number }[];
  facts: string[];
  feeds: { decides: boolean; text: string };
  source: { label: string; value: string }[];
  pace: PaceReading | undefined;
}

const TITLES: Record<CaveVitalId, string> = { sleep: "Main sleep", energy: "Energy", protein: "Protein", water: "Water", resting: "Resting heart rate", steps: "Steps" };
const UNITS: Record<CaveVitalId, CaveVital["unit"]> = { sleep: "h", energy: "/5", protein: "g", water: "oz", resting: "bpm", steps: "steps" };
const KEYS = { sleep: "sleepHours", energy: "energy", protein: "protein", water: "water", resting: "resting", steps: "steps" } as const;
/** Garmin's daily readings: complete only once the day is finished, so the last finished day stands for today. */
const isGarminDaily = (id: CaveVitalId): id is "resting" | "steps" => id === "resting" || id === "steps";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const atOffset = (start: string, minutes: number) => clock(new Date(Date.parse(start) + minutes * 60000).toISOString());
export const formatCaveValue = (id: CaveVitalId, v: number) =>
  id === "sleep" ? `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}` : id === "energy" ? String(Math.round(v * 10) / 10) : id === "steps" ? Math.round(v).toLocaleString("en-US") : String(Math.round(v));

/** Recorded values only: a missing reading never becomes zero. */
function values(rows: readonly PictureRow[], id: CaveVitalId): number[] {
  return rows.flatMap((r) => { const v = r[KEYS[id]]; return v !== undefined && Number.isFinite(v) ? [v] : []; });
}

/** The personal-baselines rule over the window's finished days of the same kind (all days when today's kind is unknown). */
export function caveUsual(rows: readonly PictureRow[], id: CaveVitalId, dayKind: DayKind | "ALL"): CaveUsual {
  const pool = values(rows.filter((r) => dayKind === "ALL" || r.context === dayKind), id).sort((a, b) => a - b);
  if (pool.length < MIN_BASELINE_DAYS) return { kind: "LEARNING", dayKind, days: pool.length, need: MIN_BASELINE_DAYS };
  return { kind: "RANGE", dayKind, low: quantile(pool, BAND_LOW_QUANTILE), high: quantile(pool, BAND_HIGH_QUANTILE), median: quantile(pool, 0.5), days: pool.length };
}

/** Today's 1-based place in its run, from the finished days that end the window. */
function placeToday(rows: readonly PictureRow[], dayKind: DayKind | "ALL"): number | undefined {
  if (dayKind === "ALL") return undefined;
  let n = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i]!.context === dayKind; i--) n++;
  return n + 1;
}

export interface CaveInputs {
  rows: readonly PictureRow[];
  readout: Pick<SystemsReadout, "day" | "lastMainSleep" | "proteinG" | "proteinTargetG" | "waterOz" | "checkIn">;
  checkIn: StateCheckIn | undefined;
  /** SUIT-ALIVE S5: today's protein or water against your usual by this point of the day. */
  pace?: PaceReading | undefined;
}

/** Pure: everything the cave shows for one vital. */
export function buildCaveVital(id: CaveVitalId, input: CaveInputs): CaveVital {
  const { rows, readout, checkIn } = input;
  const ctx = readout.day?.workContext;
  const dayKind: DayKind | "ALL" = ctx === "WORK" || ctx === "OFF" ? ctx : "ALL";
  const kindWord = dayKind === "WORK" ? "work days" : dayKind === "OFF" ? "days off" : "all days";
  const lastDaily = isGarminDaily(id) ? [...rows].reverse().find((r) => r[id] !== undefined && Number.isFinite(r[id])) : undefined;
  const today: CaveVital["today"] = isGarminDaily(id) ? { value: lastDaily?.[id], partial: false }
    : id === "sleep" ? { value: readout.lastMainSleep ? readout.lastMainSleep.minutes / 60 : undefined, partial: false }
    : id === "energy" ? { value: checkIn?.energy, partial: false }
    : id === "protein" ? { value: readout.proteinG ?? undefined, partial: true }
    : { value: readout.waterOz ?? undefined, partial: true };
  const usual = caveUsual(rows, id, dayKind);
  // A running total is judged only by pace (S5), never against a full day.
  const verdict = today.partial ? input.pace?.verdict
    : usual.kind === "RANGE" && today.value !== undefined ? (today.value < usual.low ? "BELOW" : today.value > usual.high ? "ABOVE" : "INSIDE") : undefined;

  const trend = rows.slice(-CAVE_TREND_DAYS).map((r) => ({ start: r.start, value: (() => { const v = r[KEYS[id]]; return v !== undefined && Number.isFinite(v) ? v : undefined; })() }));

  const position: CaveVital["position"] = [];
  const place = placeToday(rows, dayKind);
  if ((id === "sleep" || id === "energy") && place !== undefined && dayKind !== "ALL") {
    const p = runPositions(rows).find((x) => x.context === dayKind && x.position === place);
    const m = id === "sleep" ? p?.sleep : p?.energy;
    position.push({ label: `${dayKind === "WORK" ? "Shift" : "Day off"} ${place}, across runs`, value: m?.mean, days: m?.days ?? 0 });
  }
  for (const k of ["WORK", "OFF"] as const) {
    const v = values(rows.filter((r) => r.context === k), id);
    position.push({ label: k === "WORK" ? "Work days" : "Days off", value: pictureMean(v), days: v.length });
  }

  const facts: string[] = [];
  const last = [...rows].reverse().find((r) => r[KEYS[id]] !== undefined);
  if (id === "sleep") {
    if (readout.lastMainSleep) facts.push(readout.lastMainSleep.fromGarmin ? `From Garmin. Woke ${clock(readout.lastMainSleep.occurredAt)}.` : `Logged by you at ${clock(readout.lastMainSleep.recordedAt)}.`);
    else facts.push("No main sleep in the last 36 hours.");
    const timed = [...rows].reverse().find((r) => r.sleepWindow);
    if (timed?.sleepWindow) facts.push(`Last Garmin-timed sleep: asleep ${atOffset(timed.start, timed.sleepWindow.start)}, awake ${atOffset(timed.start, timed.sleepWindow.end)}.`);
    const naps = rows.slice(-1)[0]?.napMinutes;
    if (naps) facts.push(`Naps logged on the last finished day: ${naps} min.`);
    const prev = rows.slice(-3).flatMap((r) => r.sleepHours !== undefined ? [formatCaveValue("sleep", r.sleepHours)] : []);
    if (prev.length) facts.push(`Last ${prev.length === 1 ? "night" : `${prev.length} nights`}: ${prev.join(", ")}.`);
  } else if (id === "energy") {
    if (checkIn) facts.push(`Check-in ${clock(checkIn.recordedAt)}: energy ${checkIn.energy}, stress ${checkIn.stress}, mood ${checkIn.mood}, soreness ${checkIn.soreness}.`);
    else facts.push("No check-in today yet.");
    if (readout.checkIn) facts.push(`Capacity from it: ${readout.checkIn.capacity}.`);
    if (last?.energy !== undefined) facts.push(`Last finished day: energy ${last.energy}.`);
  } else if (isGarminDaily(id)) {
    facts.push(lastDaily ? `From Garmin, the last finished day (${new Date(lastDaily.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Today's reading is judged once the day ends.` : "No Garmin reading in the window yet. Import from Garmin in COMMAND.");
    const prev = rows.slice(-3).flatMap((r) => r[id] !== undefined ? [formatCaveValue(id, r[id]!)] : []);
    if (prev.length) facts.push(`Last ${prev.length === 1 ? "day" : `${prev.length} days`}: ${prev.join(", ")}.`);
  } else {
    const total = id === "protein" ? readout.proteinG : readout.waterOz;
    if (total === null) facts.push("No day started, so no running total.");
    else facts.push(id === "protein" ? `So far today: ${total} g${readout.proteinTargetG ? ` of your ${readout.proteinTargetG} g target` : ""}.` : `So far today: ${total} oz.`);
    const logs = rows.slice(-1)[0]?.marks?.[id === "protein" ? "meals" : "water"];
    if (logs?.length) facts.push(`Last finished day: ${logs.length} ${id === "protein" ? "meal" : "water"} log${logs.length === 1 ? "" : "s"}, first at ${atOffset(rows.slice(-1)[0]!.start, logs[0]!)}.`);
    facts.push(input.pace ? `${describePace(input.pace)} That's judged against your past ${input.pace.usual.dayKind === "WORK" ? "work days" : input.pace.usual.dayKind === "OFF" ? "days off" : "days"} at this hour, not a full day.` : "Today is a running total, so it's shown, not judged against a full day.");
  }

  const feeds = id === "sleep" ? { decides: true, text: "Feeds BEYOND's advice. Two short main sleeps in a row make TRAIN offer the reduced session, and main sleep sets System Status." }
    : id === "energy" ? { decides: true, text: "Feeds BEYOND's advice. Your check-in sets capacity: energy 1 makes it RED, 2 makes it YELLOW. Capacity decides TODAY's recommendation." }
    : { decides: false, text: "Informational. It does not change BEYOND's advice." };

  const range = usual.kind === "RANGE" ? `${usual.days} ${kindWord}` : `${usual.days} of ${usual.need} ${kindWord} needed`;
  const source = id === "sleep" ? [{ label: "Source", value: readout.lastMainSleep ? (readout.lastMainSleep.fromGarmin ? "Garmin · main sleep" : "Logged by you") : "None yet" }, { label: "Usual range from", value: range }]
    : id === "energy" ? [{ label: "Source", value: checkIn ? `Your check-in · ${clock(checkIn.recordedAt)}` : "No check-in today" }, { label: "Usual range from", value: range }]
    : isGarminDaily(id) ? [{ label: "Source", value: "Garmin · daily summary" }, { label: "Usual range from", value: range }]
    : [{ label: "Source", value: id === "protein" ? "Your meal and protein logs" : "Your water logs" }, { label: "Usual full day from", value: range }];

  return { id, title: TITLES[id], unit: UNITS[id], today, trend, usual, verdict, position, facts, feeds, source, pace: input.pace };
}

export async function getCaveVital(id: CaveVitalId, now: Date = new Date()): Promise<CaveVital> {
  const [readout, picture] = await Promise.all([getSystemsReadout(now), getWholePicture(now)]);
  const checkIn = readout.day ? await getLatestCheckIn(readout.day.id) : undefined;
  const histories = (id === "protein" || id === "water") && readout.day ? await getPaceHistories(readout.day, now) : null;
  const total = id === "protein" ? readout.proteinG : readout.waterOz;
  const pace = histories && total !== null && (id === "protein" || id === "water") ? paceReading(id, total, histories[id], minuteOfDay(histories.dayStart, now)) : undefined;
  return buildCaveVital(id, { rows: picture.rows, readout, checkIn, pace });
}

/** Plain words for the headline under the value. */
export function describeCaveVital(v: CaveVital): string {
  const unit = (n: number) => `${formatCaveValue(v.id, n)}${v.unit === "h" || v.unit === "/5" ? "" : ` ${v.unit}`}`;
  if (v.today.value === undefined) return v.id === "energy" ? "No check-in today yet." : v.id === "sleep" ? "No main sleep recorded in the last 36 hours." : isGarminDaily(v.id) ? "No Garmin reading on file yet." : "No day started.";
  if (v.usual.kind === "LEARNING") return `Still learning your usual: ${v.usual.days} of ${v.usual.need} days so far.`;
  const range = `${unit(v.usual.low)}–${unit(v.usual.high)}`;
  if (v.today.partial) return v.pace?.usual.kind === "RANGE" ? `${describePace(v.pace)} A usual full day is ${range}.` : `Running total. A usual full day is ${range}.`;
  if (v.verdict === "BELOW") return v.id === "sleep" ? `${Math.round((v.usual.median - v.today.value) * 60)} minutes under your usual ${formatCaveValue("sleep", v.usual.median)}. Usual range ${range}.` : `Under your usual ${range}.`;
  if (v.verdict === "ABOVE") return `Above your usual ${range}.`;
  return `Within your usual ${range}.`;
}

