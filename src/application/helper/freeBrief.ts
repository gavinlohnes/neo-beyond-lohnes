import { getDaySummaries } from "../dayLedgerQueries";
import { getActiveDay, getSchedulePattern } from "../queries";
import { getEffectiveProteinTargetG } from "../nutritionTargetQueries";
import { getWeekTasks } from "../weekAheadQueries";
import { describeShiftRun, shiftRun } from "../shiftRun";
import { formatLocalDate } from "../../engine/scheduledContext";

/**
 * FREE-BRIEF-001 (#373): TODAY's brief from his records, free and offline, for when Alfred isn't
 * writing one (no key, or automatic Alfred off). Facts only, each from a named record; a missing log
 * is said to be missing. No advice, no judgement, no recommendation (the Engine's stays on TODAY).
 */
export async function freeBrief(now = new Date()): Promise<string[]> {
  const day = await getActiveDay();
  if (!day) return [];
  const [summaries, schedule, target, week] = await Promise.all([getDaySummaries(), getSchedulePattern(), getEffectiveProteinTargetG(), getWeekTasks(now)]);
  const today = summaries.find((s) => s.beyondDayId === day.id);
  const lines: string[] = [];
  const run = shiftRun(now, schedule);
  if (run && (day.workContext === "UNKNOWN" || day.workContext === run.kind)) lines.push(`Scheduled: ${describeShiftRun(run)}.`);
  const protein = today?.proteinG, water = today?.waterOz;
  const food = protein !== undefined ? `${Math.round(protein)} g protein${target ? ` of ${Math.round(target)}` : ""}` : "no food logged";
  lines.push(`So far today: ${food}, ${water ? `${Math.round(water)} oz water` : "no water logged"}.`);
  const lastSleep = [...summaries].sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart)).find((s) => s.sleep.primaryMinutes !== undefined);
  if (lastSleep) { const m = lastSleep.sleep.primaryMinutes!; lines.push(`Last main sleep logged: ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m.`); }
  const due = week.find((d) => d.date === formatLocalDate(now));
  const items = due ? [...due.planned, ...due.due].map((o) => o.title) : [];
  if (items.length) lines.push(`On for today: ${[...new Set(items)].slice(0, 3).join(", ")}${items.length > 3 ? ` and ${items.length - 3} more` : ""}.`);
  return lines;
}
