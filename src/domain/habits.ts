export const HABIT_SCHEDULE_KINDS = ["ANY_DAY", "WEEKDAYS", "WORK_DAYS", "DAYS_OFF"] as const;
export type HabitScheduleKind = (typeof HABIT_SCHEDULE_KINDS)[number];
export type Habit = {
  id: string;
  name: string;
  schedule: { kind: HabitScheduleKind; weekdays?: number[] };
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

/** Explicit answers are additive. A legacy false meant undo, never an explicit negative answer. */
export const HABIT_ANSWERS = ["DONE", "NOT_DONE", "UNRECORDED"] as const;
export type HabitAnswer = (typeof HABIT_ANSWERS)[number];
export const HABIT_ANSWER_LABEL: Record<HabitAnswer, string> = {
  DONE: "Done", NOT_DONE: "Didn't do it", UNRECORDED: "Not recorded",
};

export function habitAnswerOf(payload: unknown): { habitId: string; answer: HabitAnswer } | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { habitId?: unknown; done?: unknown; answer?: unknown };
  if (typeof p.habitId !== "string" || typeof p.done !== "boolean") return null;
  if (p.answer === undefined) return { habitId: p.habitId, answer: p.done ? "DONE" : "UNRECORDED" };
  if (!HABIT_ANSWERS.includes(p.answer as HabitAnswer) || p.done !== (p.answer === "DONE")) return null;
  return { habitId: p.habitId, answer: p.answer as HabitAnswer };
}

/** Caller supplies the selected day's events; history is append-only and latest valid event wins. */
export function projectHabitAnswers(events: readonly { type: string; occurredAt: string; seq?: number; payload: unknown }[]): Map<string, HabitAnswer> {
  const answers = new Map<string, HabitAnswer>();
  for (const event of [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0))) {
    if (event.type !== "HABIT_SET") continue;
    const p = habitAnswerOf(event.payload);
    if (p) answers.set(p.habitId, p.answer);
  }
  return answers;
}
