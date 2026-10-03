import type { BurdenSummary } from "../../../engine/dayLedger";

/**
 * Burden Meter (Drop 1, owner brief 2026-10-03): one neutral, read-only line
 * — how much BEYOND asked for this week. Facts only: no score, no target, no
 * judgement. Entries are averaged per day and rounded to whole entries;
 * corrections are the week's total, so a single correction never rounds away.
 */
export function describeBurdenLine(burden: BurdenSummary): string {
  if (burden.entriesPerDay === undefined) return "Not enough data yet — no days this week.";
  const entries = Math.round(burden.entriesPerDay);
  return `Entries per day: ${entries} · corrections this week: ${burden.corrections}`;
}
