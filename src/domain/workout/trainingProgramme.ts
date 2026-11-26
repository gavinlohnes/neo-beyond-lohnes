import type { ExercisePrescription } from "./types";

/** Existing date/work-run assignments. Information only; never an Engine recommendation. */
export interface AssignedTrainingProgramme { mode: "WEEKDAYS" | "ROTATION"; slots: Record<string, string> }

export interface SequenceProgrammeMember {
  key: "A" | "B" | "C";
  templateId: string;
  snapshot: { name: string; exercises: ExercisePrescription[] };
  home?: { templateId: string; snapshot: { name: string; exercises: ExercisePrescription[] } };
  /** GRAYSON-TRAIN-SHORT-LINK-001: an owner-confirmed shorter loaded prescription for the same member. */
  short?: { templateId: string; snapshot: { name: string; exercises: ExercisePrescription[] } };
}

/** Owner-confirmed order. Capacity still owns STANDARD / REDUCED / RECOVERY. */
export interface SequenceTrainingProgramme {
  mode: "SEQUENCE";
  members: [SequenceProgrammeMember, SequenceProgrammeMember, SequenceProgrammeMember];
  startTemplateId: string;
}

/**
 * GRAYSON-WEEK-PLAN-001 (Gavin, 2026-11-25): his training week laid on his saved Week A and Week B. `weeks` has one
 * entry per week of his schedule (index 0 is Week A), keyed by weekday "0" (Sunday) to "6". A value is a routine id,
 * WEEK_PLAN_REST or WEEK_PLAN_EMPTY. `overrides` holds one-day changes by local date (YYYY-MM-DD); an override wins on
 * its own day only. A missed day stays missed: nothing shifts.
 */
export interface WeekPlanTrainingProgramme {
  mode: "WEEK_PLAN";
  weeks: Record<string, string>[];
  overrides?: Record<string, string>;
}
export const WEEK_PLAN_REST = "REST";
export const WEEK_PLAN_EMPTY = "EMPTY";

export type TrainingProgramme = AssignedTrainingProgramme | SequenceTrainingProgramme | WeekPlanTrainingProgramme;
export interface ProgrammeRevision {
  id: string | null;
  programme: TrainingProgramme | null;
  recordedAt?: string;
  seq?: number;
}
export const WEEKDAY_SLOTS = ["1", "2", "3", "4", "5", "6", "0"] as const;
export const ROTATION_SLOTS = ["WORK1", "WORK2", "WORK3", "OFF1", "OFF2", "OFF3"] as const;
