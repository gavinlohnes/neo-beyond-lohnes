/**
 * SYNC-002: SYNC GARMIN remembers when it was tapped, on this phone only. Files the Health Bridge
 * sends back within this window import straight away; any other shared file still opens the preview.
 */
const KEY = "beyond.garminSyncRequestedAt";
/**
 * GARMIN-AUTO-001 (owner go 2026-10-31, "auto sync every few hours"): once the owner has used SYNC
 * GARMIN on this phone, a send the Bridge starts itself (its "Tap to send to BEYOND" notification)
 * imports straight away too. Before that first tap, a share still opens the preview.
 */
const TRUSTED = "beyond.garminBridgeTrusted";
export const SYNC_REQUEST_WINDOW_MS = 15 * 60 * 1000;

export function markGarminSyncRequested(now = Date.now()): void {
  try { localStorage.setItem(KEY, String(now)); localStorage.setItem(TRUSTED, "1"); } catch { /* not remembered: the share opens the preview instead */ }
}

/** True for a tap within the window (used up either way), or once the Bridge is trusted. */
export function takeGarminSyncRequest(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    localStorage.removeItem(KEY);
    return (Number.isFinite(at) && at > 0 && now - at >= 0 && now - at <= SYNC_REQUEST_WINDOW_MS) || localStorage.getItem(TRUSTED) === "1";
  } catch { return false; }
}
