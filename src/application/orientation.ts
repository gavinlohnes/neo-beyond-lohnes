import type { BeyondDay, Recommendation, RecommendationKind, StateCheckIn } from "../domain/common/types";
import type { Obligation } from "../domain/intent/types";
import type { PreparationState } from "../domain/preparation";
import type { RecommendationDraft } from "../engine/recommendationDraft";
import { classifyObligation } from "../engine/obligationRelevance";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { groupLivedDays } from "../engine/livedDaySeries";
import { projectPersonalBaselines } from "../engine/personalBaselines";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { getActiveDay, getLatestCheckIn, getLatestRecommendation, getSchedulePattern, getWorkContextSource } from "./queries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getRecommendationDraft } from "./recommendationDraftQueries";
import { getPreparation } from "./preparation";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getShiftSleepPlan, type ShiftSleepPlan } from "./shiftSleepPlan";
import { getLastMainSleep } from "./systemStatus";
import { getTodayPicture, type TodayPicture } from "./todayPicture";
import { shiftRun } from "./shiftRun";
import { livedReadAt } from "./earlyDayStart";


/**
 * GRAYSON C1.1 · Orientation slice 1 (Gavin, 2026-11-20): what a deliberate START DAY opens on a work day. One
 * read-and-route composition of records BEYOND already keeps: Situation → You → Delta → at most one
 * recommendation → the runway to the shift → at most two actions → Release. Evolves BEYOND 4.0-d's briefing
 * preview (the former todayBriefing.ts), which this replaces.
 *
 * Authority (Option A, Gavin): the only recommendation is the Engine's recorded one, or else the approved
 * pre-check-in draft, each with its own kind, title and rationale. Delta's sentence is deterministic, built from
 * the facts below, and never adds advice of its own. Reading this writes nothing. A source that can't be read
 * is reported as unread, never as empty.
 */

export const MAX_ACTIONS = 2;
const MIN = 60_000;

type Read<T> = T | "ERROR";

export interface OrientationInput {
  now: Date;
  day: Pick<BeyondDay, "id" | "startedAt" | "workContext">;
  /** Who set today's work context: SCHEDULE_STANDING (the saved schedule) or anything else (recorded by him). */
  contextBySchedule: boolean;
  /** Today's scheduled kind, for the unconfirmed-day question. */
  scheduled: "WORK" | "OFF" | null;
  picture: Read<TodayPicture | null>;
  shift: { start: Date; end: Date } | null;
  run: { position: number; length: number } | null;
  plan: Read<ShiftSleepPlan | null>;
  sleep: Read<{ minutes: number; fromGarmin: boolean; band: { low: number; high: number; kind: "WORK" | "OFF" } | null } | null>;
  checkIn: Read<Pick<StateCheckIn, "energy" | "stress" | "mood"> | null>;
  recommendation: Read<Pick<Recommendation, "kind" | "title" | "rationale" | "suggestedCommand"> | null>;
  draft: Read<Pick<RecommendationDraft, "kind" | "title" | "reason" | "nights"> | null>;
  prep: Read<PreparationState | null>;
  obligations: Read<readonly Pick<Obligation, "id" | "title" | "dueAt" | "plannedAt" | "remindAt" | "status">[]>;
}

export type SleepLine =
  | { state: "KNOWN"; minutes: number; source: "GARMIN" | "LOGGED"; band: { low: number; high: number; kind: "WORK" | "OFF" } | null; under: boolean }
  | { state: "NONE" }
  | { state: "ERROR" };

export type CheckInLine = { state: "DONE"; energy: number; stress: number; mood: number } | { state: "NONE" } | { state: "ERROR" };

export interface OrientationRecommendation {
  source: "ENGINE" | "DRAFT";
  kind: RecommendationKind | RecommendationDraft["kind"];
  title: string;
  rationale: string;
  /** The Engine's own action: START_WORKOUT opens TRAIN. */
  opensTrain: boolean;
}

export type RunwayKind = "NOW" | "NAP" | "DUE" | "SHIFT" | "CAFFEINE";
export interface RunwayRow { kind: RunwayKind; at: string; time: string; label: string; detail: string }

export type OrientationAction =
  | { kind: "PREP"; line: string; detail: string }
  | { kind: "COMMITMENT"; obligationId: string; line: string; detail: string };

