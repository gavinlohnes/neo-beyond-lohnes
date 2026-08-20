import type { DomainEvent } from "../../../domain/common/types";

/**
 * Priority 1 (HISTORY screen): one-line, human-readable summary per
 * event type — purely presentational, reads the exact payload shapes
 * already confirmed in domain/common/types.ts. Never interprets or
 * changes anything; falls back to the raw type name for anything
 * unmapped so a future event type shows up as unpolished text rather
 * than silently vanishing from history.
 */
export function describeEvent(event: DomainEvent): string {
  const p = event.payload as Record<string, unknown>;
  switch (event.type) {
    case "DAY_STARTED":
      return "Day started.";
    case "DAY_ENDED":
      return `Day ended (${p.reason === "AUTO_CLOSED_ON_NEW_DAY_START" ? "auto-closed" : "explicit"}).`;
    case "SLEEP_LOGGED":
      return `Sleep logged: ${p.durationMinutes} min (${p.kind === "SUPPLEMENTAL" ? "nap" : "main sleep"}).`;
    case "SLEEP_LOG_CORRECTED":
      return `Sleep corrected to ${p.durationMinutes} min.`;
    case "BODYWEIGHT_LOGGED":
      return `Bodyweight logged: ${p.weightLbs} lbs.`;
    case "BODYWEIGHT_LOG_CORRECTED":
      return `Bodyweight corrected to ${p.weightLbs} lbs.`;
    case "PROTEIN_LOGGED":
      return `Protein logged: ${p.grams} g.`;
    case "PROTEIN_LOG_CORRECTED":
      return `Protein corrected to ${p.grams} g.`;
    case "WATER_LOGGED":
      return `Water logged: ${p.amountOz} oz.`;
    case "WATER_LOG_CORRECTED":
      return `Water corrected to ${p.amountOz} oz.`;
    case "OUTCOME_RATED":
      return `Outcome rated: ${p.rating}.`;
    case "WORK_CONTEXT_SET":
      return `Work context set to ${p.workContext} (${p.source === "MANUAL" ? "manual" : "accepted schedule suggestion"}).`;
    case "MINIMUM_DAY_ENABLED":
      return "Minimum Day enabled.";
    case "MEDS_COMPLETED":
      return "Meds marked done.";
    case "HYGIENE_COMPLETED":
      return "Hygiene marked done.";
    case "MOVE_COMPLETED":
      return "Move marked done.";
    case "RECOVER_CONNECT_COMPLETED":
      return p.activity ? `${p.activity === "RECOVER" ? "Recover" : "Connect"} marked done.` : "Recover/Connect marked done.";
    case "STATE_CHECKED_IN":
      return `Check-in: energy ${p.energy}, stress ${p.stress}, mood ${p.mood}, soreness ${p.soreness}, urge ${p.alcoholUrge}.`;
    case "RECOMMENDATION_ISSUED":
      return `Recommendation issued: ${p.kind}.`;
    case "RECOMMENDATION_ACCEPTED":
      return `Recommendation accepted: ${p.kind}.`;
    case "RECOMMENDATION_DECLINED":
      return `Recommendation declined: ${p.kind}.`;
    case "NO_ACTION_RECORDED":
      return "No action recorded.";
    case "RESET_STARTED":
      return `RESET started at intensity ${p.intensity}.`;
    case "RESET_COMPLETED":
      return "RESET completed.";
    case "RESET_CANCELLED":
      return "RESET cancelled.";
    case "SHIFT_DOWN_STARTED":
      return `SHIFT DOWN started: ${p.durationMinutes} min.`;
    case "SHIFT_DOWN_COMPLETED":
      return "SHIFT DOWN completed.";
    case "SHIFT_DOWN_CANCELLED":
      return "SHIFT DOWN cancelled.";
    case "WORKOUT_STARTED":
      return `Workout started: ${p.templateId ?? "Recovery"} ${p.sessionType}.`;
    case "WORKOUT_COMPLETED":
      return `Workout ${p.status}: ${p.sessionType}${p.durationMinutes !== undefined ? ` (${p.durationMinutes} min)` : ""}.`;
    case "WORKOUT_ABANDONED":
      return `Workout stopped: ${p.sessionType}${p.durationMinutes !== undefined ? ` (${p.durationMinutes} min)` : ""}.`;
    case "SET_LOGGED":
      return `Set logged: ${p.exerciseId}${p.substitutedName ? ` (as ${p.substitutedName})` : ""} #${p.setNumber} — ${p.weight} lb x ${p.reps}.`;
    case "SET_SKIPPED":
      return `Set skipped: ${p.exerciseId} #${p.setNumber}.`;
    default:
      return event.type;
  }
}
