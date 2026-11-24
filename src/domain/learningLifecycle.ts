/**
 * GRAYSON C6.1 (Gavin, 2026-11-24: "Agreed"; design choices: a new event type, Narrow by preset plus optional words,
 * re-check only when evidence flips or goes stale). The vision's learning lifecycle for Delta's learnings.
 *
 * Delta still derives every learning from records (application/delta.ts); nothing it derives is stored. What is
 * stored is only his answer to one: LEARNING_RESPONDED, append-only, global (not day-scoped), causally chained by
 * `supersedes`, with the words he saw and the evidence at that moment. Never an Engine input.
 */
export const LEARNING_ACTIONS = ["KEEP", "NARROW", "NOT_TRUE", "DROP", "UNDO"] as const;
export type LearningAction = typeof LEARNING_ACTIONS[number];
export const NARROW_PRESETS = ["WORK_DAYS", "DAYS_OFF", "AFTER_NIGHTS"] as const;
export type NarrowPreset = typeof NARROW_PRESETS[number];
export const NARROW_LABELS: Record<NarrowPreset, string> = { WORK_DAYS: "Work days", DAYS_OFF: "Days off", AFTER_NIGHTS: "After night shifts" };

/** What the learning rested on when he answered, so a later flip can be seen. */
export interface LearningEvidence {
  kind: "TAG" | "SLEEP_WINDOW" | "EXPERIMENT" | "UNUSUAL";
  /** Days (or nights) behind it. */
  days: number;
  /** TAG: which measure and which way it leaned. */
  measure?: string | undefined;
  direction?: "MORE" | "LESS" | "SAME" | undefined;
  /** SLEEP_WINDOW: the typical midpoint, minutes after midnight. */
  midpoint?: number | undefined;
}

export interface LearningResponsePayload {
  learningId: string;
  action: LearningAction;
  /** The learning's words as he saw them. */
  statement: string;
  evidence: LearningEvidence;
  /** NARROW only: when it applies. */
  context?: { preset?: NarrowPreset | undefined; words?: string | undefined } | undefined;
  /** The previous response for this learning, or null for the first. */
  supersedes: string | null;
  /** C6.2: given in the weekly "What I think I'm learning", so it counts toward that week's three. */
  via?: "WEEKLY" | undefined;
}

export const LEARNING_STATES = ["OBSERVED", "HYPOTHESIZED", "PROVISIONAL", "CONFIRMED", "CONTEXT_SPECIFIC", "CONTESTED", "OUTDATED", "RETIRED"] as const;
export type LearningState = typeof LEARNING_STATES[number];
export const LEARNING_STATE_LABELS: Record<LearningState, string> = {
  OBSERVED: "Noticed", HYPOTHESIZED: "A possible pattern", PROVISIONAL: "Being tested", CONFIRMED: "You confirmed it",
  CONTEXT_SPECIFIC: "Only sometimes", CONTESTED: "In question", OUTDATED: "Probably out of date", RETIRED: "Dropped",
};
