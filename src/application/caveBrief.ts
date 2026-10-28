import type { StateCheckIn } from "../domain/common/types";
import type { DecisionJournalEntry } from "../domain/journal/types";
import type { MemoryFact } from "../domain/memory";
import { PREPARATION_LABELS, type PreparationItem, type PreparationState } from "../domain/preparation";
import { getCaveRoute, type CaveRoute } from "./caveRoute";
import { getCaveVital, type CaveUsual } from "./caveVitals";
import { getDecisionJournalEntries } from "./journalQueries";
import { getMemoryFacts } from "./memory";
import { getMealEntries } from "./nutritionQueries";
import { getPaceHistories, minuteOfDay, paceReading, paceUsual, type PaceReading } from "./pace";
import { getPreparation } from "./preparation";
import { getActiveDay, getHydrationEntries, getLatestCheckIn, getProteinEntries, getWorkPeriodEnded, getWorkPeriodStarted } from "./queries";
import { isShiftDebrief, livedDayStartOf } from "./reflect";
import { getShiftHandoffState, type ShiftHandoffNote } from "./shiftHandoffQueries";
import { getSystemsReadout } from "./systemsReadoutQueries";

/**
 * SUIT-ALIVE S6 — preflight and after-action (owner approval 2026-10-28, "go S6 and make it bigger").
 * PREFLIGHT polls each system before the shift, GO / HOLD / LATE / ADVISORY, every state earned from a
 * record you already made: a check-in, a meal, water, food and bottle preparation, last shift's note
 * read. HOLD becomes LATE once the shift has started. ADVISORY is a reading outside your own normal; it
 * never blocks anything. AFTER-ACTION sets what was planned (your schedule, your usual pace, your usual
 * sleep) beside what happened, row by row. Read-only composition: no score, no combined number, no
 * count of items, nothing stored, nothing reaching the Engine.
 */
export type CheckState = "GO" | "HOLD" | "LATE" | "ADVISORY";
export type BriefPhase = "BEFORE" | "ON" | "AFTER" | "NO_SHIFT";

export interface CheckItem {
  key: "SLEEP" | "CHECK_IN" | "FUEL" | "HYDRATION" | "PACK_FOOD" | "PACK_BOTTLE" | "HANDOFF";
  system: string;
  state: CheckState;
  detail: string;
  source: string;
}

export interface AarRow { key: string; label: string; planned: string; actual: string; verdict: "ON_PLAN" | "OFF_PLAN" | "NONE" }

export interface CaveBrief {
  dayId: string;
  phase: BriefPhase;
  shift: { start: string; end: string } | null;
  items: CheckItem[];
  /** Open items by system name, in poll order; empty means all systems go. */
  open: string[];
  handoff: ShiftHandoffNote | null;
  /** Your own preparation notes (MEMORY-001), active only. */
  memory: { kind: string; statement: string }[];
  lastDebrief: { felt: string; next?: string | undefined; at: string } | null;
  prep: PreparationState | null;
  aar: AarRow[] | null;
  /** Work marked ended, when it was (SHIFT-CHANGE-001 reads the real end). */
  endedAt?: string | null | undefined;
  /** Work marked started, when it was (SHIFT-CHANGE-001 reads the real start). */
  startedAt?: string | null | undefined;
}

