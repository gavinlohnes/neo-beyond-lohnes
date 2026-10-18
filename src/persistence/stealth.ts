/** SUIT-001: screen-privacy state on this phone only. Never an event or backup record. */
const STEALTH_KEY = "beyond:stealth";

export function readStealth(): boolean {
  try {
    return localStorage.getItem(STEALTH_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeStealth(on: boolean): void {
  try {
    if (on) localStorage.setItem(STEALTH_KEY, "on");
    else localStorage.removeItem(STEALTH_KEY);
  } catch {
    // Storage unavailable: stealth still works for this session.
  }
}
