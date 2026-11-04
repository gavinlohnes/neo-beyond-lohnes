import { db } from "../persistence/db";
import type { Habit, HabitScheduleKind } from "../domain/habits";
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

/** Latest event wins, so a second tap corrects today's completion without erasing history. */
export async function setHabitDone(habitId: string, done: boolean, dayId?: string): Promise<boolean> {
  const habit = await db.habits.get(habitId);
  if (!habit || habit.status !== "ACTIVE") throw new Error("HABIT_NOT_FOUND");
  const day = dayId ? await db.beyondDays.get(dayId) : await ensureActiveDay();
  if (!day) throw new Error("DAY_NOT_FOUND");
  const current = await getHabitDone(day.id);
  if (current.has(habitId) === done) return false;
  const correlationId = newId();
  await logEvent(day.id, "HABIT_SET", { commandId: correlationId, habitId, done }, "USER", correlationId);
  return true;
}

export async function getHabitDone(dayId: string): Promise<Set<string>> {
  const events = (await db.events.where("beyondDayId").equals(dayId).toArray()).filter((event) => event.type === "HABIT_SET");
  const state = new Map<string, boolean>();
  for (const event of events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0))) {
    const payload = event.payload as { habitId?: unknown; done?: unknown };
    if (typeof payload.habitId === "string" && typeof payload.done === "boolean") state.set(payload.habitId, payload.done);
  }
  return new Set([...state].filter(([, done]) => done).map(([id]) => id));
}
