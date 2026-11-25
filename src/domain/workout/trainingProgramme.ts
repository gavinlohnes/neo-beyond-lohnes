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

export type TrainingProgramme = AssignedTrainingProgramme | SequenceTrainingProgramme;
export interface ProgrammeRevision {
  id: string | null;
  programme: TrainingProgramme | null;
  recordedAt?: string;
  seq?: number;
}
export const WEEKDAY_SLOTS = ["1", "2", "3", "4", "5", "6", "0"] as const;
export const ROTATION_SLOTS = ["WORK1", "WORK2", "WORK3", "OFF1", "OFF2", "OFF3"] as const;
