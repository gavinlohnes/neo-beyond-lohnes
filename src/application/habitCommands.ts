import { db } from "../persistence/db";
import { HABIT_ANSWERS, projectHabitAnswers, type Habit, type HabitScheduleKind, type HabitAnswer } from "../domain/habits";
import { writeAtomically } from "./atomicWrite";
import { ensureActiveDay, logEvent, newId } from "./commands";

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("Name the habit in 1 to 80 characters.");
  return name;
}

export async function createHabit(input: { name: string; kind: HabitScheduleKind; weekdays?: number[] }): Promise<Habit> {
  const now = new Date().toISOString();
  const weekdays = [...new Set(input.weekdays ?? [])].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).sort();
  if (input.kind === "WEEKDAYS" && !weekdays.length) throw new Error("Choose at least one day.");
  const habit: Habit = { id: newId(), name: cleanName(input.name), schedule: { kind: input.kind, ...(input.kind === "WEEKDAYS" ? { weekdays } : {}) }, status: "ACTIVE", createdAt: now, updatedAt: now };
  await db.habits.add(habit);
  return habit;
}

export async function setHabitArchived(id: string, archived: boolean) {
  const habit = await db.habits.get(id);
  if (!habit) throw new Error("HABIT_NOT_FOUND");
  await db.habits.update(id, { status: archived ? "ARCHIVED" : "ACTIVE", updatedAt: new Date().toISOString() });
}

/** Append a real-time answer/correction to the explicitly selected existing lived day. */
export async function setHabitAnswer(habitId: string, answer: HabitAnswer, dayId?: string): Promise<boolean> {
  if (!HABIT_ANSWERS.includes(answer)) throw new Error("INVALID_HABIT_ANSWER");
  // Preserve canonical lazy-day lifecycle outside this transaction (including its post-commit automation).
  // Recheck the habit inside the answer transaction so a concurrent archive cannot pass the write guard.
  const existing = await db.habits.get(habitId);
  if (!existing || existing.status !== "ACTIVE") throw new Error("HABIT_NOT_FOUND");
  const selectedDay = dayId ?? (await ensureActiveDay()).id;
  return writeAtomically(["habits", "beyondDays"], async () => {
    const habit = await db.habits.get(habitId);
    if (!habit || habit.status !== "ACTIVE") throw new Error("HABIT_NOT_FOUND");
    const day = await db.beyondDays.get(selectedDay);
    if (!day) throw new Error("DAY_NOT_FOUND");
    if (Date.parse(day.startedAt) > Date.now()) throw new Error("FUTURE_DAY");
    const events = await db.events.where("beyondDayId").equals(day.id).toArray();
    const current = projectHabitAnswers(events).get(habitId) ?? "UNRECORDED";
    if (current === answer) return false;
    const correlationId = newId();
    await logEvent(day.id, "HABIT_SET", { commandId: correlationId, habitId, done: answer === "DONE", answer }, "USER", correlationId);
    return true;
  });
}

/** Compatibility gateway: existing callers retain their mark/undo meaning. */
export function setHabitDone(habitId: string, done: boolean, dayId?: string): Promise<boolean> {
  return setHabitAnswer(habitId, done ? "DONE" : "UNRECORDED", dayId);
}

export async function getHabitDone(dayId: string): Promise<Set<string>> {
  const events = await db.events.where("beyondDayId").equals(dayId).toArray();
  return new Set([...projectHabitAnswers(events)].filter(([, answer]) => answer === "DONE").map(([id]) => id));
}