export interface BriefInputs {
  dayId: string;
  route: CaveRoute;
  now: Date;
  checkIn: StateCheckIn | null;
  /** Last main sleep, hours, and how it sits against your usual (S2/S3 rule). */
  sleep: { hours: number; verdict: "BELOW" | "INSIDE" | "ABOVE" | undefined; at: string } | null;
  meals: { at: string; proteinG: number }[];
  /** Every protein-bearing log (meals and protein-only), for protein by a time. */
  proteinLogs: { at: string; proteinG: number }[];
  water: { at: string; oz: number }[];
  proteinTotal: number;
  waterTotal: number;
  pace: { protein?: PaceReading | undefined; water?: PaceReading | undefined };
  /** Your usual totals by the shift's end, for the after-action's "planned". */
  usualByEnd: { protein?: CaveUsual | undefined; water?: CaveUsual | undefined };
  prep: PreparationState | null;
  handoff: ShiftHandoffNote | null;
  memory: readonly MemoryFact[];
  debriefs: readonly DecisionJournalEntry[];
  workEndedAt: string | null;
  /** SHIFT-CHANGE-001: work marked started, when it was. */
  workStartedAt?: string | null | undefined;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const hm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const span = (u: CaveUsual | undefined, unit: string) => !u || u.kind !== "RANGE" ? null
  : Math.round(u.low) === Math.round(u.high) ? `${Math.round(u.low)} ${unit}` : `${Math.round(u.low)}–${Math.round(u.high)} ${unit}`;

/** Pure: the preflight poll and, after the shift, the after-action report. */
export function buildCaveBrief(input: BriefInputs): CaveBrief {
  const { route, now } = input;
  const start = route.waypoints.find((w) => w.kind === "SHIFT_START");
  const end = route.waypoints.find((w) => w.kind === "SHIFT_END");
  const shift = start && end ? { start: start.at, end: end.at } : null;
  const t = now.getTime();
  const phase: BriefPhase = !shift ? "NO_SHIFT" : input.workEndedAt || t >= Date.parse(shift.end) ? "AFTER" : input.workStartedAt || t >= Date.parse(shift.start) ? "ON" : "BEFORE";
  const open = (done: boolean): CheckState => done ? "GO" : phase === "BEFORE" || phase === "NO_SHIFT" ? "HOLD" : "LATE";
  const cutoff = shift ? Date.parse(shift.start) : t;
  const items: CheckItem[] = [];

  const s = input.sleep;
  items.push({ key: "SLEEP", system: "SLEEP", source: "Main sleep",
    state: !s ? open(false) : s.verdict === "BELOW" ? "ADVISORY" : "GO",
    detail: !s ? "No main sleep in the last 36 hours." : `${hm(s.hours)}${s.verdict === "BELOW" ? ", under your usual. Expect a heavier shift." : s.verdict ? ", inside your usual." : "."}` });

  const c = input.checkIn;
  items.push({ key: "CHECK_IN", system: "CHECK-IN", source: "Your check-in", state: open(!!c),
    detail: c ? `${clock(c.recordedAt)}: energy ${c.energy}, stress ${c.stress}.` : "Not checked in. Capacity is unread until you do." });

  const preShiftMeal = input.meals.filter((m) => Date.parse(m.at) <= cutoff).at(-1);
  const proteinBehind = input.pace.protein?.verdict === "BELOW";
  items.push({ key: "FUEL", system: "FUEL", source: "Meals and protein logs",
    state: !preShiftMeal ? open(false) : proteinBehind ? "ADVISORY" : "GO",
    detail: preShiftMeal ? `Meal at ${clock(preShiftMeal.at)}. ${input.proteinTotal} g protein so far${proteinBehind ? ", behind your usual pace" : ""}.` : "No meal logged before the shift." });

  const waterBehind = input.pace.water?.verdict === "BELOW";
  items.push({ key: "HYDRATION", system: "HYDRATION", source: "Water logs",
    state: input.waterTotal <= 0 ? open(false) : waterBehind ? "ADVISORY" : "GO",
    detail: input.waterTotal <= 0 ? "No water logged yet." : `${input.waterTotal} oz so far${waterBehind ? ", behind your usual pace" : ""}.` });

  const pack = (item: PreparationItem, key: "PACK_FOOD" | "PACK_BOTTLE", system: string) => {
    const value = input.prep?.[item].value;
    items.push({ key, system, source: "Preparation", state: open(!!value && value !== "UNCONFIRMED"),
      detail: !input.prep ? "Preparation could not be read." : PREPARATION_LABELS[value!] + "." });
  };
  if (shift) { pack("FOOD", "PACK_FOOD", "PACK · FOOD"); pack("BOTTLE", "PACK_BOTTLE", "PACK · BOTTLE"); }

  if (shift) items.push({ key: "HANDOFF", system: "HANDOFF", source: "Last shift's note", state: open(!input.handoff),
    detail: input.handoff ? `Unread note from ${new Date(input.handoff.notedAt).toLocaleDateString("en-US", { weekday: "short" })} ${clock(input.handoff.notedAt)}.` : "No unread note from last shift." });

  const debriefs = input.debriefs.filter(isShiftDebrief).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dayStart = livedDayStartOf(now).getTime();
  const previous = debriefs.filter((d) => Date.parse(d.createdAt) < dayStart).at(-1);
  const felt = (d: DecisionJournalEntry) => d.decision.replace(/^Shift felt /, "");
  const lastDebrief = previous ? { felt: felt(previous), next: previous.expectation?.replace(/^Next shift: /, ""), at: previous.createdAt } : null;

  let aar: AarRow[] | null = null;
  if (shift && phase === "AFTER") {
    const endAt = input.workEndedAt ?? shift.end;
    const during = (at: string) => Date.parse(at) >= Date.parse(shift.start) && Date.parse(at) <= Date.parse(endAt);
    const onShift = input.meals.filter((m) => during(m.at));
    const waterByEnd = input.water.filter((w) => Date.parse(w.at) <= Date.parse(endAt)).reduce((sum, w) => sum + w.oz, 0);
    const proteinByEnd = input.proteinLogs.filter((m) => Date.parse(m.at) <= Date.parse(endAt)).reduce((sum, m) => sum + m.proteinG, 0);
    const judge = (value: number, u: CaveUsual | undefined): AarRow["verdict"] => !u || u.kind !== "RANGE" ? "NONE" : value < u.low ? "OFF_PLAN" : "ON_PLAN";
    const sleepAt = route.waypoints.find((w) => w.kind === "SLEEP");
    const today = debriefs.filter((d) => Date.parse(d.createdAt) >= dayStart).at(-1);
    aar = [
      { key: "SHIFT", label: "SHIFT", planned: `${clock(shift.start)}–${clock(shift.end)}`, verdict: "NONE",
        actual: [input.workStartedAt ? `Started ${clock(input.workStartedAt)}` : null, input.workEndedAt ? `ended ${clock(input.workEndedAt)}` : null]
          .filter(Boolean).join(" · ").replace(/^ended/, "Ended") || "Per schedule" },
      { key: "PRE_MEAL", label: "MEAL BEFORE", planned: `By ${clock(shift.start)}`, verdict: preShiftMeal ? "ON_PLAN" : "OFF_PLAN",
        actual: preShiftMeal ? clock(preShiftMeal.at) : "None logged" },
      { key: "ON_SHIFT_MEALS", label: "MEALS ON SHIFT", planned: "Your call", verdict: "NONE",
        actual: onShift.length ? onShift.map((m) => clock(m.at)).join(", ") : "None logged" },
      { key: "WATER", label: "WATER", planned: span(input.usualByEnd.water, "oz") ? `Usual ${span(input.usualByEnd.water, "oz")} by ${clock(endAt)}` : "Learning your usual",
        actual: `${waterByEnd} oz`, verdict: judge(waterByEnd, input.usualByEnd.water) },
      { key: "PROTEIN", label: "PROTEIN", planned: span(input.usualByEnd.protein, "g") ? `Usual ${span(input.usualByEnd.protein, "g")} by ${clock(endAt)}` : "Learning your usual",
        actual: `${proteinByEnd} g`, verdict: judge(proteinByEnd, input.usualByEnd.protein) },
      { key: "SLEEP", label: "SLEEP", planned: sleepAt ? `Usual ${clock(sleepAt.at)}` : "No usual yet", verdict: "NONE",
        actual: s && Date.parse(s.at) > Date.parse(endAt) ? `${hm(s.hours)}, woke ${clock(s.at)}` : "Not yet" },
      { key: "DEBRIEF", label: "DEBRIEF", planned: "Close the shift", verdict: today ? "ON_PLAN" : "NONE",
        actual: today ? `Felt ${felt(today).toLowerCase()}` : "Not yet" },
    ];
  }

  return {
    dayId: input.dayId, phase, shift, items, open: items.filter((i) => i.state === "HOLD" || i.state === "LATE").map((i) => i.system),
    handoff: input.handoff, prep: input.prep, lastDebrief, aar, endedAt: input.workEndedAt, startedAt: input.workStartedAt ?? null,
    memory: input.memory.filter((m) => m.status === "ACTIVE" && m.kind.startsWith("PREP")).map((m) => ({ kind: m.kind, statement: m.statement })),
  };
}

/** The verdict line under the poll, in the cave's voice. Names what's open; never counts it. */
export function describeBrief(b: CaveBrief): string {
  if (b.phase === "NO_SHIFT") return "No shift on the schedule today.";
  if (b.phase === "AFTER") return "Shift's done. Here's how it went against the plan.";
  if (!b.open.length) return b.items.some((i) => i.state === "ADVISORY") ? "All systems go. Mind the advisories." : "All systems go.";
  // Spoken names, not panel labels: "PACK · FOOD" reads as "food" in a sentence.
  const names = b.open.map((n) => n.replace(/^PACK · /, "").toLowerCase());
  const late = b.items.some((i) => i.state === "LATE");
  return `${late ? "Late" : "Hold"}: ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}.`;
}

export async function getCaveBrief(now: Date = new Date()): Promise<CaveBrief | null> {
  const [route, day] = await Promise.all([getCaveRoute(now), getActiveDay()]);
  if (!route || !day) return null;
  const [readout, checkIn, meals, protein, water, prep, handoffState, memory, journal, ended, histories] = await Promise.all([
    getSystemsReadout(now), getLatestCheckIn(day.id), getMealEntries(day.id), getProteinEntries(day.id), getHydrationEntries(day.id),
    getPreparation(day.id).catch(() => null), getShiftHandoffState(), getMemoryFacts().catch(() => []), getDecisionJournalEntries(),
    getWorkPeriodEnded(day.id), getPaceHistories(day, now),
  ]);
  const started = await getWorkPeriodStarted(day.id);
  const minute = minuteOfDay(histories.dayStart, now);
  const shiftEnd = route.waypoints.find((w) => w.kind === "SHIFT_END");
  const endMinute = shiftEnd ? minuteOfDay(histories.dayStart, new Date(ended?.occurredAt ?? shiftEnd.at)) : minute;
  const proteinTotal = readout.proteinG ?? 0, waterTotal = readout.waterOz ?? 0;
  // Protein by time: meals and protein-only logs together, as the day's protein total counts them.
  const proteinLogs = [...meals.map((m) => ({ at: m.at, proteinG: m.effectiveProteinG })), ...protein.map((p) => ({ at: p.at, proteinG: p.effectiveGrams }))]
    .sort((a, b) => a.at.localeCompare(b.at));
  const sleep = readout.lastMainSleep ? await getCaveVital("sleep", now) : null;
  return buildCaveBrief({
    dayId: day.id, route, now, checkIn: checkIn ?? null,
    sleep: readout.lastMainSleep ? { hours: readout.lastMainSleep.minutes / 60, verdict: sleep?.verdict, at: readout.lastMainSleep.occurredAt } : null,
    // A meal is a meal; protein-only logs count toward protein but not as "a meal before the shift".
    meals: meals.map((m) => ({ at: m.at, proteinG: m.effectiveProteinG })),
    proteinLogs,
    water: water.map((w) => ({ at: w.at, oz: w.effectiveAmountOz })),
    proteinTotal, waterTotal,
    pace: { protein: paceReading("protein", proteinTotal, histories.protein, minute), water: paceReading("water", waterTotal, histories.water, minute) },
    usualByEnd: { protein: paceUsual(histories.protein, endMinute), water: paceUsual(histories.water, endMinute) },
    prep, handoff: handoffState.unread ?? null, memory, debriefs: journal, workEndedAt: ended?.occurredAt ?? null, workStartedAt: started?.occurredAt ?? null,
  });
}
