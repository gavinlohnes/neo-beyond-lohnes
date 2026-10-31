/**
 * SYNC-002: SYNC GARMIN remembers when it was tapped, on this phone only. Files the Health Bridge
 * sends back within this window import straight away; any other shared file still opens the preview.
 */
const KEY = "beyond.garminSyncRequestedAt";
export const SYNC_REQUEST_WINDOW_MS = 15 * 60 * 1000;

export function markGarminSyncRequested(now = Date.now()): void {
  try { localStorage.setItem(KEY, String(now)); } catch { /* not remembered: the share opens the preview instead */ }
}

/** True once, for a tap within the window; the request is used up either way. */
export function takeGarminSyncRequest(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    localStorage.removeItem(KEY);
    return Number.isFinite(at) && at > 0 && now - at >= 0 && now - at <= SYNC_REQUEST_WINDOW_MS;
  } catch { return false; }
}
