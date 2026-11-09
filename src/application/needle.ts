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
/** For tags: a gap of at least this share of noted days (15 percentage points). */
export const MIN_GAP_SHARE = 0.15;

/**
 * Training is days per week over all judged weeks. A #tag is the share of *noted* days that carried it, over the
 * judged weeks that have notes — a week with no notes is unknown for tags, never zero.
 */
export interface NeedleHabit { habit: string; unit: "DAYS_PER_WEEK" | "SHARE_OF_NOTED_DAYS"; good: number; other: number; goodWeeks: number; otherWeeks: number }
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
  const goodWeeks = judged.filter((w) => good.has(w.week)), otherWeeks = judged.filter((w) => !good.has(w.week));
  const habits: NeedleHabit[] = [];

  const trainingDays = new Map<string, number>();
  for (const s of summaries) if (s.workouts.length) { const w = weekKey(s.livedDayStart); trainingDays.set(w, (trainingDays.get(w) ?? 0) + 1); }
  if (trainingDays.size) {
    const per = (list: typeof judged) => list.reduce((n, w) => n + (trainingDays.get(w.week) ?? 0), 0) / list.length;
    const h = { habit: "training", unit: "DAYS_PER_WEEK" as const, good: per(goodWeeks), other: per(otherWeeks), goodWeeks: goodWeeks.length, otherWeeks: otherWeeks.length };
    if (Math.abs(h.good - h.other) >= MIN_GAP_DAYS) habits.push(h);
  }

  const notedDays = new Map<string, number>(), tagDays = new Map<string, Map<string, number>>();
  for (const n of notes) {
    const w = dayWeek.get(n.dayId); if (!w) continue;
    notedDays.set(w, (notedDays.get(w) ?? 0) + 1);
    for (const t of noteTags(n.text)) { const m = tagDays.get(t) ?? new Map<string, number>(); m.set(w, (m.get(w) ?? 0) + 1); tagDays.set(t, m); }
  }
  const noted = (list: typeof judged) => list.filter((w) => (notedDays.get(w.week) ?? 0) > 0);
  const goodNoted = noted(goodWeeks), otherNoted = noted(otherWeeks);
  // A tag ranks only when both sides rest on at least 3 weeks with notes (the 3-day floor used elsewhere).
  if (goodNoted.length >= 3 && otherNoted.length >= 3) for (const [tag, weeks] of tagDays) {
    const share = (list: typeof judged) => list.reduce((n, w) => n + (weeks.get(w.week) ?? 0), 0) / list.reduce((n, w) => n + notedDays.get(w.week)!, 0);
    const h = { habit: `#${tag}`, unit: "SHARE_OF_NOTED_DAYS" as const, good: share(goodNoted), other: share(otherNoted), goodWeeks: goodNoted.length, otherWeeks: otherNoted.length };
    if (Math.abs(h.good - h.other) >= MIN_GAP_SHARE) habits.push(h);
  }
  const size = (h: NeedleHabit) => Math.abs(h.good - h.other) / (h.unit === "DAYS_PER_WEEK" ? 7 : 1);
  habits.sort((a, b) => size(b) - size(a));
  return { ready: true, judgedWeeks: judged.length, goodWeeks: goodWeeks.length, habits: habits.slice(0, 5) };
}
