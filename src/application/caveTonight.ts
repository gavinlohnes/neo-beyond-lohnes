import type { Recommendation, StateCheckIn } from "../domain/common/types";
import type { Obligation } from "../domain/intent/types";
import { classifyObligation } from "../engine/obligationRelevance";
import { formatLocalDate } from "../engine/scheduledContext";
import { caveUsual, formatCaveValue, type CaveVitalId } from "./caveVitals";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getLatestCheckIn, getLatestRecommendation, getRecommendationDecision, type RecommendationDecision } from "./queries";
import { getSystemsReadout, type SystemsReadout } from "./systemsReadoutQueries";
import { getWholePicture } from "./wholePictureQueries";
import { getPaceHistories, minuteOfDay, paceReading, type PaceReading } from "./pace";
import type { PictureRow } from "./wholePictureProjection";

/**
 * SUIT-ALIVE S3 — comms and the cave's Tonight (owner approval 2026-10-28, "go S3"; brief
 * docs/agent/SUIT-ALIVE.md). Read-only and derived on read. The call is the Engine's own latest
 * recommendation, unchanged. Beside it: which complete readings sit outside your own usual range
 * (S2's personal-baselines rule), ordered by how far outside, in widths of that range; and which
 * commitments are overdue. Nothing here is a score, nothing is combined into one number, nothing is
 * stored, and nothing reaches the Engine. Today's protein and water are running totals: S5 judges
 * them by pace (your usual by now); until pace has a range, the last finished lived day's totals are.
 */
export interface TonightReading {
  id: CaveVitalId;
  /**
   * "NOW": today's last main sleep or check-in. "BY_NOW": today's protein or water against your usual by
   * this point of the day (S5 pace). "LAST_FULL_DAY": the last finished lived day's total, until pace has a range.
   */
  when: "NOW" | "BY_NOW" | "LAST_FULL_DAY";
  value: number;
  low: number;
  high: number;
  median: number;
  verdict: "BELOW" | "INSIDE" | "ABOVE";
  /** How far outside the usual range, in widths of that range. 0 inside. Orders the list only; never shown. */
  distance: number;
}

export interface CaveTonight {
  recommendation: Recommendation | null;
  decision: RecommendationDecision | undefined;
  checkIn: StateCheckIn | null;
  /** Outside your usual range, furthest first. */
  off: TonightReading[];
  steady: TonightReading[];
  /** Readings that exist but have under the minimum days for a usual range. */
  learning: { id: CaveVitalId; days: number; need: number }[];
  late: { id: string; title: string; dueAt: string }[];
  /** CAVE-DATA D4: what changed since last shift; null when no finished shift is on file. */
  since?: SinceFact[] | null | undefined;
}

export interface TonightInputs {
  rows: readonly PictureRow[];
  readout: Pick<SystemsReadout, "day" | "lastMainSleep">;
  checkIn: StateCheckIn | null;
  recommendation: Recommendation | null;
  decision: RecommendationDecision | undefined;
  obligations: readonly Obligation[];
  today: string;
  /** SUIT-ALIVE S5: today's running totals against your usual by now. */
  pace?: Partial<Record<"protein" | "water", PaceReading>> | undefined;
}

const ORDER: readonly CaveVitalId[] = ["sleep", "energy", "protein", "water", "resting", "steps"];
type Kind = "WORK" | "OFF" | "ALL";

function readingFor(id: CaveVitalId, readout: TonightInputs["readout"], checkIn: StateCheckIn | null, last: PictureRow | undefined, todayKind: Kind):
  { value: number; kind: Kind; when: TonightReading["when"] } | null {
  if (id === "sleep") return readout.lastMainSleep ? { value: readout.lastMainSleep.minutes / 60, kind: todayKind, when: "NOW" } : null;
  if (id === "energy") return checkIn ? { value: checkIn.energy, kind: todayKind, when: "NOW" } : null;
  const value = last?.[id];
  if (!last || value === undefined || !Number.isFinite(value)) return null;
  return { value, kind: last.context === "WORK" || last.context === "OFF" ? last.context : "ALL", when: "LAST_FULL_DAY" };
}

