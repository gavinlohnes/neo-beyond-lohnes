/**
 * SLEEP DRAFT (2026-10-03): when BEYOND was last brought to the foreground —
 * the "opened at" end of the sleep draft's bracket. Set when the app loads
 * and again whenever it becomes visible after being hidden. Kept in memory
 * only; nothing is stored.
 */
let openedAt = new Date();

export function getAppOpenedAt(): Date {
  return openedAt;
}

/** Marks the app as opened now (or at `at`, for tests). */
export function markAppOpened(at: Date = new Date()): void {
  openedAt = at;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") markAppOpened();
  });
}
