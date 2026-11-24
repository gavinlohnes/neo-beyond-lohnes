import type { BeyondDay, Recommendation, RecommendationKind, StateCheckIn } from "../domain/common/types";
import type { Obligation } from "../domain/intent/types";
import type { WhyTrace } from "../domain/intelligence/types";
import type { PreparationState } from "../domain/preparation";
import type { RecommendationDraft } from "../engine/recommendationDraft";
import { classifyObligation } from "../engine/obligationRelevance";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { groupLivedDays } from "../engine/livedDaySeries";
import { projectPersonalBaselines } from "../engine/personalBaselines";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { say, type DeltaLineKey, type DeltaVoice } from "./deltaVoice";
import { getActiveDay, getLatestCheckIn, getLatestRecommendation, getMinimumDayStatus, getSchedulePattern, getWorkContextSource } from "./queries";
import { RECOVERY_CONTRACT } from "./recoveryContract";
import { hasPlanItem, livedDayDates } from "./lifeTransition";
import { db } from "../persistence/db";
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
  /** C1.2: Minimum Day switched on for this day (his own switch). */
  minimumDay?: Read<boolean> | undefined;
  /** C1.2: recovery-contract items he planned for this lived day, by title. */
  recoveryPlan?: Read<readonly string[]> | undefined;
  /** C1.2: the latest submitted mood per lived day, oldest first, recent days only. */
  recentMoods?: Read<readonly number[]> | undefined;
  /** C1.2: on a day off, when the next shift starts. */
  backOn?: Date | null | undefined;
  /** C1.6: Delta's voice (words only). PLAIN when absent. */
  voice?: DeltaVoice | undefined;
}

/** C1.2: what the day is for, from the life state TODAY already names. */
export type DayPurpose = "WORK" | "RECOVERY" | "OFF" | "FLIP" | "UNKNOWN";

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
  /** The recorded work context: WORK, OFF, or UNKNOWN (ask first). */
  mode: "WORK" | "UNKNOWN" | "OFF";
  /** C1.2: what the day is for; the composition follows it. */
  purpose: DayPurpose;
  /** C1.2: a hard day (Minimum Day, or the Engine's STABILIZE after his check-in): one action at most, gentler words. */
  hard: boolean;
  /** C1.2: a factual line when mood has dropped across his last three submitted check-ins. Never a diagnosis. */
  trend: string | null;
  /** C1.2: on the first day after a run, the recovery plan items he set. */
  recoveryPlan: string[];
  date: string;
  stateLabel: string;
  situation:
    | { kind: "SHIFT"; time: string; sub: string; line: string; source: string }
    | { kind: "ASK"; line: string; predicted: "WORK" | "OFF" | null }
    | { kind: "PLAIN"; line: string; source: string }
    | { kind: "OFF"; headline: string; sub: string; line: string; source: string }
    | { kind: "ERROR" };
  sleep: SleepLine;
  checkIn: CheckInLine;
  delta: string | null;
  /** GRAYSON C6.4: why Delta said it (the rule and the facts it read), or null when Delta is silent. */
  deltaWhy: WhyTrace | null;
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


/** C1.2: mood strictly lower on each of the last three submitted check-ins (one per lived day). Pure. */
export function moodTrend(moods: readonly number[]): readonly [number, number, number] | null {
  if (moods.length < 3) return null;
  const [a, b, c] = moods.slice(-3) as [number, number, number];
  return a > b && b > c ? [a, b, c] : null;
}

/**
 * Delta's one to three sentences. Deterministic, from the facts on screen only; restates or explains the Engine's
 * advice and never adds its own. Certainty never exceeds the evidence: no band means no comparison, no sleep
 * record means no reading of rest, and nothing is inferred about mood or capacity without a check-in. C1.2: the
 * day's purpose sets the framing, a hard day is gentler, and a sustained mood drop is named only on a hard day.
 */
