import type { HabitAnswer } from "./habits";
import type { WhyTrace } from "./intelligence/types";

/**
 * GRAYSON-CHALLENGE-LADDER-001 (C6.6, Gavin 2026-11-25: habits only, on with an easy off, all four stages): when a
 * habit he set keeps slipping, Delta climbs one step at a time and never further than the evidence allows:
 * ASK what got in the way → NAME the pattern → CHALLENGE with dated evidence (only for misses that weren't shift,
 * tiredness or plan) → EXAMINE the plan and stop asking. "Challenge the plan before the person" (Vision).
 *
 * Pure and deterministic: the same history and answers always give the same line. A miss is only an explicit
 * "Didn't do it" on a day the habit was due; an unanswered day is never a miss. Nothing here touches the Engine,
 * recommendations or the habit itself.
 */
export const LADDER_REASONS = ["SHIFT", "TIRED", "FORGOT", "DIDNT_FEEL", "PLAN", "OTHER"] as const;
export type LadderReason = (typeof LADDER_REASONS)[number];
export const LADDER_REASON_LABEL: Record<LadderReason, string> = {
  SHIFT: "Shift or work ran over", TIRED: "Too tired or recovering", FORGOT: "Forgot",
  DIDNT_FEEL: "Didn't feel like it", PLAN: "The plan doesn't fit", OTHER: "Something else",
};
/** What his answers point to, named as a problem with the plan or the moment, never with him. */
export const LADDER_PATTERN: Record<LadderReason, string> = {
  SHIFT: "work days leave no room for it", TIRED: "it lands when you're worn out", FORGOT: "it slips out of mind",
  DIDNT_FEEL: "it doesn't feel worth it in the moment", PLAN: "the plan doesn't fit", OTHER: "something else keeps getting in the way",
};
export const LADDER_STAGES = ["ASK", "NAME", "CHALLENGE", "EXAMINE"] as const;
export type LadderStage = (typeof LADDER_STAGES)[number];
export const LADDER_REPLIES = ["RIGHT", "NOT_RIGHT", "CHANGE_PLAN", "START_SMALLER", "KEEP", "LATER"] as const;
export type LadderReply = (typeof LADDER_REPLIES)[number];
export type LadderAnswerValue = LadderReason | LadderReply;

/** The floors, in one place. */
export const LADDER = {
  WINDOW_DAYS: 28,
  ASK_WINDOW_DAYS: 14,
  ASK_MISSES: 2,
  /** Only ask about a miss this recent; older ones are left alone. */
  ASK_RECENT_DAYS: 7,
  NAME_MISSES: 3,
  NAME_ANSWERS: 2,
  CHALLENGE_AVOIDANCE: 3,
  EXAMINE_MISSES: 6,
  EXAMINE_AFTER_CHALLENGES: 2,
  QUIET_DAYS: 14,
} as const;

export interface LadderDay { date: string; applies: boolean; answer: HabitAnswer; work: "WORK" | "OFF" | "UNKNOWN"; lowCapacity: boolean }
export interface LadderHabit { id: string; name: string; history: readonly LadderDay[] }
/** One of his answers to a ladder line. `missDate` is the miss an ASK answer explains. `date` is the lived date he answered on. */
export interface LadderAnswer { habitId: string; stage: LadderStage; answer: LadderAnswerValue; date: string; missDate?: string | undefined }
export interface LadderLine {
  habitId: string; habitName: string; stage: LadderStage; text: string;
  /** The miss an ASK line is about. */
  missDate?: string | undefined;
  misses: string[];
  why: WhyTrace;
}

