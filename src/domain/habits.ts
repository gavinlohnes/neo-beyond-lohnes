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
