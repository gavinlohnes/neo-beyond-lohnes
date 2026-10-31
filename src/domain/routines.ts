/**
 * ROUTINES-001 (owner approval 2026-10-31: the routines table, and one quiet row on TODAY).
 * An operator-written routine tied to a moment of his rotation. Ticks are history only: there is
 * no streak, no "missed", no count of days a routine was or wasn't done. An unticked step is
 * just unticked.
 */
export const ROUTINE_MOMENTS = ["BEFORE_SHIFT", "ON_SHIFT", "AFTER_SHIFT", "DAY_OFF"] as const;
export type RoutineMoment = (typeof ROUTINE_MOMENTS)[number];
export const ROUTINE_MOMENT_LABELS: Record<RoutineMoment, string> = {
  BEFORE_SHIFT: "Before shift", ON_SHIFT: "On shift", AFTER_SHIFT: "After shift", DAY_OFF: "Day off",
};
export interface RoutineStep { id: string; text: string }
export interface Routine {
  id: string;
  title: string;
  moment: RoutineMoment;
  steps: RoutineStep[];
  status: "ACTIVE" | "ARCHIVED";
  source: "USER" | "ENGINE" | "SYSTEM";
  seq?: number;
  createdAt: string;
  updatedAt: string;
}