export function deltaRead(input: {
  sleep: SleepLine; checkIn: CheckInLine; recommendation: OrientationRecommendation | null; shortNights: number;
  run: { position: number; length: number } | null;
  purpose?: DayPurpose | undefined; minimumDay?: boolean | undefined; trend?: boolean | undefined; dueCount?: number | undefined;
  /** C1.6: the voice Delta speaks in. Words only; hard days are always PLAIN. */
  voice?: DeltaVoice | undefined;
}): { text: string; rule: string } | null {
  const { sleep, checkIn, recommendation: rec, run } = input;
  const out = (text: string, rule: string) => ({ text, rule });
  const voice = input.voice ?? "PLAIN";
  const v = (key: DeltaLineKey, vars?: Parameters<typeof say>[2]) => say(voice, key, vars);
  const purpose = input.purpose ?? "WORK";
  const work = purpose === "WORK";
  const night = run && run.length > 1 ? ` going into night ${run.position} of ${run.length}` : "";
  const sustained = input.trend ? say("PLAIN", "SUSTAINED") : "";
  // Review of #598: on a recovery day the sleep followed the last shift, so say that rather than "a work day".
  const shortIn = (tone: DeltaVoice) => sleep.state === "KNOWN" && sleep.under && sleep.band
    ? purpose === "RECOVERY" && sleep.band.kind === "WORK" ? say(tone, "SHORT_FACT_RECOVERY") : say(tone, "SHORT_FACT", { kind: sleep.band.kind })
    : "";
  const short = shortIn(voice);
  // Hard days drop the act: plain words in every voice.
  if (input.minimumDay) return out(say("PLAIN", "MINIMUM") + sustained, "Minimum Day is on, so Delta keeps to the essentials.");
  if (checkIn.state === "DONE" && rec?.source === "ENGINE") {
    if (rec.kind === "EXECUTE_PLANNED_WORK") return out(v(input.shortNights >= 2 ? "EXEC_SHORT" : "EXEC_OK"), input.shortNights >= 2 ? "The Engine says do the planned work; two or more short nights in a row, so Delta says so." : "The Engine says do the planned work, after your check-in.");
    // A fact, not advice: a short night stays visible even when the Engine asks for nothing more.
    if (rec.kind === "NO_ACTION_REQUIRED") return out(v("NO_ACTION", { where: work ? "before the shift" : "today" }) + short, "The Engine asks for nothing more after your check-in; a short night, if there was one, is still named.");
    // Kept short: on a sustained drop, that sentence replaces the sleep fact (YOU still shows the sleep).
    if (rec.kind === "STABILIZE") return out(say("PLAIN", "STABILIZE") + (sustained || shortIn("PLAIN")), "The Engine says stabilize after your check-in; a hard day, so plain words.");
    const key: DeltaLineKey | null = rec.kind === "RECOVER" ? "ENGINE_RECOVER" : rec.kind === "POST_SHIFT_TRANSITION" ? "ENGINE_POST_SHIFT"
      : rec.kind === "OBLIGATION_DUE" ? "ENGINE_OBLIGATION" : null;
    return key ? out(v(key) + short, `The Engine\u2019s ${rec.kind === "RECOVER" ? "recover" : rec.kind === "POST_SHIFT_TRANSITION" ? "post-shift" : "obligation-due"} recommendation, after your check-in.`) : null;
  }
  const askCheckIn = checkIn.state === "NONE" ? v("ASK_CHECKIN") : "";
  if (sleep.state === "ERROR") return out(v("SLEEP_ERROR") + askCheckIn, "Sleep couldn\u2019t be read, so Delta says nothing about rest.");
  if (sleep.state === "NONE") return out(v("SLEEP_NONE", { since: work || purpose === "RECOVERY" ? "since the shift" : "recently" }) + askCheckIn, "No main sleep is recorded, so Delta doesn\u2019t read your rest.");
  if (rec?.source === "DRAFT" && rec.kind === "RECOVER") return out(v("DRAFT_RECOVER", { night: work ? night : "" }), "A recover draft from your recent nights, before your check-in; the Engine decides after it.");
  if (rec?.source === "DRAFT" && rec.kind === "POST_SHIFT_TRANSITION") return out(v("DRAFT_POST_SHIFT") + askCheckIn, "A post-shift draft, before your check-in; the Engine decides after it.");
  const due = input.dueCount ?? 0;
  if (purpose === "RECOVERY") return out(v("RECOVERY") + short + askCheckIn, "The first day after a run of shifts: a recovery day.");
  if (purpose === "OFF") return out(v(due === 0 ? "OFF_NONE" : due === 1 ? "OFF_ONE" : "OFF_MANY", { n: due }) + short + askCheckIn, "A day off: Delta names what is due.");
  if (purpose === "FLIP") return out(v("FLIP") + short + askCheckIn, "A flip day between nights and days.");
  if (!sleep.band) return out(v("SLEEP_LEARNING", { hm: hm(sleep.minutes) }) + askCheckIn, "Your usual sleep range isn\u2019t learned yet, so there\u2019s no comparison.");
  if (sleep.under) return out(v("SLEEP_UNDER", { kind: sleep.band.kind }) + askCheckIn, "Last sleep was under your usual range for this kind of day.");
  return out(v("SLEEP_IN", { kind: sleep.band.kind }) + askCheckIn, "Last sleep was within your usual range for this kind of day.");
}

