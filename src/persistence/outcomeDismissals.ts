/**
 * Outcome-rating dismissal (Phase 2, TODAY as daily command surface).
 * Dismissing the "how'd that go?" prompt without rating it was previously
 * plain React state in TodayScreen — lost on every tab switch (TODAY
 * unmounts/remounts) let alone a reload, so a dismissed prompt reappeared
 * almost immediately. Choosing not to answer is operational/UI
 * bookkeeping, not meaningful domain history in its own right (unlike an
 * actual GOOD/NEUTRAL/BAD rating, which is a real OUTCOME_RATED event) —
 * so this is localStorage, matching the same pattern already used for the
 * backup-reminder timestamp in persistence/backup.ts, not a new event type.
 */
const DISMISSED_KEY_PREFIX = "beyond:outcomeDismissed:";

export function isOutcomeDismissed(recommendationId: string): boolean {
  return localStorage.getItem(DISMISSED_KEY_PREFIX + recommendationId) === "1";
}

export function dismissOutcome(recommendationId: string): void {
  localStorage.setItem(DISMISSED_KEY_PREFIX + recommendationId, "1");
}
