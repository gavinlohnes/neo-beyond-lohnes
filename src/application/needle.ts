import type { DaySummary } from "../engine/dayLedger";
import type { StateCheckIn } from "../domain/common/types";
import { noteTags } from "./noteTags";

/**
 * DELTA-NEXT 6 — "what moves the needle" (Protected: it ranks; approved by Gavin's "All", 2026-11-09). Your
 * weeks are judged only by your own check-ins: a week with at least WEEK_MIN_CHECK_INS check-ins is "good" when
 * its average energy is in the top third of your judged weeks. Each habit (a #tag, or training) is compared as
 * days per week in good weeks against your other weeks, with the number of weeks behind each side. Ranked by the
 * size of the gap — a pattern, never proof or advice. Data first: nothing is said until MIN_JUDGED_WEEKS exist.
 */
export const WEEK_MIN_CHECK_INS = 3;
export const MIN_JUDGED_WEEKS = 9;
export const MIN_GAP_DAYS = 0.5;

export interface NeedleHabit { habit: string; good: number; other: number; goodWeeks: number; otherWeeks: number }
export type Needle = { ready: false; judgedWeeks: number; need: number } | { ready: true; judgedWeeks: number; goodWeeks: number; habits: NeedleHabit[] };

const weekKey = (iso: string) => {
  const d = new Date(iso);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
};

export function whatMovesTheNeedle(summaries: readonly DaySummary[], checkIns: readonly StateCheckIn[], notes: readonly { dayId: string; text: string }[]): Needle {
  const dayWeek = new Map(summaries.map((s) => [s.beyondDayId, weekKey(s.livedDayStart)]));
  const energy = new Map<string, number[]>();
  for (const c of checkIns) { const w = dayWeek.get(c.beyondDayId); if (w) energy.set(w, [...(energy.get(w) ?? []), c.energy]); }
  const judged = [...energy.entries()].filter(([, e]) => e.length >= WEEK_MIN_CHECK_INS).map(([week, e]) => ({ week, avg: e.reduce((a, b) => a + b, 0) / e.length }));
  if (judged.length < MIN_JUDGED_WEEKS) return { ready: false, judgedWeeks: judged.length, need: MIN_JUDGED_WEEKS };
  const sorted = [...judged].sort((a, b) => b.avg - a.avg);
  const good = new Set(sorted.slice(0, Math.max(1, Math.floor(sorted.length / 3))).map((w) => w.week));
  const habitDays = new Map<string, Map<string, number>>(); // habit -> week -> days
  const bump = (habit: string, week: string) => { const m = habitDays.get(habit) ?? new Map(); m.set(week, (m.get(week) ?? 0) + 1); habitDays.set(habit, m); };
  for (const s of summaries) { const w = weekKey(s.livedDayStart); if (s.workouts.length) bump("training", w); }
  for (const n of notes) { const w = dayWeek.get(n.dayId); if (w) for (const t of noteTags(n.text)) bump(`#${t}`, w); }
  const goodWeeks = judged.filter((w) => good.has(w.week)), otherWeeks = judged.filter((w) => !good.has(w.week));
  const habits = [...habitDays.entries()].map(([habit, weeks]) => {
    const per = (list: typeof judged) => list.reduce((n, w) => n + (weeks.get(w.week) ?? 0), 0) / list.length;
    return { habit, good: per(goodWeeks), other: per(otherWeeks), goodWeeks: goodWeeks.length, otherWeeks: otherWeeks.length };
  }).filter((h) => Math.abs(h.good - h.other) >= MIN_GAP_DAYS).sort((a, b) => Math.abs(b.good - b.other) - Math.abs(a.good - a.other));
  return { ready: true, judgedWeeks: judged.length, goodWeeks: goodWeeks.length, habits: habits.slice(0, 5) };
}
