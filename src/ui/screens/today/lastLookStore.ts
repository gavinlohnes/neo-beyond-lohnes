import type { LookSnapshot } from "../../../application/sinceLastLook";

/**
 * OPERATOR-EXPERIENCE-001 slice 3: TODAY's last look, kept on this device only (Gavin, 2026-11-13). A per-device
 * convenience, not a record: it isn't in the database or a backup, and losing it only means the next visit shows no
 * "since" line.
 */
const KEY = "beyond.today.lastLook.v1";

export function readLastLook(): LookSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LookSnapshot>;
    return typeof v.at === "string" && !Number.isNaN(Date.parse(v.at)) ? {
      at: v.at, state: v.state ?? null, next: v.next ?? null, confirmed: typeof v.confirmed === "number" ? v.confirmed : null,
      advice: v.advice ?? null, garmin: v.garmin ?? null,
      marks: Array.isArray(v.marks) && v.marks.every((k) => typeof k === "string") ? v.marks : null,
    } : null;
  } catch { return null; }
}

export function writeLastLook(look: LookSnapshot): void {
  try { localStorage.setItem(KEY, JSON.stringify(look)); } catch { /* not remembered; the next visit shows no "since" line */ }
}
