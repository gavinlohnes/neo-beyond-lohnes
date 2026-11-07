import { db } from "../persistence/db";

/**
 * RESURFACE-001 (APPS-PICKS-002 pick 10, after Readwise's daily review): one thing you kept, brought back
 * each day — a saved highlight, or a daily note at least a week old. The same pick all day, a new one
 * tomorrow. Read-only; nothing is scored, scheduled or marked as seen.
 */
export type Resurfaced =
  | { kind: "HIGHLIGHT"; id: string; text: string; source: string; at: string }
  | { kind: "DAY"; id: string; text: string; source: string; at: string };

const localDate = (at: Date) => `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
/** A small stable hash, so a date always picks the same item from the same list. */
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export async function getResurfaced(now = new Date()): Promise<Resurfaced | null> {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [highlights, notes, days] = await Promise.all([db.highlights.toArray(), db.dailyNotes.toArray(), db.beyondDays.toArray()]);
  const started = new Map(days.map((day) => [day.id, day.startedAt]));
  const pool: Resurfaced[] = [
    ...highlights.filter((h) => h.text.trim()).map((h) => ({ kind: "HIGHLIGHT" as const, id: h.id, text: h.text.trim(), source: h.sourceTitle, at: h.createdAt })),
    ...notes.filter((n) => n.text.trim() && n.updatedAt < weekAgo).map((n) => ({ kind: "DAY" as const, id: n.dayId, text: n.text.trim(), source: "Your daily note", at: started.get(n.dayId) ?? n.createdAt })),
  ].sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
  return pool.length ? pool[hash(localDate(now)) % pool.length]! : null;
}
