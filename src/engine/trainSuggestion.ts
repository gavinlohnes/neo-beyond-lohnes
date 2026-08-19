import type { Capacity } from "../domain/common/types";
import type { SessionType, WorkoutSessionStatus, WorkoutTemplateId } from "../domain/workout/types";
import { WORKOUT_TEMPLATE_ORDER } from "../domain/workout/types";

/**
 * Engine-suggested, user-overridable variant selection (TRAIN Design
 * Decisions, 2026-08-19): RED capacity points away from training toward
 * RESET; YELLOW suggests REDUCED; GREEN suggests STANDARD; no check-in
 * yet also suggests STANDARD but flags that nothing has been checked in.
 */
export interface SessionVariantSuggestion {
  variant: "RESET" | "REDUCED" | "STANDARD";
  reason: string;
  noCheckIn: boolean;
}

export function suggestSessionVariant(capacity: Capacity | null): SessionVariantSuggestion {
  if (capacity === null) {
    return { variant: "STANDARD", reason: "No check-in yet today.", noCheckIn: true };
  }
  if (capacity === "RED") {
    return {
      variant: "RESET",
      reason: "RED capacity — RESET is suggested instead of training.",
      noCheckIn: false,
    };
  }
  if (capacity === "YELLOW") {
    return { variant: "REDUCED", reason: "YELLOW capacity.", noCheckIn: false };
  }
  return { variant: "STANDARD", reason: "GREEN capacity.", noCheckIn: false };
}

/**
 * Workout selection (A/B/C) is Engine-suggested, user-overridable: the
 * last COMPLETED (rotation-advancing) session determines the next
 * A -> B -> C -> A suggestion. Pure function — the caller looks up the
 * last rotation-advancing session's templateId via a query and passes it
 * in; engine/ stays free of persistence access.
 */
export function suggestNextTemplate(lastAdvancingTemplateId: WorkoutTemplateId | null): WorkoutTemplateId {
  if (!lastAdvancingTemplateId) return "A";
  const idx = WORKOUT_TEMPLATE_ORDER.indexOf(lastAdvancingTemplateId);
  return WORKOUT_TEMPLATE_ORDER[(idx + 1) % WORKOUT_TEMPLATE_ORDER.length]!;
}

/**
 * RECOVERY completion tiers, duration only (Canonical Spec TRAIN):
 * >=10 min COMPLETED, 1-9 min PARTIAL, explicit zero-movement end
 * ABANDONED.
 */
export function deriveRecoverySessionStatus(
  durationMinutes: number,
): "COMPLETED" | "PARTIAL" | "ABANDONED" {
  if (durationMinutes >= 10) return "COMPLETED";
  if (durationMinutes >= 1) return "PARTIAL";
  return "ABANDONED";
}

/**
 * Rotation advancement rule (Decision Register + 2026-08-19
 * reconciliation): STANDARD only advances on COMPLETED. REDUCED advances
 * on COMPLETED or PARTIAL. RECOVERY never advances rotation, regardless
 * of status. ABANDONED never advances rotation for any session type.
 */
export function doesSessionAdvanceRotation(
  sessionType: SessionType,
  status: WorkoutSessionStatus,
): boolean {
  if (sessionType === "RECOVERY") return false;
  if (sessionType === "STANDARD") return status === "COMPLETED";
  if (sessionType === "REDUCED") return status === "COMPLETED" || status === "PARTIAL";
  return false;
}