export interface Orientation {
  /** WORK: the full work-day composition. UNKNOWN: ask first. OFF: C1.2's grammar; this slice doesn't open itself. */
  mode: "WORK" | "UNKNOWN" | "OFF";
  date: string;
  stateLabel: string;
  situation:
    | { kind: "SHIFT"; time: string; sub: string; line: string; source: string }
    | { kind: "ASK"; line: string; predicted: "WORK" | "OFF" | null }
    | { kind: "PLAIN"; line: string; source: string }
    | { kind: "ERROR" };
  sleep: SleepLine;
  checkIn: CheckInLine;
  delta: string | null;
  recommendation: OrientationRecommendation | null;
  guidanceUnread: boolean;
  runway: RunwayRow[];
  actions: OrientationAction[];
  unread: string[];
  release: string;
}

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const hm = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
const span = (ms: number) => {
  const m = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(m / 60), r = m % 60;
  return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`;
};

function sleepLine(sleep: OrientationInput["sleep"]): SleepLine {
  if (sleep === "ERROR") return { state: "ERROR" };
  if (!sleep) return { state: "NONE" };
  return { state: "KNOWN", minutes: sleep.minutes, source: sleep.fromGarmin ? "GARMIN" : "LOGGED", band: sleep.band, under: !!sleep.band && sleep.minutes < sleep.band.low };
}

function recommendationOf(input: OrientationInput): OrientationRecommendation | null {
  if (input.recommendation !== "ERROR" && input.recommendation) {
    const r = input.recommendation;
    return { source: "ENGINE", kind: r.kind, title: r.title, rationale: r.rationale, opensTrain: r.suggestedCommand === "START_WORKOUT" };
  }
  if (input.draft !== "ERROR" && input.draft) {
    return { source: "DRAFT", kind: input.draft.kind, title: input.draft.title, rationale: input.draft.reason, opensTrain: false };
  }
  return null;
}

const ENGINE_READ: Partial<Record<RecommendationKind, string>> = {
  STABILIZE: "Your check-in says today is heavy. The advice is to protect the basics and nothing more.",
  RECOVER: "Your check-in points to recovery, so the advice is a lighter evening.",
  POST_SHIFT_TRANSITION: "Last shift isn't shifted down from yet. That comes before anything new.",
  OBLIGATION_DUE: "Something you committed to is due. The advice puts it first.",
  NO_ACTION_REQUIRED: "Nothing in your records asks for more than the basics before the shift.",
};

/**
 * Delta's one or two sentences. Deterministic, from the facts on screen only; restates or explains the Engine's
 * advice and never adds its own. Certainty never exceeds the evidence: no band means no comparison, no sleep
 * record means no reading of rest, and nothing is inferred about mood or capacity without a check-in.
 */
export function deltaLine(input: {
  sleep: SleepLine; checkIn: CheckInLine; recommendation: OrientationRecommendation | null; shortNights: number;
  run: { position: number; length: number } | null;
}): string | null {
  const { sleep, checkIn, recommendation: rec, run } = input;
  const night = run && run.length > 1 ? ` going into night ${run.position} of ${run.length}` : "";
  if (checkIn.state === "DONE" && rec?.source === "ENGINE") {
    if (rec.kind === "EXECUTE_PLANNED_WORK") {
      return input.shortNights >= 2
        ? "You feel up for it. The last two sleeps were short, so the session is scaled down rather than skipped."
        : "You feel up for it, and there's planned work. The advice is to do it.";
    }
    const read = ENGINE_READ[rec.kind as RecommendationKind] ?? null;
    // A fact, not advice: a short night stays visible even when the Engine asks for nothing more.
    const short = sleep.state === "KNOWN" && sleep.under && sleep.band ? ` Last night was under your usual for ${sleep.band.kind === "WORK" ? "a work day" : "a day off"}.` : "";
    return read ? read + short : null;
  }
  const askCheckIn = checkIn.state === "NONE" ? " Your check-in sets today's advice." : "";
  if (sleep.state === "ERROR") return `I can't see last night's sleep, so I'm not reading anything into today.${askCheckIn}`;
  if (sleep.state === "NONE") return `No main sleep is recorded since the shift, so I can't say how rested you are.${askCheckIn}`;
  if (rec?.source === "DRAFT" && rec.kind === "RECOVER") {
    return `Two short sleeps${night}. Your check-in sets today's advice; until you answer, the draft below is the cautious read.`;
  }
  if (rec?.source === "DRAFT" && rec.kind === "POST_SHIFT_TRANSITION") {
    return `Last shift isn't shifted down from yet, so that's the draft below.${askCheckIn}`;
  }
  if (!sleep.band) return `Slept ${hm(sleep.minutes)}. BEYOND is still learning your usual, so there's no comparison yet.${askCheckIn}`;
  const kind = sleep.band.kind === "WORK" ? "a work day" : "a day off";
  if (sleep.under) return `Last night was under your usual for ${kind}.${askCheckIn}`;
  return `Sleep is in your usual range for ${kind}.${askCheckIn}`;
}

