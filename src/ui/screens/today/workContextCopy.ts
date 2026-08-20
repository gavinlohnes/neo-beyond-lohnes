import type { ScheduledContext, SchedulePhase } from "../../../engine/scheduledContext";

/**
 * Phase 2 (TODAY as daily command surface): plain-language rendering of
 * ScheduledContext for the WORK CONTEXT card. Pure and DOM-free so the
 * wording can be unit tested — this file never writes workContext itself;
 * only application/commands.ts's setWorkContext does that, on explicit
 * confirmation, matching the locked "prediction is not fact" doctrine.
 */

const PHASE_LABELS: Record<SchedulePhase, string> = {
  PRE_WORK: "before your shift",
  SCHEDULED_SHIFT: "during your scheduled shift",
  EXPECTED_POST_WORK: "just after your shift",
  OFF: "off hours",
};

export function describeSchedulePrediction(ctx: ScheduledContext): string {
  const dayKind = ctx.todayIsScheduledWorkDay ? "a work day" : "a day off";
  return `Your schedule (Week ${ctx.week}) predicts ${dayKind} today — right now looks like ${PHASE_LABELS[ctx.phase]}. This is a prediction, not a fact, until you confirm.`;
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
