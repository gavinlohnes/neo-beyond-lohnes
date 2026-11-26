/**
 * GRAYSON-FITS-NOW-001: Fits now on or off (default on), set in MORE · Nutrition targets. A UI preference in
 * localStorage like whatMovesPreference.ts: no event, no schema change. It travels in the backup's settings block
 * (settingsTransfer.ts). Never throws; anything unreadable reads as on.
 */
export const FITS_NOW_KEY = "beyond.fitsNow.v1";

export function readFitsNowOn(): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(FITS_NOW_KEY) ?? "null") as unknown;
    return !(raw && typeof raw === "object" && (raw as { on?: unknown }).on === false);
  } catch {
    return true;
  }
}

export function writeFitsNowOn(on: boolean): void {
  try { localStorage.setItem(FITS_NOW_KEY, JSON.stringify({ on })); } catch { /* storage blocked: the default stays */ }
}