/** Pure. The work-day Orientation from already-read records. Never writes, never ranks a second recommendation. */
export function deriveOrientation(input: OrientationInput): Orientation {
  const { now, day } = input;
  const unread: string[] = [];
  const picture = input.picture === "ERROR" ? null : input.picture;
  if (input.picture === "ERROR") unread.push("day");
  const mode: Orientation["mode"] = day.workContext === "WORK" ? "WORK" : day.workContext === "OFF" ? "OFF" : "UNKNOWN";
  const dateAt = livedReadAt(day, now);
  const date = dateAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  const source = input.contextBySchedule ? "SAVED SCHEDULE" : "RECORDED BY YOU";

  let situation: Orientation["situation"];
  if (input.picture === "ERROR") situation = { kind: "ERROR" };
  else if (mode === "UNKNOWN") {
    situation = {
      kind: "ASK", predicted: input.scheduled,
      line: input.scheduled
        ? `Your saved schedule predicts ${input.scheduled === "WORK" ? "a work day" : "a day off"}, but today isn't confirmed.`
        : "Today isn't recorded and there's no saved schedule, so BEYOND doesn't guess.",
    };
  } else if (mode === "WORK" && input.shift) {
    const started = input.shift.start.getTime() <= now.getTime();
    situation = {
      kind: "SHIFT", time: clock(input.shift.start), source,
      sub: started ? `on shift · ends ${clock(input.shift.end)}` : `on shift · in ${span(input.shift.start.getTime() - now.getTime())}`,
      line: picture?.now?.line ?? "A work day.",
    };
  } else situation = { kind: "PLAIN", line: picture?.now?.line ?? (mode === "WORK" ? "A work day with no scheduled shift time." : "A day off."), source };

  const sleep = sleepLine(input.sleep);
  if (sleep.state === "ERROR") unread.push("sleep");
  const checkIn: CheckInLine = input.checkIn === "ERROR" ? { state: "ERROR" } : input.checkIn
    ? { state: "DONE", energy: input.checkIn.energy, stress: input.checkIn.stress, mood: input.checkIn.mood } : { state: "NONE" };
  if (checkIn.state === "ERROR") unread.push("check-in");
  const guidanceUnread = input.recommendation === "ERROR" || (input.recommendation === null && input.draft === "ERROR");
  if (guidanceUnread) unread.push("advice");
  const recommendation = recommendationOf(input);
  const shortNights = input.draft !== "ERROR" && input.draft?.kind === "RECOVER" ? input.draft.nights.length
    : input.recommendation !== "ERROR" && input.recommendation?.kind === "EXECUTE_PLANNED_WORK" && /two main sleeps/.test(input.recommendation.rationale) ? 2 : 0;
  const delta = mode === "UNKNOWN" && sleep.state === "NONE" && checkIn.state !== "DONE" ? null
    : deltaLine({ sleep, checkIn, recommendation, shortNights, run: mode === "WORK" ? input.run : null });

  // The runway: only times BEYOND already has, from now to the shift, then the night's caffeine cut-off.
  const runway: RunwayRow[] = [{ kind: "NOW", at: now.toISOString(), time: clock(now), label: "Now", detail: "" }];
  const horizon = input.shift && input.shift.start > now ? input.shift.start : null;
  const plan = input.plan === "ERROR" ? null : input.plan;
  if (input.plan === "ERROR") unread.push("sleep plan");
  if (mode === "WORK" && horizon) {
    const nap = plan?.windows.find((w) => w.kind === "NAP" && Date.parse(w.end) > now.getTime() && Date.parse(w.end) <= horizon.getTime());
    if (nap) {
      const from = new Date(Math.max(Date.parse(nap.start), now.getTime()));
      runway.push({ kind: "NAP", at: from.toISOString(), time: clock(from), label: "Nap window", detail: `until ${clock(new Date(nap.end))} · from your usual wake time` });
    }
  }
  const obligations = input.obligations === "ERROR" ? [] : input.obligations;
  if (input.obligations === "ERROR") unread.push("commitments");
  const today = formatLocalDate(now);
  const due = obligations
    .map((o) => ({ o, tier: classifyObligation(o as Obligation, today) }))
    .filter(({ tier }) => tier === "OVERDUE" || tier === "DUE_TODAY");
  const timed = new Set<string>();
  for (const { o, tier } of due) {
    if (tier !== "DUE_TODAY" || !o.remindAt || !o.dueAt) continue;
    const [h, m] = o.remindAt.split(":").map(Number);
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h!, m!, 0, 0);
    if (formatLocalDate(at) !== o.dueAt || at.getTime() < now.getTime() || (horizon && at.getTime() > horizon.getTime())) continue;
    timed.add(o.id);
    runway.push({ kind: "DUE", at: at.toISOString(), time: clock(at), label: o.title, detail: "due today · your reminder" });
  }
  if (mode === "WORK" && input.shift && horizon) {
    runway.push({ kind: "SHIFT", at: input.shift.start.toISOString(), time: clock(input.shift.start), label: "On shift", detail: `until ${clock(input.shift.end)} · ${source.toLowerCase()}` });
  }
  if (mode === "WORK" && plan && input.shift && Date.parse(plan.shift.start) === input.shift.start.getTime() && Date.parse(plan.caffeineAt) > now.getTime()) {
    const at = new Date(plan.caffeineAt);
    runway.push({ kind: "CAFFEINE", at: plan.caffeineAt, time: clock(at), label: "Caffeine cutoff", detail: plan.caffeine.setBy === "OWNER" ? `${plan.caffeine.hours} h before you'd sleep · your setting` : `${plan.caffeine.hours} h before you'd sleep · BEYOND's default` });
  }
  runway.sort((a, b) => (a.kind === "NOW" ? -1 : b.kind === "NOW" ? 1 : Date.parse(a.at) - Date.parse(b.at)));

  // At most two actions, in the design's presentation order: preparation, then a due commitment.
  const actions: OrientationAction[] = [];
  const prep = input.prep === "ERROR" ? null : input.prep;
  if (input.prep === "ERROR") unread.push("preparation");
  if (mode === "WORK" && prep && horizon) {
    const open = (["FOOD", "BOTTLE"] as const).filter((item) => prep[item].value === "UNCONFIRMED");
    if (open.length > 0) {
      actions.push({ kind: "PREP", line: open.length === 2 ? "Food and bottle" : open[0] === "FOOD" ? "Food" : "Bottle", detail: "Not confirmed for tonight." });
    }
  }
  for (const { o, tier } of due) {
    if (actions.length >= MAX_ACTIONS) break;
    if (timed.has(o.id)) continue;
    actions.push({ kind: "COMMITMENT", obligationId: o.id, line: o.title, detail: tier === "OVERDUE" ? "Overdue." : "Due today." });
  }

  const before = horizon ? ` before ${clock(horizon)}` : " today";
  const release = unread.length > 0
    ? `Some records couldn't be read (${unread.join(", ")}). Your records are unchanged.`
    : recommendation || actions.length > 0 || runway.length > 1
      ? `No other recorded item is due${before}.`
      : "Not enough is recorded yet for a recommendation. Nothing here is assumed.";

  return { mode, date, stateLabel: picture?.now?.label ?? (mode === "UNKNOWN" ? "NOT CONFIRMED" : mode === "WORK" ? "WORK" : "DAY OFF"),
    situation, sleep, checkIn, delta, recommendation, guidanceUnread, runway, actions: actions.slice(0, MAX_ACTIONS), unread, release };
}

