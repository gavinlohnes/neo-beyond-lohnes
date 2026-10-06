/**
 * FEEL-001 (owner brief 2026-10-05): one short tap on the moments that
 * change state — a logged set, a hold-to-confirm completing. Doctrine:
 * "Haptics confirm meaningful state change, not screen touch", so this is
 * never called for navigation or a plain press, and never for the PR tag
 * (PR-CARDS-001: no vibration). Where the Vibration API doesn't exist
 * (iPhone Safari), nothing happens and nothing is shown.
 */
export type HapticMeaning = "SET_LOGGED" | "CONFIRMED";

const PATTERNS: Record<HapticMeaning, number | number[]> = {
  SET_LOGGED: 15,
  CONFIRMED: 30,
};

export function haptic(meaning: HapticMeaning): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[meaning]);
  } catch {
    // A refused vibration is never an error the operator needs to see.
  }
}
