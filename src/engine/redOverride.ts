import type { Capacity } from "../domain/common/types";

/**
 * Shared RED-capacity override-confirmation rule (Context & Safety
 * Decisions, 2026-08-19): "RED-capacity override requires an explicit
 * confirm step EVERY TIME, one shared mechanism app-wide." This is the
 * single source of truth for "does this action need that confirmation" —
 * callers must not duplicate the RED check themselves.
 */
export function requiresRedOverrideConfirm(capacity: Capacity | null): boolean {
  return capacity === "RED";
}

/**
 * Enforcement point for the confirm-every-time rule, meant to be called by
 * any command representing an override past RED-capacity guidance (e.g.
 * TRAIN's startWorkout choosing STANDARD instead of the RED-appropriate
 * RESET). Throws if the action would override RED guidance without having
 * been explicitly confirmed. Never persists a "don't ask again" state —
 * every call must pass its own `confirmed` flag, so there is no way to
 * bypass this once and have it stick.
 */
export function assertRedOverrideConfirmed(capacity: Capacity | null, confirmed: boolean): void {
  if (requiresRedOverrideConfirm(capacity) && !confirmed) {
    throw new Error(
      "RED_OVERRIDE_NOT_CONFIRMED: capacity is RED; this action requires explicit override confirmation.",
    );
  }
}
