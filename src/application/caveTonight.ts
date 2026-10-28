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

const ORDER: readonly CaveVitalId[] = ["sleep", "energy", "protein", "water"];
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
  return buildCaveTonight({ rows: picture.rows, readout, checkIn: checkIn ?? null, recommendation: recommendation ?? null, decision, obligations, today: formatLocalDate(now), pace });
}

const NAMES: Record<CaveVitalId, string> = { sleep: "Sleep", energy: "Energy", protein: "Protein", water: "Water" };
const UNIT: Record<CaveVitalId, string> = { sleep: "", energy: "", protein: " g", water: " oz" };
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

/** TODAY's comms line: the two readings furthest from your normal, or that everything sits inside it. Never the call itself. */
export function describeComms(t: CaveTonight): string {
  if (t.off.length) return t.off.slice(0, 2).map(describeTonightReading).join(" ");
  if (t.steady.length) return t.learning.length ? "Readings judged so far sit inside your normal. Still learning the rest." : "Every reading sits inside your normal.";
  if (t.learning.length) {
    const most = Math.max(...t.learning.map((l) => l.days));
    return `Still learning your normal: ${most} of ${t.learning[0]!.need} days so far.`;
  }
  return "Nothing to read yet. Log sleep or check in.";
}
