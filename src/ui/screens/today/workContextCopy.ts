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