/** Delta's line as text; deltaRead also says which rule produced it (C6.4). */
export function deltaLine(input: Parameters<typeof deltaRead>[0]): string | null {
  return deltaRead(input)?.text ?? null;
}

/** GRAYSON C6.4: the facts Delta's line read, in plain words (the day's date, never a score). */
export function deltaFacts(date: string, input: Parameters<typeof deltaRead>[0]): WhyTrace["facts"] {
  const { sleep, checkIn, recommendation: rec, run } = input;
  const facts: WhyTrace["facts"] = [{ label: "Day", value: `${date} · ${({ WORK: "work day", RECOVERY: "recovery day", OFF: "day off", FLIP: "flip day", UNKNOWN: "not confirmed" } as const)[input.purpose ?? "WORK"]}` }];
  facts.push({ label: "Sleep", value: sleep.state === "KNOWN" ? `${hm(sleep.minutes)} main sleep · ${sleep.source === "GARMIN" ? "Garmin" : "logged by you"}` : sleep.state === "NONE" ? `none recorded ${input.purpose === "WORK" || input.purpose === "RECOVERY" || !input.purpose ? "since the shift" : "recently"}` : "couldn\u2019t be read" });
  if (sleep.state === "KNOWN") facts.push({ label: "Usual range", value: sleep.band ? `${hm(sleep.band.low)}–${hm(sleep.band.high)} on a ${sleep.band.kind === "WORK" ? "work day" : "day off"}` : "not learned yet" });
  facts.push({ label: "Check-in", value: checkIn.state === "DONE" ? `Energy ${checkIn.energy} · Stress ${checkIn.stress} · Mood ${checkIn.mood}` : checkIn.state === "NONE" ? "not yet" : "couldn\u2019t be read" });
  facts.push({ label: "Guidance", value: rec ? `${rec.source === "ENGINE" ? "Engine" : "Draft before check-in"}: ${rec.title}` : "none yet" });
  if (input.shortNights > 0) facts.push({ label: "Short nights", value: `${input.shortNights} in a row` });
  if (run && run.length > 1) facts.push({ label: "Shift run", value: `night ${run.position} of ${run.length}` });
  if (input.minimumDay) facts.push({ label: "Minimum Day", value: "on" });
  if ((input.dueCount ?? 0) > 0) facts.push({ label: "Due", value: `${input.dueCount} commitment${input.dueCount === 1 ? "" : "s"}` });
  return facts;
}

