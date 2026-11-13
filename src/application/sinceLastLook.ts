/**
 * OPERATOR-EXPERIENCE-001 slice 3 ("changed since you last looked"; Gavin, 2026-11-13: device-local). TODAY keeps a
 * small snapshot of what it showed (state, NEXT, confirmed changes, the Engine's current advice, Garmin's last night)
 * and, on the next visit, names what is different. Pure: TODAY stores the snapshot on this device only; nothing goes
 * to the database, a backup or Alfred. A field that isn't known yet (null) is never reported as a change.
 */
export interface LookSnapshot {
  at: string;
  state: string | null;
  next: string | null;
  confirmed: number | null;
  /** The Engine's current recommendation on TODAY (id and title); "none" when the day has none. */
  advice: { id: string; title: string } | "none" | null;
  /** Garmin's last main sleep: when it ended and how long, as last synced. */
  garmin: { end: string; minutes: number } | "none" | null;
}

const hm = (n: number) => `${Math.floor(n / 60)}h ${String(Math.round(n % 60)).padStart(2, "0")}m`;

/** What changed between two looks, most decision-relevant first, at most four short items. */
export function diffLook(prev: LookSnapshot | null, cur: LookSnapshot): string[] {
  if (!prev) return [];
  const items: string[] = [];
  if (prev.advice !== null && cur.advice !== null && typeof cur.advice === "object" && (prev.advice === "none" || prev.advice.id !== cur.advice.id)) items.push(`New advice: ${cur.advice.title}`);
  if (prev.state !== null && cur.state !== null && prev.state !== cur.state) items.push(`${prev.state} → ${cur.state}`);
  if (prev.confirmed !== null && cur.confirmed !== null && prev.confirmed !== cur.confirmed) {
    items.push(`Confirmed changes: ${prev.confirmed} → ${cur.confirmed}`);
  } else if (prev.next !== null && cur.next !== null && prev.next !== cur.next) items.push(cur.next);
  if (prev.garmin !== null && cur.garmin !== null && typeof cur.garmin === "object" && (prev.garmin === "none" || prev.garmin.end !== cur.garmin.end)) items.push(`Garmin sleep synced: ${hm(cur.garmin.minutes)}`);
  return items.slice(0, 4);
}

/** Keep what is known: a field unknown now keeps its last known value, so a slow read never erases it. */
export function mergeLook(prev: LookSnapshot | null, cur: LookSnapshot): LookSnapshot {
  if (!prev) return cur;
  return {
    at: cur.at,
    state: cur.state ?? prev.state, next: cur.next ?? prev.next, confirmed: cur.confirmed ?? prev.confirmed,
    advice: cur.advice ?? prev.advice, garmin: cur.garmin ?? prev.garmin,
  };
}

/** The first known value of each field during one visit: the visit's own baseline, so its own actions aren't "changes". */
export function firstKnown(base: LookSnapshot | null, cur: LookSnapshot): LookSnapshot {
  if (!base) return cur;
  return {
    at: base.at,
    state: base.state ?? cur.state, next: base.next ?? cur.next, confirmed: base.confirmed ?? cur.confirmed,
    advice: base.advice ?? cur.advice, garmin: base.garmin ?? cur.garmin,
  };
}

export function sinceLabel(prevAt: string, now: Date): string {
  const t = new Date(prevAt);
  const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  const sameDay = t.toDateString() === now.toDateString();
  return sameDay ? `SINCE ${time}` : `SINCE ${t.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} ${time}`;
}
