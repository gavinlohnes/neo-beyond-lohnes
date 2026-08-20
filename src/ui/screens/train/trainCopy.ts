import type { ExercisePrescription, SessionType, WorkoutSessionStatus, WorkoutTemplateId } from "../../../domain/workout/types";
import { WORKOUT_TEMPLATE_ORDER } from "../../../domain/workout/types";
import type { SessionVariantSuggestion } from "../../../engine/trainSuggestion";
import { doesSessionAdvanceRotation, deriveRecoverySessionStatus } from "../../../engine/trainSuggestion";

/**
 * Phase 6 (TRAIN redesign): pure copy/derivation helpers, kept separate
 * from TrainScreen so they're unit tested without a DOM. Nothing here
 * changes the locked A/B/C rotation, STANDARD/REDUCED/RECOVERY
 * semantics, or rotation-advancement rules — every function either
 * calls the real locked engine function directly or only rewords an
 * already-computed result.
 */

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/**
 * Presentational-only body-area tagging for each exercise, used purely to
 * build a descriptive summary ("chest, legs, and triceps") instead of
 * leading with a bare template letter — not a domain concept, not stored
 * anywhere, easy to adjust independently of the locked exercise
 * prescriptions themselves (domain/workout/types.ts).
 */
const BODY_AREA_BY_EXERCISE: Record<string, string> = {
  "machine-chest-press": "chest",
  "pec-deck": "chest",
  "leg-press": "legs",
  "triceps-pressdown": "triceps",
  "lat-pulldown": "back",
  "seated-cable-row": "back",
  "leg-curl": "legs",
  "preacher-curl": "biceps",
  "machine-shoulder-press": "shoulders",
  "reverse-pec-deck": "back",
};

export interface TemplateSummary {
  bodyAreas: string;
  exerciseNames: string[];
}

export function describeTemplateSummary(exercises: ExercisePrescription[]): TemplateSummary {
  const areas: string[] = [];
  for (const ex of exercises) {
    const area = BODY_AREA_BY_EXERCISE[ex.exerciseId];
    if (area && !areas.includes(area)) areas.push(area);
  }
  return { bodyAreas: joinWithAnd(areas), exerciseNames: exercises.map((ex) => ex.name) };
}

/** Item 2: plain-language explanation for the suggested variant, same spirit as TODAY's capacity sentence. */
export function describeVariantSuggestion(suggestion: SessionVariantSuggestion): string {
  if (suggestion.noCheckIn) {
    return "There's no check-in yet today, so nothing here is really \"suggested\" — STANDARD is just the default until you check in.";
  }
  if (suggestion.variant === "RESET") {
    return "Capacity is RED, so training itself isn't suggested right now — RESET on TODAY comes first.";
  }
  if (suggestion.variant === "REDUCED") {
    return "Capacity is YELLOW, so a REDUCED session is suggested — the same exercises, fewer sets.";
  }
  return "Capacity is GREEN, so a full STANDARD session is suggested.";
}

/** Item 2: plain-language explanation for the suggested A/B/C template, without presuming false history. */
export function describeTemplateSuggestion(
  suggestedTemplate: WorkoutTemplateId,
  lastAdvancingTemplate: WorkoutTemplateId | null,
): string {
  const order = WORKOUT_TEMPLATE_ORDER.join(" → ");
  if (!lastAdvancingTemplate) {
    return `${suggestedTemplate} is first in your ${order} rotation — nothing has completed yet.`;
  }
  return `${suggestedTemplate} is next in your ${order} rotation, after ${lastAdvancingTemplate}.`;
}

/** Item 6: neutral label for the stop/abandon action — "couldn't start" when nothing was logged, "stop workout" once something was. */
export function describeStopAction(hasLoggedAnySet: boolean): string {
  return hasLoggedAnySet ? "STOP WORKOUT" : "COULDN'T START";
}

export function describeStopConfirm(loggedSetCount: number): string {
  return `${loggedSetCount} logged ${loggedSetCount === 1 ? "set won't" : "sets won't"} count as a completed workout. Stop anyway?`;
}

/**
 * Item 6: whether saving as PARTIAL will advance the rotation, using the
 * real locked rule (doesSessionAdvanceRotation) — never reimplemented,
 * only reworded. STANDARD PARTIAL never advances; REDUCED PARTIAL always
 * does.
 */
export function describePartialAdvancement(sessionType: SessionType): string {
  const advances = doesSessionAdvanceRotation(sessionType, "PARTIAL" as WorkoutSessionStatus);
  if (advances) {
    return "Saving as PARTIAL will still advance your rotation, same as COMPLETED.";
  }
  return "Saving as PARTIAL will NOT advance your rotation — only COMPLETED does for a STANDARD session.";
}

/** Item 7: live preview of how the entered RECOVERY duration will be recorded, using the real locked thresholds. */
export function describeRecoveryPreview(durationMinutes: number): string {
  const status = deriveRecoverySessionStatus(durationMinutes);
  if (status === "COMPLETED") return `At ${durationMinutes} min, this will save as COMPLETED.`;
  if (status === "PARTIAL") return `At ${durationMinutes} min, this will save as PARTIAL.`;
  return "At 0 min, this will save as stopped early (no movement) — recorded as ABANDONED.";
}
