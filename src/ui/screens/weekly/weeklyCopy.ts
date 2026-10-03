import type { BurdenSummary } from "../../../engine/dayLedger";
import type { RibbonDay } from "../../../engine/ribbon";

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

// ---- THE RIBBON (2026-10-03) ----

/** "Thu Oct 1" — the calendar date a lived day starts on (its 16:30). */
export function describeRibbonDate(livedDayStart: string): string {
  return new Date(livedDayStart).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function hoursAndMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/**
 * One tapped day, in words: only what was logged, nothing guessed.
 * "Thu Oct 1 · worked · slept 7 hr 15 min · lift B, 1 PR · protein 182 g · 2 urges · clean day"
 */
export function describeRibbonDay(day: RibbonDay, templateLabels: Record<string, string>): string {
  const parts: string[] = [describeRibbonDate(day.livedDayStart)];
  if (!day.hasRecord) return `${parts[0]} · nothing logged`;
  parts.push(day.worked ? "worked" : "not working");
  if (day.mainSleepMinutes !== undefined) parts.push(`slept ${hoursAndMinutes(day.mainSleepMinutes)}`);
  if (day.lift) {
    const label = templateLabels[day.lift.templateId] ?? day.lift.templateId;
    const partial = day.lift.status === "PARTIAL" ? " (partial)" : "";
    const prs = day.lift.prCount > 0 ? `, ${day.lift.prCount} ${day.lift.prCount === 1 ? "PR" : "PRs"}` : "";
    parts.push(`lift ${label}${partial}${prs}`);
  }
  if (day.proteinG !== undefined) parts.push(`protein ${Math.round(day.proteinG)} g`);
  if (day.urges > 0) parts.push(`${day.urges} ${day.urges === 1 ? "urge" : "urges"}`);
  if (day.cleanDay) parts.push("clean day");
  return parts.join(" · ");
}

/** The whole strip in one sentence, for screen readers and the image's label. */
export function describeRibbonSummary(days: readonly RibbonDay[]): string {
  const count = (pred: (d: RibbonDay) => boolean) => days.filter(pred).length;
  const lifts = days.filter((d) => d.lift);
  const prs = lifts.reduce((n, d) => n + (d.lift?.prCount ?? 0), 0);
  const urges = days.reduce((n, d) => n + d.urges, 0);
  return [
    `Last ${days.length} days`,
    `${count((d) => d.worked)} worked`,
    `main sleep logged on ${count((d) => d.mainSleepMinutes !== undefined)}`,
    `${lifts.length} ${lifts.length === 1 ? "workout" : "workouts"}${prs > 0 ? ` (${prs} ${prs === 1 ? "PR" : "PRs"})` : ""}`,
    `protein logged on ${count((d) => d.proteinG !== undefined)}`,
    `${urges} ${urges === 1 ? "urge" : "urges"}`,
    `${count((d) => d.cleanDay)} clean ${count((d) => d.cleanDay) === 1 ? "day" : "days"}`,
  ].join(", ") + ".";
}
