import { getWeekPlanner, type WeekPlanner, type PlannerDay } from "./weekPlannerQueries";
import { getMealPlanInputs } from "./mealPlanQueries";
import { draftMealPlan } from "./mealPlan";
import { getShiftSleepPlan, type ShiftSleepPlan } from "./shiftSleepPlan";
import { getRoutines } from "./routineCommands";
import type { Routine } from "../domain/routines";
import { ROUTINE_MOMENT_LABELS } from "../domain/routines";

export interface WorkRunDraft { text: string | null; message: string | null; generatedAt: string }
type Meals = Awaited<ReturnType<typeof getMealPlanInputs>>;
const known = (d: PlannerDay) => d.basis !== "UNKNOWN" && d.basis !== "WHAT_IF";

/** The first known work block and following days off inside the existing seven-date projection. Never jump an unknown gap. */
export function runBlock(days: readonly PlannerDay[]): PlannerDay[] {
  const start = days.findIndex((d) => !known(d) || d.work === "WORK");
  if (start < 0 || !known(days[start]!)) return [];
  const result: PlannerDay[] = []; let off = false;
  for (const day of days.slice(start)) {
    if (!known(day) || (off && day.work === "WORK")) break;
    if (day.work === "OFF") off = true;
    result.push(day);
  }
  return result;
}

/** Reuses existing drafts as labelled snapshots; it never assigns dates, logs food, ticks routines or changes training. */
export function composeWorkRunDraft(week: WeekPlanner, meals: Meals, sleep: ShiftSleepPlan | null, routines: readonly Routine[], now: Date): WorkRunDraft {
  const generatedAt = now.toISOString(), days = runBlock(week.days);
  if (!days.length) return { text: null, generatedAt, message: "No known work block can be drafted inside the next seven dates. Confirm your work schedule or changes first; unknown days are not days off." };
  // The existing meal generator needs seven known dates. Never turn its boolean work field into an unknown-day guess.
  const food = week.days.every(known) ? draftMealPlan(meals.meals, meals.targets, week.days.map((d) => ({ date: d.date, work: d.work === "WORK" })), 7) : null;
  const lines = [
    `Work-run plan · ${days[0]!.date} to ${days.at(-1)!.date}`,
    `Draft snapshot generated ${now.toLocaleString()}. Review and edit before saving.`,
    "This is a plan note, not scheduled actions or a record of what happened. Saved notes do not update themselves; draft again after changes.",
    "Scope: the first known work block and following days off within seven calendar dates. A run already underway may be partial; the block may continue beyond this horizon.",
    "Shifts use their 16:30 lived-day date. Tasks and calendar events use calendar dates; do not read a day as free capacity.",
    week.calendar.lastSyncAt ? `Read-only calendar snapshot last synced ${new Date(week.calendar.lastSyncAt).toLocaleString()}.` : "No synced calendar snapshot available.",
    week.calendar.connected ? "Calendar connection present; cached events may be stale." : "Calendar disconnected; any displayed events are cached.",
  ];
  if (!food) lines.push("Meal draft omitted: the seven-date meal window contains unknown work context.");
  else if (food.message) lines.push(`Meals: ${food.message}`);
  for (const day of days) {
    lines.push("", `${day.date} — ${day.work === "WORK" ? "Work" : "Day off"} (${day.basis === "PREDICTED" ? "saved schedule forecast" : day.basis === "CONFIRMED" ? "confirmed change" : "recorded context"})${day.work === "WORK" && day.shiftStartHour !== null ? ` · starts ${String(day.shiftStartHour).padStart(2, "0")}:00` : ""}`);
    lines.push(`Training: ${day.workout.basis === "ASSIGNED" ? "your programme — " : day.workout.basis === "SUGGESTED" ? "existing suggestion, not a booking — " : ""}${day.workout.label}`);
    const mealDay = food?.days.find((d) => d.date === day.date);
    if (mealDay) for (const slot of mealDay.slots) lines.push(`Meal draft · ${slot.label}: ${slot.mealId ? `${meals.meals.find((m) => m.id === slot.mealId)?.name ?? "Saved meal unavailable"} × ${slot.servings} servings` : "Choose a meal"}`);
    if (!day.tasks.length) lines.push("Tasks: none recorded for this calendar date; this is not a claim of free time.");
    for (const task of day.tasks) lines.push(`Task: ${task.title} · ${task.plannedAt ? `planned ${task.plannedAt}` : "not planned"}${task.dueAt ? ` · due ${task.dueAt}` : " · no deadline"}`);
    for (const event of day.events) lines.push(`Calendar (read only): ${event.title} · ${event.allDay ? `all day ${event.start.slice(0, 10)} to ${event.end.slice(0, 10)} (end exclusive)` : `${new Date(event.start).toLocaleString()} to ${new Date(event.end).toLocaleString()}`}`);
  }
  lines.push("", "SLEEP — existing next-shift draft only");
  // Existing ROUTE uses the standing rotation. Do not present its cards as exception-aware multi-day sleep scheduling.
  const sleepFits = sleep && !week.days.some((d) => d.basis === "CONFIRMED") && days.some((d) => d.date === sleep.shift.date && d.work === "WORK");
  if (sleepFits && sleep) {
    lines.push(`For the existing next-shift preview on ${sleep.shift.date}, not the whole work run. Review in ROUTE if your schedule changes.`);
    for (const card of sleep.cards) lines.push(`${card.title}: ${card.detail} Basis: ${card.basis}${card.source ? ` Source: ${card.source.label} ${card.source.url}` : ""}`);
  } else lines.push("No matching sleep preview included. Confirmed changes or insufficient context need review in the existing ROUTE sleep planner; no future sleep times are guessed here.");
  lines.push("", "PREPARATION — your saved routines, not completed checklists");
  const prep = routines.filter((r) => r.status === "ACTIVE");
  if (!prep.length) lines.push("No active routines saved. Add the preparation you choose to this draft.");
  for (const routine of prep) { lines.push(`${ROUTINE_MOMENT_LABELS[routine.moment]}: ${routine.title}`); for (const step of routine.steps) lines.push(`[ ] ${step.text}`); }
  lines.push("", "Earlier deadlines and unplanned tasks remain in Week planner. This note does not move them, record meals, book workouts, confirm preparation or create notifications.");
  return { text: lines.join("\n"), message: null, generatedAt };
}

export async function getWorkRunDraft(now = new Date()): Promise<WorkRunDraft> {
  const [week, meals, sleep, routines] = await Promise.all([getWeekPlanner(now), getMealPlanInputs(7, now), getShiftSleepPlan(now), getRoutines()]);
  return composeWorkRunDraft(week, meals, sleep, routines, now);
}