/** Pure. The day's Orientation from already-read records. Never writes, never ranks a second recommendation. */
export function deriveOrientation(input: OrientationInput): Orientation {
  const { now, day } = input;
  const unread: string[] = [];
  const picture = input.picture === "ERROR" ? null : input.picture;
  if (input.picture === "ERROR") unread.push("day");
  const mode: Orientation["mode"] = day.workContext === "WORK" ? "WORK" : day.workContext === "OFF" ? "OFF" : "UNKNOWN";
  const dateAt = livedReadAt(day, now);
  const date = dateAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
  const source = input.contextBySchedule ? "SAVED SCHEDULE" : "RECORDED BY YOU";
  const life = picture?.now?.state;
  const purpose: DayPurpose = mode === "UNKNOWN" ? "UNKNOWN"
    : life === "WORK_RUN" ? "WORK" : life === "RECOVERY" ? "RECOVERY" : life === "FLIP" ? "FLIP" : life === "FREE" ? "OFF"
    : mode === "WORK" ? "WORK" : "OFF";

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
  } else if (mode === "OFF") {
    const back = input.backOn ?? null;
    const tomorrow = back && formatLocalDate(back) === formatLocalDate(new Date(dateAt.getFullYear(), dateAt.getMonth(), dateAt.getDate() + 1, 12));
    situation = {
      // The headline says when he's back, so the state line doesn't repeat it.
      kind: "OFF", source, line: (picture?.now?.line ?? "A day off.").replace(/\s*Back on [^.]+\.$/, ""),
      headline: back ? (tomorrow ? "Back on tomorrow" : `Back on ${back.toLocaleDateString("en-US", { weekday: "short" })}`) : "Day off",
      sub: back ? `${clock(back)} · ${source.toLowerCase()}` : "no shift on your saved schedule ahead",
    };
  } else situation = { kind: "PLAIN", line: picture?.now?.line ?? "A work day with no scheduled shift time.", source };

  const sleep = sleepLine(input.sleep);
  if (sleep.state === "ERROR") unread.push("sleep");
  const checkIn: CheckInLine = input.checkIn === "ERROR" ? { state: "ERROR" } : input.checkIn
    ? { state: "DONE", energy: input.checkIn.energy, stress: input.checkIn.stress, mood: input.checkIn.mood } : { state: "NONE" };
  if (checkIn.state === "ERROR") unread.push("check-in");
  const guidanceUnread = input.recommendation === "ERROR" || (input.recommendation === null && input.draft === "ERROR");
  if (guidanceUnread) unread.push("advice");
  const recommendation = recommendationOf(input);
  const obligations = input.obligations === "ERROR" ? [] : input.obligations;
  if (input.obligations === "ERROR") unread.push("commitments");
  const today = formatLocalDate(now);
  const due = obligations
    .map((o) => ({ o, tier: classifyObligation(o as Obligation, today) }))
    .filter(({ tier }) => tier === "OVERDUE" || tier === "DUE_TODAY");
  const moods = input.recentMoods === undefined || input.recentMoods === "ERROR" ? null : input.recentMoods;
  if (input.recentMoods === "ERROR") unread.push("check-in history");
  const drop = moods ? moodTrend(moods) : null;
  const trend = drop ? `Mood has dropped across your last three check-ins (${drop.join(" → ")}).` : null;
  // Review of #598: an unreadable Minimum Day is reported like every other source, never silently "off".
  const minimumDay = input.minimumDay === true;
  if (input.minimumDay === "ERROR") unread.push("Minimum Day");
  const hard = minimumDay || (checkIn.state === "DONE" && recommendation?.source === "ENGINE" && recommendation.kind === "STABILIZE");
  const shortNights = input.draft !== "ERROR" && input.draft?.kind === "RECOVER" ? input.draft.nights.length
    : input.recommendation !== "ERROR" && input.recommendation?.kind === "EXECUTE_PLANNED_WORK" && /two main sleeps/.test(input.recommendation.rationale) ? 2 : 0;
  const deltaInputs = { sleep, checkIn, recommendation, shortNights, run: mode === "WORK" ? input.run : null, purpose, minimumDay, trend: !!trend && hard, dueCount: due.length, voice: input.voice };
  const read = mode === "UNKNOWN" && sleep.state === "NONE" && checkIn.state !== "DONE" ? null : deltaRead(deltaInputs);
  const delta = read?.text ?? null;
  // GRAYSON C6.4: the rule that produced Delta's line and the facts it read, nothing it didn't.
  const deltaWhy: WhyTrace | null = read ? { rule: read.rule, facts: deltaFacts(date, deltaInputs) } : null;

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

  // At most two actions (one on a hard day), in the design's presentation order: preparation, then a due commitment.
  // C1.2: work preparation belongs to work days only.
  const limit = hard ? 1 : MAX_ACTIONS;
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
    if (actions.length >= limit) break;
    if (timed.has(o.id)) continue;
    actions.push({ kind: "COMMITMENT", obligationId: o.id, line: o.title, detail: tier === "OVERDUE" ? "Overdue." : "Due today." });
  }

  const before = horizon ? ` before ${clock(horizon)}` : " today";
  const recoveryPlan = purpose === "RECOVERY" && input.recoveryPlan && input.recoveryPlan !== "ERROR" ? [...input.recoveryPlan] : [];
  if (input.recoveryPlan === "ERROR") unread.push("recovery plan");
  const release = unread.length > 0
    ? `Some records couldn't be read (${unread.join(", ")}). Your records are unchanged.`
    : recommendation || actions.length > 0 || runway.length > 1 || purpose === "OFF" || purpose === "RECOVERY" || purpose === "FLIP"
      ? actions.length === 0 && runway.length <= 1 && !horizon ? "Nothing is recorded as due today." : `No other recorded item is due${before}.`
      : "Not enough is recorded yet for a recommendation. Nothing here is assumed.";

  return { mode, purpose, hard, trend, recoveryPlan, date, stateLabel: picture?.now?.label ?? (mode === "UNKNOWN" ? "NOT CONFIRMED" : mode === "WORK" ? "WORK" : "DAY OFF"),
    situation, sleep, checkIn, delta, deltaWhy, recommendation, guidanceUnread, runway, actions: actions.slice(0, limit), unread, release };
}

