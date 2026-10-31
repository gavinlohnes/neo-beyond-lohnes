import { getDaySummaries } from "../dayLedgerQueries";
import { getFoodDiary } from "../foodDiaryQueries";
import { getSavedMeals } from "../nutritionQueries";
import { getUnresolvedObligations } from "../intentQueries";
import { getAllCaptureItems } from "../queries";
import { getMemories } from "./alfredMemory";
import { getSleepDebt, SLEEP_NEED_MINUTES } from "../monthQueries";
import { getActiveDay, getLatestCheckIn, getMostRecentBodyweight, getSchedulePattern, getWorkPeriodEnded, getWorkPeriodStarted } from "../queries";
import { getWeekAhead } from "../weekAheadQueries";
import { getMeasuredSnapshot } from "../measuredQueries";
import { getNutritionTargets } from "../nutritionTargetQueries";
import { getQuitSummary } from "../quitQueries";
import { livedDayShiftWindow } from "../../engine/scheduledContext";
import { sleepMinutes } from "../../domain/health/measuredSeries";

/**
 * ALFRED-001 (owner ruling RULES-2026-10-31): what Alfred knows before he answers — a compact, plain
 * text picture of the operator's records, read from BEYOND's own queries. Read only. Every line is
 * a record or a direct count of records, so Alfred can cite it; nothing here is inferred.
 */
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h${String(Math.round(minutes % 60)).padStart(2, "0")}`;

type DaySummary = Awaited<ReturnType<typeof getDaySummaries>>[number];
/** One lived day as a line Alfred can cite (shared with ALFRED-004's get_days). */
export function dayLine(s: DaySummary): string {
  const sets = s.workouts.reduce((n, w) => n + (w.setsLogged ?? 0), 0);
  return `- ${day(s.livedDayStart)}: ${s.work.declared}${s.work.declared !== s.work.scheduled ? ` (scheduled ${s.work.scheduled})` : ""}; sleep ${s.sleep.primaryMinutes !== undefined ? hm(s.sleep.primaryMinutes) : "-"}${s.sleep.napMinutes ? ` + nap ${hm(s.sleep.napMinutes)}` : ""}; protein ${s.proteinG !== undefined ? Math.round(s.proteinG) + " g" : "-"}; kcal ${s.kcal !== undefined ? Math.round(s.kcal) : "-"}; water ${s.waterOz !== undefined ? Math.round(s.waterOz) + " oz" : "-"}; check-in ${s.checkIn?.capacity ?? "-"}; workouts ${s.workouts.length ? `${s.workouts.length} (${sets} sets)` : "-"}; urges ${s.urges.length}; clean day ${s.cleanDay ? "yes" : "-"}.`;
}

export async function buildAlfredContext(now = new Date()): Promise<string> {
  let unavailable = false;
  async function safe<T>(read: () => Promise<T>): Promise<T | null> {
    try { return await read(); } catch { unavailable = true; return null; }
  }
  const [active, summaries, meals, tasks, notes, weekAhead, measured, targets, weight, pattern] = await Promise.all([
    safe(getActiveDay), safe(getDaySummaries), safe(() => getSavedMeals()), safe(getUnresolvedObligations),
    safe(getAllCaptureItems), safe(() => getWeekAhead(now)), safe(() => getMeasuredSnapshot(now.getTime())),
    safe(getNutritionTargets), safe(getMostRecentBodyweight), safe(getSchedulePattern),
  ]);
  const lines: string[] = [];
  lines.push(`NOW: ${now.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })} ${hhmm(now)} (local time).`);

  if (active) {
    const shift = pattern ? livedDayShiftWindow(new Date(active.startedAt), pattern) : null;
    lines.push(`TODAY (lived day from ${day(active.startedAt)} ${hhmm(new Date(active.startedAt))}): work context ${active.workContext ?? "not set"}${shift ? `; scheduled shift ${day(shift.start.toISOString())} ${hhmm(shift.start)} → ${hhmm(shift.end)}` : "; no shift scheduled"}.`);
    const [started, ended, checkIn] = await Promise.all([safe(() => getWorkPeriodStarted(active.id)), safe(() => getWorkPeriodEnded(active.id)), safe(() => getLatestCheckIn(active.id))]);
    lines.push(`WORK TODAY: started ${started ? hhmm(new Date(started.occurredAt)) : "not recorded"}; ended ${ended ? hhmm(new Date(ended.occurredAt)) : "not recorded"}. CHECK-IN TODAY: ${checkIn ? `${hhmm(new Date(checkIn.recordedAt))} energy ${checkIn.energy}, stress ${checkIn.stress}, mood ${checkIn.mood}, soreness ${checkIn.soreness}, alcohol urge ${checkIn.alcoholUrge}` : "none yet"}.`);
    const diary = await safe(() => getFoodDiary(active.id));
    if (diary) {
      lines.push(`FOOD TODAY: ${Math.round(diary.proteinG)} g protein${diary.proteinTargetG ? ` of ${Math.round(diary.proteinTargetG)} g target` : ""}, ${Math.round(diary.calories)} kcal.${diary.entries.length ? " " + diary.entries.map((e) => `${hhmm(new Date(e.at))} ${e.name} (${Math.round(e.proteinG)} g${e.calories !== null ? `, ${Math.round(e.calories)} kcal` : ""})`).join("; ") : " Nothing logged yet."}`);
    }
    const quit = await safe(() => getQuitSummary(active.id, now));
    if (quit) lines.push(`QUIT TRACKER (${quit.habit.name}): clean today ${quit.cleanToday ? "yes" : "not logged"}; ${quit.cleanThisMonth} clean days this month, ${quit.cleanTotal} total; ${quit.urgesToday.length} urges logged today.`);
  } else lines.push("TODAY: no BEYOND day is active yet.");

  if (targets) lines.push(`TARGETS: calories ${targets.calorieTargetKcal ?? "not set"} kcal; protein ${targets.proteinMultiplierGPerLb} g per lb${targets.goalWeightLbs ? `; goal weight ${targets.goalWeightLbs} lb` : ""}. Latest weight: ${weight ?? "none logged"} lb.`);

  if (weekAhead) lines.push(`SCHEDULE NEXT 7 DAYS: ${weekAhead.days.map((d) => `${day(`${d.date}T12:00:00`)} ${d.work}${d.shiftStartHour !== null ? ` ${d.shiftStartHour}:00` : ""}`).join(" · ")}.`);

  if (measured) {
    const last = measured.lastNight;
    lines.push(`GARMIN: ${last ? `last main sleep ${hm(sleepMinutes(last))}, ${day(last.startTime)} ${hhmm(new Date(last.startTime))} → ${hhmm(new Date(last.endTime))}` : "no Garmin sleep in the last 36 hours"}; steps so far today ${measured.stepsToday.at(-1)?.total ?? "not measured"}; latest resting HR ${measured.resting.at(-1)?.value ?? measured.resting.at(-2)?.value ?? "not measured"}.`);
  }

  const debt = await safe(() => getSleepDebt(now));
  if (debt && debt.days) lines.push(`SLEEP OWED: ${hm(debt.owedMinutes)} over the last ${debt.days} days with sleep logged, against ${SLEEP_NEED_MINUTES / 60} h a day.`);

  if (summaries) {
    const recent = [...summaries].sort((a, b) => b.livedDayStart.localeCompare(a.livedDayStart)).slice(0, 14);
    lines.push("LAST 14 LIVED DAYS (newest first; '-' = not logged):");
    for (const s of recent) lines.push(dayLine(s));
  }

  if (tasks) lines.push(`OPEN TASKS/REMINDERS ([id] title): ${tasks.length ? tasks.map((t) => `[${t.id}] "${t.title}"${t.dueAt ? ` due ${t.dueAt}` : ""}${t.recurrence ? ` (repeats ${t.recurrence.rrule})` : ""}`).join("; ") : "none"}.`);
  if (notes) {
    const open = notes.filter((n) => n.status === "OPEN").slice(-10);
    lines.push(`OPEN NOTES: ${open.length ? open.map((n) => `"${n.text}" (${day(n.capturedAt)})`).join("; ") : "none"}.`);
  }
  const memories = await safe(getMemories);
  if (memories) lines.push(`WHAT HE ASKED YOU TO REMEMBER ([id] topic: fact): ${memories.length ? memories.map((m) => `[${m.id}] ${m.topic}: ${m.text}`).join("; ") : "nothing yet"}.`);
  if (meals) lines.push(`SAVED MEALS (id: name, per serving): ${meals.map((m) => `${m.id}: ${m.name} — ${m.calories} kcal, ${m.proteinG} g protein`).join("; ")}.`);
  if (unavailable) lines.push("READ FAILURE: one or more sections could not be read. Missing sections and absent day/check-in markers may mean unavailable, not nothing recorded. Say what you cannot establish; do not invent values.");
  return lines.join("\n");
}