const dayNumber = (date: string) => Math.round(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 86_400_000);
const within = (date: string, today: string, days: number) => { const d = dayNumber(today) - dayNumber(date); return d >= 0 && d < days; };
/** "Wed Nov 18": no inner comma, so a list of them reads cleanly. */
const weekday = (date: string) => { const d = new Date(`${date}T12:00:00`); return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`; };
const AVOIDANCE: ReadonlySet<LadderReason> = new Set(["FORGOT", "DIDNT_FEEL"]);
const isReason = (a: LadderAnswerValue): a is LadderReason => (LADDER_REASONS as readonly string[]).includes(a);

/** The ladder for one habit, or null when it should stay quiet. Exported for tests; the screen uses `deriveLadderLine`. */
export function deriveHabitLadder(habit: LadderHabit, answers: readonly LadderAnswer[], today: string): LadderLine | null {
  const mine = answers.filter((a) => a.habitId === habit.id);
  const recent = (days: number) => mine.filter((a) => within(a.date, today, days));
  // NOT RIGHT goes back to the first step and is quiet for 14 days. So is a finished EXAMINE, and CHANGE THE PLAN; all
  // three restart the counting, so misses under the old plan never carry over.
  if (recent(LADDER.QUIET_DAYS).some((a) => a.answer === "NOT_RIGHT" || a.stage === "EXAMINE" || a.answer === "CHANGE_PLAN")) return null;
  const since = [...mine].filter((a) => a.answer === "NOT_RIGHT" || a.answer === "CHANGE_PLAN" || a.stage === "EXAMINE").map((a) => a.date).sort().at(-1);
  const counted = (d: LadderDay) => within(d.date, today, LADDER.WINDOW_DAYS) && (!since || d.date > since);
  const misses = habit.history.filter((d) => d.applies && d.answer === "NOT_DONE" && counted(d)).map((d) => d.date).sort();
  if (!misses.length) return null;
  const missDay = new Map(habit.history.map((d) => [d.date, d]));
  const asks = mine.filter((a) => a.stage === "ASK" && a.missDate && misses.includes(a.missDate) && isReason(a.answer));
  const reasonOf = new Map(asks.map((a) => [a.missDate!, a.answer as LadderReason]));
  const explained = misses.filter((m) => reasonOf.has(m));
  const answeredSince = (stage: LadderStage) => mine.filter((a) => a.stage === stage && (!since || a.date > since) && within(a.date, today, LADDER.WINDOW_DAYS));
  const named = answeredSince("NAME").filter((a) => a.answer === "RIGHT");
  const challenges = answeredSince("CHALLENGE").filter((a) => a.answer !== "LATER").map((a) => a.date).sort();
  const name = habit.name;
  const evidence = { label: "Misses", value: misses.map(weekday).join(" · ") };
  const why = (rule: string, extra: { label: string; value: string }[] = []): WhyTrace => ({ rule, facts: [{ label: "Habit", value: name }, evidence, ...extra] });
  const base = { habitId: habit.id, habitName: name, misses };

  // #708 review: a challenge answer counts toward EXAMINE only when a new miss came after the one before it, so
  // agreeing twice to the same evidence never escalates.
  const challengesWithNewMisses = challenges.filter((c, i) => i === 0 || misses.some((m) => m > challenges[i - 1]! && m <= c)).length;
  // Gavin, 2026-11-25: "I'd rather the first line ever shown always be a question." Until Delta has asked about this
  // habit once (any ASK answer, NOT NOW included), nothing but ASK can show, however many misses there are.
  const askedBefore = mine.some((a) => a.stage === "ASK");
  // 4. EXAMINE: enough misses, or a challenge answered twice with new misses in between.
  if (askedBefore && (misses.length >= LADDER.EXAMINE_MISSES || challengesWithNewMisses >= LADDER.EXAMINE_AFTER_CHALLENGES)) {
    return { ...base, stage: "EXAMINE",
      text: `${name} didn't happen ${misses.length} times in 4 weeks. That points to the plan. Change the days, make it smaller, pause it, or keep it as it is. Delta won't ask about it for two weeks either way.`,
      why: why(`${LADDER.EXAMINE_MISSES} or more misses in ${LADDER.WINDOW_DAYS} days, or a challenge answered twice: examine the plan, then two quiet weeks.`) };
  }
  const due = habit.history.filter((d) => d.applies && d.answer !== "UNRECORDED" && counted(d)).length;
  const counts = new Map<LadderReason, number>();
  for (const m of explained) counts.set(reasonOf.get(m)!, (counts.get(reasonOf.get(m)!) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || LADDER_REASONS.indexOf(a[0]) - LADDER_REASONS.indexOf(b[0]))[0];
  const reasonFacts = explained.map((m) => ({ label: weekday(m), value: LADDER_REASON_LABEL[reasonOf.get(m)!] }));

  // 3. CHALLENGE: only after he agreed with the named pattern, and only for misses he put down to forgetting or not
  // feeling like it on days that weren't low-capacity. Never for shift, tiredness or the plan.
  const avoided = explained.filter((m) => AVOIDANCE.has(reasonOf.get(m)!) && !missDay.get(m)?.lowCapacity);
  const constrained = explained.length - avoided.length;
  // #708 review: after he answers a challenge, it waits for a new forgot / didn't-feel miss before it can show again.
  const lastChallenge = challenges.at(-1);
  const fresh = !lastChallenge || avoided.some((m) => m > lastChallenge);
  if (named.length && fresh && avoided.length >= LADDER.CHALLENGE_AVOIDANCE && avoided.length > constrained) {
    const last = avoided.slice(-3);
    const said = [...new Set(last.map((m) => `"${LADDER_REASON_LABEL[reasonOf.get(m)!]}"`))].join(" and ");
    return { ...base, stage: "CHALLENGE",
      text: `${name}: ${last.length} of the misses (${last.map(weekday).join(" · ")}) weren't on low-energy days, and you said ${said}. Two minutes counts. Start smaller today?`,
      why: why(`You agreed with the pattern, and ${LADDER.CHALLENGE_AVOIDANCE} or more misses were "forgot" or "didn't feel like it" on days that weren't low-energy. Never used for shift, tiredness or the plan.`, reasonFacts) };
  }
  // 2. NAME: three misses and two answers. Asked once; RIGHT keeps it, CHANGE THE PLAN and NOT RIGHT quiet it.
  if (misses.length >= LADDER.NAME_MISSES && explained.length >= LADDER.NAME_ANSWERS && !answeredSince("NAME").some((a) => a.answer !== "LATER") && top) {
    const work = misses.filter((m) => missDay.get(m)?.work === "WORK").length;
    const where = work >= 2 && work === misses.length ? ` All ${work} were work days.` : work >= 2 ? ` ${work} were work days.` : "";
    return { ...base, stage: "NAME",
      text: `${name} didn't happen ${misses.length} of the ${due} days you answered it.${where} Your answers point to: ${LADDER_PATTERN[top[0]]}.`,
      why: why(`${LADDER.NAME_MISSES} or more misses in ${LADDER.WINDOW_DAYS} days, with ${LADDER.NAME_ANSWERS} or more of your answers. Named from what you said.`, reasonFacts) };
  }
  // 1. ASK: two misses in 14 days; asks about the latest one he hasn't explained, only if it's recent.
  const recentMisses = misses.filter((m) => within(m, today, LADDER.ASK_WINDOW_DAYS));
  const open = misses.filter((m) => !reasonOf.has(m) && within(m, today, LADDER.ASK_RECENT_DAYS)
    && !mine.some((a) => a.stage === "ASK" && a.missDate === m)).at(-1);
  if (recentMisses.length >= LADDER.ASK_MISSES && open) {
    return { ...base, stage: "ASK", missDate: open,
      text: `${name} didn't happen ${weekday(open)}. What got in the way?`,
      why: why(`${LADDER.ASK_MISSES} or more misses in ${LADDER.ASK_WINDOW_DAYS} days. Asking first, before naming anything.`) };
  }
  return null;
}

/**
 * At most one ladder line a day, across every habit. Nothing on a low-capacity day, nothing once he has answered a
 * ladder line today, nothing for a habit he turned off. When several habits qualify, the one with the most misses.
 */
export function deriveLadderLine(input: {
  habits: readonly LadderHabit[]; answers: readonly LadderAnswer[]; today: string; todayLowCapacity: boolean; off: ReadonlySet<string>;
}): LadderLine | null {
  if (input.todayLowCapacity || input.answers.some((a) => a.date === input.today)) return null;
  const lines = input.habits.filter((h) => !input.off.has(h.id))
    .map((h) => deriveHabitLadder(h, input.answers, input.today)).filter((l): l is LadderLine => l !== null);
  return lines.sort((a, b) => b.misses.length - a.misses.length || a.habitName.localeCompare(b.habitName) || a.habitId.localeCompare(b.habitId))[0] ?? null;
}