const settle = async <T>(p: Promise<T>): Promise<Read<T>> => p.catch(() => "ERROR" as const);

/** Read only. The active day's Orientation, or null with no lived day started. */
export async function getOrientation(now: Date = new Date(), voice: DeltaVoice = "PLAIN"): Promise<Orientation | null> {
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
  const [minimum, recoveryPlan, recentMoods] = await Promise.all([
    settle(getMinimumDayStatus(day.id).then((m) => m.enabled)),
    settle(plannedRecovery(at)),
    settle(latestMoods(at)),
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
  const backOn = run && run.kind === "OFF" ? livedDayShiftWindow(run.next, pattern)?.start ?? null : null;
  return deriveOrientation({
    now, day, contextBySchedule: source === "SCHEDULE_STANDING", scheduled: isOperatorSavedSchedule(pattern) ? (shift ? "WORK" : "OFF") : null,
    picture, shift, run: run && run.kind === "WORK" ? { position: run.position, length: run.length } : null,
    plan, sleep, checkIn, recommendation, draft, prep, obligations,
    minimumDay: minimum, recoveryPlan, recentMoods, backOn, voice,
  });
}

/** C1.2: the recovery-contract items he planned for this lived day (LIFE-STATE-003), by title. */
async function plannedRecovery(at: Date): Promise<string[]> {
  const dates = livedDayDates(at);
  const planned: string[] = [];
  for (const item of RECOVERY_CONTRACT) if (await hasPlanItem(item.title, dates)) planned.push(item.title);
  return planned;
}

/** C1.2: the latest submitted mood for each of the recent lived days (7), oldest first. Read only. */
async function latestMoods(at: Date): Promise<number[]> {
  const since = new Date(mostRecentBoundaryAtOrBefore(at).getTime() - 7 * 24 * 3_600_000).toISOString();
  const rows = (await db.checkIns.toArray()).filter((c) => c.recordedAt >= since);
  const byDay = new Map<string, { at: string; mood: number }>();
  for (const c of rows) {
    const key = c.beyondDayId;
    const prev = byDay.get(key);
    if (!prev || c.recordedAt > prev.at) byDay.set(key, { at: c.recordedAt, mood: c.mood });
  }
  return [...byDay.values()].sort((a, b) => a.at.localeCompare(b.at)).map((v) => v.mood);
}