/** Pure: everything Tonight and the comms line show. */
export function buildCaveTonight(input: TonightInputs): CaveTonight {
  const { rows, readout, checkIn } = input;
  const ctx = readout.day?.workContext;
  const todayKind: Kind = ctx === "WORK" || ctx === "OFF" ? ctx : "ALL";
  const last = rows.at(-1);
  const off: TonightReading[] = [], steady: TonightReading[] = [], learning: CaveTonight["learning"] = [];
  for (const id of ORDER) {
    const paced = id === "protein" || id === "water" ? input.pace?.[id] : undefined;
    const reading = paced?.usual.kind === "RANGE" ? { value: paced.value, kind: todayKind, when: "BY_NOW" as const } : readingFor(id, readout, checkIn, last, todayKind);
    if (!reading) continue;
    const usual = reading.when === "BY_NOW" ? paced!.usual : caveUsual(rows, id, reading.kind);
    if (usual.kind === "LEARNING") { learning.push({ id, days: usual.days, need: usual.need }); continue; }
    const width = Math.max(usual.high - usual.low, Math.abs(usual.median) * 0.1, 1e-6);
    // Ahead of your usual pace on a running total is not off-normal: there is still the rest of the day.
    const verdict = reading.value < usual.low ? "BELOW" : reading.value > usual.high && reading.when !== "BY_NOW" ? "ABOVE" : "INSIDE";
    const distance = verdict === "BELOW" ? (usual.low - reading.value) / width : verdict === "ABOVE" ? (reading.value - usual.high) / width : 0;
    (verdict === "INSIDE" ? steady : off).push({ id, when: reading.when, value: reading.value, low: usual.low, high: usual.high, median: usual.median, verdict, distance });
  }
  off.sort((a, b) => b.distance - a.distance || ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const late = input.obligations.filter((o) => o.dueAt && classifyObligation(o, input.today) === "OVERDUE")
    .map((o) => ({ id: o.id, title: o.title, dueAt: o.dueAt! })).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return { recommendation: input.recommendation, decision: input.decision, checkIn, off, steady, learning, late };
}

export async function getCaveTonight(now: Date = new Date()): Promise<CaveTonight> {
  const [readout, picture, obligations] = await Promise.all([getSystemsReadout(now), getWholePicture(now), getCurrentlyEligibleUnresolvedObligations()]);
  const day = readout.day;
  const [checkIn, recommendation] = day ? await Promise.all([getLatestCheckIn(day.id), getLatestRecommendation(day.id)]) : [undefined, undefined];
  const decision = day && recommendation ? await getRecommendationDecision(day.id, recommendation.id) : undefined;
  const histories = day ? await getPaceHistories(day, now) : null;
  const minute = histories ? minuteOfDay(histories.dayStart, now) : 0;
  const pace = histories ? {
    ...(readout.proteinG !== null ? { protein: paceReading("protein", readout.proteinG, histories.protein, minute) } : {}),
    ...(readout.waterOz !== null ? { water: paceReading("water", readout.waterOz, histories.water, minute) } : {}),
  } : undefined;
  return { ...buildCaveTonight({ rows: picture.rows, readout, checkIn: checkIn ?? null, recommendation: recommendation ?? null, decision, obligations, today: formatLocalDate(now), pace }),
    since: buildSinceLastShift(picture.rows, now, day?.workContext === "WORK" || day?.workContext === "OFF" ? day.workContext : undefined) };
}

const NAMES: Record<CaveVitalId, string> = { sleep: "Sleep", energy: "Energy", protein: "Protein", water: "Water", resting: "Resting HR", steps: "Steps" };
const UNIT: Record<CaveVitalId, string> = { sleep: "", energy: "", protein: " g", water: " oz", resting: " bpm", steps: "" };
const show = (id: CaveVitalId, v: number) => `${formatCaveValue(id, v)}${UNIT[id]}`;
const range = (r: TonightReading) => r.low === r.high ? show(r.id, r.low) : `${formatCaveValue(r.id, r.low)}–${show(r.id, r.high)}`;

/** One reading against your normal, in the cave's terse voice: "Sleep 5:10, 80 min under your usual." */
export function describeTonightReading(r: TonightReading): string {
  const lead = r.when === "LAST_FULL_DAY" ? `${NAMES[r.id]} last full day ${show(r.id, r.value)}` : `${NAMES[r.id]} ${show(r.id, r.value)}`;
  const by = r.when === "BY_NOW" ? " by now" : "";
  if (r.verdict === "INSIDE") return `${lead}, inside your usual ${range(r)}${by}.`;
  if (r.id === "sleep" && r.verdict === "BELOW") return `${lead}, ${Math.round((r.median - r.value) * 60)} min under your usual.`;
  return `${lead}, ${r.verdict === "BELOW" ? "under" : "above"} your usual ${range(r)}${by}.`;
}

/**
 * SUIT-VOLUME-001: what may speak on TODAY's comms line. Steps stay in VITALS and TONIGHT but never take
 * one of the line's two slots: a low-step day after a night shift must not push sleep out of view.
 */
export const commsOff = (t: CaveTonight): TonightReading[] => t.off.filter((r) => r.id !== "steps");

/** TODAY's comms line: the two readings furthest from your normal, or that everything sits inside it. Never the call itself. */
export function describeComms(t: CaveTonight): string {
  const off = commsOff(t);
  if (off.length) return off.slice(0, 2).map(describeTonightReading).join(" ");
  // Steps off alone is not "everything inside your normal": say so plainly, without taking a slot.
  if (t.off.length) return "Inside your normal, apart from steps. Open TONIGHT for them.";
  if (t.steady.length) return t.learning.length ? "Readings judged so far sit inside your normal. Still learning the rest." : "Every reading sits inside your normal.";
  if (t.learning.length) {
    const most = Math.max(...t.learning.map((l) => l.days));
    return `Still learning your normal: ${most} of ${t.learning[0]!.need} days so far.`;
  }
  return "Nothing to read yet. Log sleep or check in.";
}

/**
 * CAVE-DATA D4 — DELTA in TONIGHT (owner go 2026-10-28, "get D4 and D5 done"; DELTA-002 step 1 and 2).
 * What changed since your last finished shift, as plain facts against your own usuals: how long ago it
 * was, how the nights since sat against your usual sleep, when you last trained, and how weight moved.
 * Each fact names the day it came from so it can open that day's records. Read from Whole Picture's
 * rows; nothing is scored, ranked or stored, and nothing reaches the Engine.
 */
export interface SinceFact {
  key: "SHIFT" | "SLEEP" | "TRAINING" | "WEIGHT";
  text: string;
  /** Why this line: where it was read from. */
  why: string;
  /** The day whose records it opens, when one day backs it. */
  dayId?: string | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (start: string, now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(start)) / DAY_MS));
