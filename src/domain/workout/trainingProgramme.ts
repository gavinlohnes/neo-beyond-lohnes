/** The operator's own template assignments. Information only; never an Engine recommendation. */
export interface TrainingProgramme { mode: "WEEKDAYS" | "ROTATION"; slots: Record<string, string> }
export interface ProgrammeRevision { id: string | null; programme: TrainingProgramme | null }
export const WEEKDAY_SLOTS = ["1", "2", "3", "4", "5", "6", "0"] as const;
export const ROTATION_SLOTS = ["WORK1", "WORK2", "WORK3", "OFF1", "OFF2", "OFF3"] as const;