const settle = async <T>(p: Promise<T>): Promise<Read<T>> => p.catch(() => "ERROR" as const);

/** Read only. The active day's Orientation, or null with no lived day started. */
export async function getOrientation(now: Date = new Date()): Promise<Orientation | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const at = livedReadAt(day, now);
  const pattern = await getSchedulePattern();
  const [picture, source, plan, last, summaries, checkIn, recommendation, draft, prep, obligations] = await Promise.all([
    settle(getTodayPicture(now)), getWorkContextSource(day.id).catch(() => undefined), settle(getShiftSleepPlan(now)),
    settle(getLastMainSleep(day.id, now)), getDaySummaries().catch(() => null), settle(getLatestCheckIn(day.id).then((c) => c ?? null)),
    settle(getLatestRecommendation(day.id).then((r) => r ?? null)), settle(getRecommendationDraft(day.id, now)),
    settle(getPreparation(day.id)), settle(getCurrentlyEligibleUnresolvedObligations()),
  ]);
  let sleep: OrientationInput["sleep"] = last === "ERROR" ? "ERROR" : null;
  if (last !== "ERROR" && last) {
    let band: { low: number; high: number; kind: "WORK" | "OFF" } | null = null;
    if (summaries) {
      const owner = groupLivedDays(summaries).get(mostRecentBoundaryAtOrBefore(new Date(last.occurredAt)).toISOString());
      const kind = owner && owner.kind !== "UNKNOWN" ? owner.kind : null;
      const reading = kind ? projectPersonalBaselines(summaries, now).find((b) => b.measure === "MAIN_SLEEP" && b.dayKind === kind) : undefined;
      if (kind && reading && reading.kind !== "LEARNING") band = { low: reading.low, high: reading.high, kind };
    }
    sleep = { minutes: last.minutes, fromGarmin: last.fromGarmin, band };
  }
  const run = shiftRun(at, pattern);
  const shift = livedDayShiftWindow(new Date(day.startedAt), pattern);
  return deriveOrientation({
    now, day, contextBySchedule: source === "SCHEDULE_STANDING", scheduled: isOperatorSavedSchedule(pattern) ? (shift ? "WORK" : "OFF") : null,
    picture, shift, run: run && run.kind === "WORK" ? { position: run.position, length: run.length } : null,
    plan, sleep, checkIn, recommendation, draft, prep, obligations,
  });
}
