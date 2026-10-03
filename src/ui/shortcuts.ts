/**
 * Drop 7 (home-screen shortcuts, owner approval 2026-10-01): the manifest's
 * Android long-press shortcuts open `?go=<target>`. Each one only opens the
 * right control on BODY — nothing is logged until the owner taps it there.
 */
export const SHORTCUT_TARGETS = ["water", "weight", "meal", "urge"] as const;
export type ShortcutTarget = (typeof SHORTCUT_TARGETS)[number];

export function parseShortcut(search: string): ShortcutTarget | null {
  const go = new URLSearchParams(search).get("go");
  return (SHORTCUT_TARGETS as readonly string[]).includes(go ?? "") ? (go as ShortcutTarget) : null;
}

/**
 * Where BODY can be opened to: the home-screen shortcuts, plus "sleep",
 * which only TODAY's Shift Clock uses (its MAIN SLEEP row, Drop 2) — it is
 * deliberately not a ?go= shortcut, so the manifest is unchanged.
 */
export type BodyFocus = ShortcutTarget | "sleep";

/** Element id BODY gives each destination, so it can be scrolled into view. */
export const SHORTCUT_ANCHOR_IDS: Record<BodyFocus, string> = {
  water: "body-hydration",
  weight: "body-bodyweight",
  meal: "body-meal-memory",
  urge: "body-quit",
  sleep: "body-sleep",
};
