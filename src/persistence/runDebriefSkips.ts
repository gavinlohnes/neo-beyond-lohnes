/**
 * GRAYSON-RUN-DEBRIEF-001: NOT NOW on "How did the run go?" writes no record (choosing not to answer isn't domain
 * history), so which run was skipped is UI bookkeeping in localStorage, like shiftHandoffSkips.ts. Keyed by the run's
 * last work day, so the next run asks again.
 */
const SKIPPED_KEY_PREFIX = "beyond:runDebriefSkipped:";

export function isRunDebriefSkipped(runEnd: string): boolean {
  return localStorage.getItem(SKIPPED_KEY_PREFIX + runEnd) === "1";
}

export function skipRunDebrief(runEnd: string): void {
  localStorage.setItem(SKIPPED_KEY_PREFIX + runEnd, "1");
}