const ago = (n: number) => n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
function lastIndexOf<T>(list: readonly T[], test: (item: T) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i]!)) return i;
  return -1;
}
const lastOf = <T>(list: readonly T[], test: (item: T) => boolean): T | undefined => list[lastIndexOf(list, test)];

/** Pure: the "since last shift" lines, or null when no finished shift is on file. */
export function buildSinceLastShift(rows: readonly PictureRow[], now: Date, todayKind?: "WORK" | "OFF" | undefined): SinceFact[] | null {
  const lastIndex = lastIndexOf(rows, (r) => r.context === "WORK" && r.dayIds.length > 0);
  if (lastIndex < 0) return null;
  const shift = rows[lastIndex]!, after = rows.slice(lastIndex + 1).filter((r) => r.dayIds.length > 0);
  const facts: SinceFact[] = [{ key: "SHIFT", dayId: shift.dayIds[0], why: "Your declared work days.",
    text: `Last shift ${ago(daysAgo(shift.start, now))}; ${after.length === 0 ? (todayKind === "OFF" ? "today is your first day off" : "no full day off since")
      : `${after.length} full day${after.length === 1 ? "" : "s"} off since${todayKind === "OFF" ? ", and today" : ""}`}.` }];

  const nights = after.filter((r) => r.sleepHours !== undefined && Number.isFinite(r.sleepHours));
  const usual = caveUsual(rows, "sleep", "OFF");
  if (nights.length && usual.kind === "RANGE") {
    const under = nights.filter((r) => r.sleepHours! < usual.low);
    facts.push({ key: "SLEEP", dayId: (under.at(-1) ?? nights.at(-1))!.dayIds[0], why: `Main sleep against your usual on days off (${usual.days} days).`,
      text: under.length ? `${under.length} of ${nights.length} night${nights.length === 1 ? "" : "s"} since ran under your usual sleep.` : `Every night since sat at or above your usual sleep.` });
  } else if (shift.sleepHours !== undefined) {
    const work = caveUsual(rows, "sleep", "WORK");
    if (work.kind === "RANGE") facts.push({ key: "SLEEP", dayId: shift.dayIds[0], why: `Main sleep against your usual on work days (${work.days} days).`,
      text: `Last shift's sleep ${formatCaveValue("sleep", shift.sleepHours)}, ${shift.sleepHours < work.low ? "under" : shift.sleepHours > work.high ? "above" : "inside"} your usual.` });
  }

  const trained = lastOf(rows, (r) => r.sessions > 0 && r.dayIds.length > 0);
  facts.push(trained
    ? { key: "TRAINING", dayId: trained.dayIds[0], why: "Logged and imported workouts.", text: `Last workout ${ago(daysAgo(trained.start, now))}.` }
    : { key: "TRAINING", why: "Logged and imported workouts.", text: `No workout in the last ${rows.length} days.` });

  const before = lastOf(rows.slice(0, lastIndex + 1), (r) => r.weight !== undefined);
  const latest = lastOf(after, (r) => r.weight !== undefined);
  if (before && latest) {
    const change = Math.round((latest.weight! - before.weight!) * 10) / 10;
    facts.push({ key: "WEIGHT", dayId: latest.dayIds[0], why: "Your weigh-ins, the day's mean.",
      text: change === 0 ? "Weight unchanged since last shift." : `Weight ${change < 0 ? "down" : "up"} ${Math.abs(change)} lb since last shift.` });
  }
  return facts;
}
