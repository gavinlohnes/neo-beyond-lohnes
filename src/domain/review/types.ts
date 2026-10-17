/** User-owned review records; facts/choices, never Engine recommendations. */
export type WeeklyFocus =
  | { kind: "WEIGHT_DAYS" | "PROTEIN_DAYS" | "TRAINING_SESSIONS"; target: number; text: string }
  | { kind: "CUSTOM"; text: string };
export interface WeeklyReviewPayload {
  weekStart: string;
  weekEnd: string;
  note: string;
  focus: WeeklyFocus | null;
  supersedes?: string;
}
export interface WeeklyReviewRecord extends WeeklyReviewPayload {
  id: string;
  recordedAt: string;
  seq?: number;
}
export interface ReviewWeek { start: string; end: string }
