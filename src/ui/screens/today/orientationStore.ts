/**
 * GRAYSON C1.1: whether this lived day's Orientation was reviewed or set aside, kept on this device only, like
 * TODAY's last look. A convenience, not a record: it isn't in the database or a backup, and losing it only means
 * TODAY offers ORIENT TODAY once more.
 */
const KEY = "beyond.orientation.v1";

export function orientationSeen(dayId: string): boolean {
  try { return localStorage.getItem(KEY) === dayId; } catch { return false; }
}

export function markOrientationSeen(dayId: string): void {
  try { localStorage.setItem(KEY, dayId); } catch { /* not remembered; TODAY offers it once more */ }
}
