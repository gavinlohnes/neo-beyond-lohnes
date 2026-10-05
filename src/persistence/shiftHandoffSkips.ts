/**
 * NOTES-HANDOFF-001: SKIP on "Note for next shift?" writes no event (choosing
 * not to write a note isn't domain history), so which day's prompt was
 * skipped is UI bookkeeping in localStorage, like outcomeDismissals.ts.
 */
const SKIPPED_KEY_PREFIX = "beyond:shiftHandoffSkipped:";

export function isShiftHandoffSkipped(beyondDayId: string): boolean {
  return localStorage.getItem(SKIPPED_KEY_PREFIX + beyondDayId) === "1";
}

export function skipShiftHandoff(beyondDayId: string): void {
  localStorage.setItem(SKIPPED_KEY_PREFIX + beyondDayId, "1");
}
