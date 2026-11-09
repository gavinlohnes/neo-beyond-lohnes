import { db } from "../persistence/db";
import type { DaySummary } from "../engine/dayLedger";
import type { StateCheckIn } from "../domain/common/types";
import { getDaySummaries } from "./dayLedgerQueries";
import { noteTags } from "./noteTags";

/**
 * JOURNAL-LEARN-001 (part 2): what each #tag lines up with. For a tag on at least MIN_TAGGED_DAYS recorded
 * days, compare tagged days with untagged days on things BEYOND already records: the main sleep logged the
 * next day, the next day's last check-in energy and mood, and whether a workout was recorded that day.
 * Counts and averages only, each with its number of days; a side with fewer than MIN_SIDE_DAYS values says
 * nothing. It describes; it never claims a cause, scores or advises. Read only.
 */
export const MIN_TAGGED_DAYS = 3;
export const MIN_SIDE_DAYS = 3;

export type MeasureId = "NEXT_SLEEP" | "NEXT_ENERGY" | "NEXT_MOOD" | "TRAINED";
export interface MeasureComparison { id: MeasureId; withTag: { value: number; days: number }; without: { value: number; days: number } }
export interface TagPattern { tag: string; taggedDays: number; comparisons: MeasureComparison[] }
export interface TagPatterns { ready: TagPattern[]; learning: { tag: string; taggedDays: number }[] }

interface DayFacts { dayId: string; tags: string[]; nextSleep?: number; nextEnergy?: number; nextMood?: number; trained: boolean }

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Pure: day facts in, patterns out. */
export function compareTags(days: readonly DayFacts[]): TagPatterns {
  const counts = new Map<string, number>();
  for (const d of days) for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const ready: TagPattern[] = [], learning: TagPatterns["learning"] = [];
  for (const [tag, taggedDays] of [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    if (taggedDays < MIN_TAGGED_DAYS) { learning.push({ tag, taggedDays }); continue; }
    const withTag = days.filter((d) => d.tags.includes(tag)), without = days.filter((d) => !d.tags.includes(tag));
    const comparisons: MeasureComparison[] = [];
    const add = (id: MeasureId, read: (d: DayFacts) => number | undefined) => {
      const a = withTag.flatMap((d) => { const v = read(d); return v === undefined ? [] : [v]; });
      const b = without.flatMap((d) => { const v = read(d); return v === undefined ? [] : [v]; });
      if (a.length >= MIN_SIDE_DAYS && b.length >= MIN_SIDE_DAYS) comparisons.push({ id, withTag: { value: mean(a), days: a.length }, without: { value: mean(b), days: b.length } });
    };
    add("NEXT_SLEEP", (d) => d.nextSleep);
    add("NEXT_ENERGY", (d) => d.nextEnergy);
    add("NEXT_MOOD", (d) => d.nextMood);
    add("TRAINED", (d) => (d.trained ? 1 : 0));
    ready.push({ tag, taggedDays, comparisons });
  }
  return { ready, learning };
}

/** Pure: join notes, day summaries and check-ins into one fact row per recorded day with a note. */
export function dayFacts(notes: readonly { dayId: string; text: string }[], summaries: readonly DaySummary[], checkIns: readonly StateCheckIn[]): DayFacts[] {
  const ordered = [...summaries].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const noteByDay = new Map(notes.map((n) => [n.dayId, n.text]));
  const lastCheckIn = new Map<string, StateCheckIn>();
  for (const c of [...checkIns].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) lastCheckIn.set(c.beyondDayId, c);
  return ordered.flatMap((day, i) => {
    const text = noteByDay.get(day.beyondDayId);
    if (text === undefined) return [];
    const next = ordered[i + 1];
    const checkIn = next ? lastCheckIn.get(next.beyondDayId) : undefined;
    return [{
      dayId: day.beyondDayId,
      tags: noteTags(text),
      ...(next?.sleep.primaryMinutes !== undefined ? { nextSleep: next.sleep.primaryMinutes } : {}),
      ...(checkIn ? { nextEnergy: checkIn.energy, nextMood: checkIn.mood } : {}),
      trained: day.workouts.length > 0,
    }];
  });
}

export async function getTagPatterns(): Promise<TagPatterns> {
  const [notes, summaries, checkIns] = await Promise.all([db.dailyNotes.toArray(), getDaySummaries(), db.checkIns.toArray()]);
  return compareTags(dayFacts(notes, summaries, checkIns));
}
