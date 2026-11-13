/**
 * SCHEDULE-EXCEPTIONS-001 (Gavin, 2026-11-13): an operator-confirmed change to one future lived day of the standing
 * rotation: overtime (WORK on a scheduled day off), time off (OFF on a scheduled work day), or one half of a shift swap.
 * It informs planning; it never says the day was worked. Stable `id`; `status` and an append-only `history` make every
 * confirmation, change and cancellation traceable without rewriting anything. Local only.
 */
export type ScheduleExceptionReason = "OVERTIME" | "TIME_OFF" | "SWAP";
export type ScheduleExceptionStatus = "ACTIVE" | "CANCELLED";
export interface ScheduleExceptionRevision {
  at: string;
  action: "CONFIRMED" | "CHANGED" | "CANCELLED";
  kind: "WORK" | "OFF";
  note?: string;
}
export interface ScheduleException {
  id: string;
  /** The lived day it changes, by the local date it starts on (yyyy-mm-dd, 16:30 that day). */
  date: string;
  kind: "WORK" | "OFF";
  reason: ScheduleExceptionReason;
  /** Both halves of a shift swap share it; they are confirmed, changed and cancelled together. */
  swapId?: string;
  note?: string;
  status: ScheduleExceptionStatus;
  history: ScheduleExceptionRevision[];
  createdAt: string;
  updatedAt: string;
}
