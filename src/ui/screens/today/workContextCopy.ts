import type { ScheduledContext, SchedulePhase } from "../../../engine/scheduledContext";

/**
 * Phase 2 (TODAY as daily command surface): plain-language rendering of
 * ScheduledContext for the WORK CONTEXT card. Pure and DOM-free so the
 * wording can be unit tested — this file never writes workContext itself;
 * only application/commands.ts's setWorkContext does that, on explicit
 * confirmation, matching the locked "prediction is not fact" doctrine.
 */

export const PHASE_LABELS: Record<SchedulePhase, string> = {
  PRE_WORK: "before your shift",
  SCHEDULED_SHIFT: "during your scheduled shift",
  EXPECTED_POST_WORK: "just after your shift",
  OFF: "off hours",
};

/**
 * DROP 0 (standing schedule, owner ruling 2026-10-03): how TODAY names a work
 * context that came from the operator's saved schedule rather than a tap.
 */
export const WORKING_PER_SCHEDULE = "Working · per schedule";
export const OFF_PER_SCHEDULE = "Off · per schedule";

/** The one-tap change on a standing day flips to the other value, recorded as MANUAL. */
export function describeStandingChange(current: "WORK" | "OFF"): string {
  return current === "WORK" ? "CHANGE TO OFF" : "CHANGE TO WORKING";
}

export function describeSchedulePrediction(ctx: ScheduledContext): string {
  const dayKind = ctx.todayIsScheduledWorkDay ? "a work day" : "a day off";
  return `Your schedule (Week ${ctx.week}) predicts ${dayKind} today — right now looks like ${PHASE_LABELS[ctx.phase]}. This is a prediction, not a fact, until you confirm.`;
}

/**
 * Soak fix (2026-10-04): the WORK SCHEDULE screen's preview. Since DROP 0 a
 * saved schedule IS the day's starting declaration ("per schedule"), so the
 * screen that saves it says so; TODAY's unconfirmed-day card keeps the
 * prediction wording above, which stays true there.
 */
export function describeSchedulePreview(ctx: ScheduledContext): string {
  const dayKind = ctx.todayIsScheduledWorkDay ? "a work day" : "a day off";
  return `With this schedule (Week ${ctx.week}), today is ${dayKind} — right now looks like ${PHASE_LABELS[ctx.phase]}. Saved, each day starts from it ("per schedule"); one tap on TODAY changes a day.`;
}

/**
 * Priority 3 (Daily Intelligence follow-on): the one-line "where am I in
 * the day" context on TODAY's primary command card. Deliberately a single
 * clause appended to the existing workContext summary, not a new card —
 * "do not create a dashboard wall." Confirmed workContext (WORK/OFF) is a
 * FACT and is stated plainly; an unconfirmed day states the schedule's
 * phase prediction explicitly labeled as a prediction, preserving
 * PREDICTION IS NOT FACT even in the compressed one-line form. An
 * unresolved post-shift fact is the most specific, most decision-relevant
 * thing BEYOND knows about right now, so it preempts the generic phase
 * label — but only while it's actually unresolved. A WORK_PERIOD_ENDED
 * fact that a later SHIFT_DOWN_COMPLETED has already cleared (same rule
 * application/queries.ts's hasUnresolvedPostShift uses) must not keep
 * showing "not yet shifted down" forever just because work ended at some
 * point today.
 */
/**
 * Soak fix (2026-10-04): on a work day the phase comes from the lived day's
 * Shift Clock when TODAY has it. At 15:00 after a night shift the wall-clock
 * schedule already sees the NEXT shift ("before your shift") while the
 * lived day is still the one that just ended.
 */
const SHIFT_CLOCK_PHASE_LABELS: Record<"PRE_WORK" | "SCHEDULED_SHIFT" | "EXPECTED_POST_WORK" | "OFF", string> = {
  PRE_WORK: "before your shift",
  SCHEDULED_SHIFT: "during your scheduled shift",
  EXPECTED_POST_WORK: "after your shift",
  OFF: "after sleep",
};

export function describeContextStrip(
  workContext: "WORK" | "OFF" | "UNKNOWN",
  scheduledContext: ScheduledContext | null,
  hasUnresolvedPostShift: boolean,
  perSchedule = false,
  shiftClockPhase?: keyof typeof SHIFT_CLOCK_PHASE_LABELS | null,
): string {
  if (workContext === "WORK") {
    const working = perSchedule ? WORKING_PER_SCHEDULE : "Working today";
    if (hasUnresolvedPostShift) return `${working} — shift ended, not yet shifted down`;
    if (shiftClockPhase) return `${working} — ${SHIFT_CLOCK_PHASE_LABELS[shiftClockPhase]}`;
    if (scheduledContext) return `${working} — ${PHASE_LABELS[scheduledContext.phase]}`;
    return working;
  }
  if (workContext === "OFF") return perSchedule ? OFF_PER_SCHEDULE : "Off today";
  if (!scheduledContext) return "Context not set yet";
  const predicted = scheduledContext.todayIsScheduledWorkDay ? "a work day" : "a day off";
  return `Not confirmed yet — schedule predicts ${predicted} (${PHASE_LABELS[scheduledContext.phase]})`;
}

/**
 * Bug fix: TodayScreen's YES/NO buttons both used to log
 * "SCHEDULE_SUGGESTION_ACCEPTED" unconditionally, even when the tapped
 * answer contradicted the schedule's own prediction — history claimed the
 * user accepted a suggestion they'd actually just overridden. The source
 * recorded now reflects what actually happened: SCHEDULE_SUGGESTION_ACCEPTED
 * only when the chosen value matches the prediction that was on screen,
 * MANUAL when the user's answer corrects it. Reuses the existing
 * WorkContextSetPayload.source union (domain/common/types.ts) as-is — no
 * new event type or field, since that union already models exactly this
 * distinction; setWorkContext itself, and the "prediction never writes a
 * fact" invariant, are both unchanged.
 */
export function resolveWorkContextSource(
  predictedWorkDay: boolean,
  chosen: "WORK" | "OFF",
): "MANUAL" | "SCHEDULE_SUGGESTION_ACCEPTED" {
  const predicted: "WORK" | "OFF" = predictedWorkDay ? "WORK" : "OFF";
  return chosen === predicted ? "SCHEDULE_SUGGESTION_ACCEPTED" : "MANUAL";
}
