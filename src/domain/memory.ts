import type { MemoryTopic } from "./alfred/types";
/** MEMORY-001: operator-authored facts; never inferred or recommendation inputs. */
export const MEMORY_KINDS = ["PREP_FOOD", "PREP_BOTTLE", "PREP_OTHER", "RECOVERY", "DIRECTION", "CONSTRAINT", "PERSONAL_FACT"] as const;
export type MemoryKind = typeof MEMORY_KINDS[number];
export const MEMORY_LABELS: Record<MemoryKind, string> = {
  PERSONAL_FACT: "Personal fact (shared with Alfred)", PREP_FOOD: "Food preparation", PREP_BOTTLE: "Bottle preparation", PREP_OTHER: "Other preparation", RECOVERY: "Recovery", DIRECTION: "Desired direction", CONSTRAINT: "Planning constraint",
};
export type MemoryStatus = "ACTIVE" | "IRRELEVANT";
/**
 * GRAYSON-ONE-MEMORY-001 (C6.7): where a memory came from, set by the one command that saved it and carried forward on
 * every revision. Recorded from now on only; facts saved before it say "Saved in BEYOND", never a guessed source.
 */
export const MEMORY_VIAS = ["DELTA", "HOME", "PEOPLE", "MEMORY", "GUIDED", "OLD_ENTRY"] as const;
export type MemoryVia = typeof MEMORY_VIAS[number];
export const MEMORY_VIA_LABELS: Record<MemoryVia, string> = {
  DELTA: "You told Delta", HOME: "Home", PEOPLE: "People", MEMORY: "Added in Memory", GUIDED: "Teach Delta", OLD_ENTRY: "Old Delta entry, kept",
};
export type MemoryAction = "CREATED" | "CORRECTED" | "CONFIRMED" | "IRRELEVANT" | "RESTORED";
export interface MemoryRevision {
  id: string; factId: string; kind: MemoryKind; statement: string; status: MemoryStatus;
  action: MemoryAction; supersedes: string | null; recordedAt: string; beyondDayId?: string;
  topic?: MemoryTopic | undefined; origin?: MemoryOrigin | undefined;
  /** C6.7: where it came from (absent on facts saved before ONE-MEMORY-001). */
  via?: MemoryVia | undefined;
  lastConfirmedAt: string;
}
export interface MemoryFact extends MemoryRevision {
  source: "OPERATOR"; createdAt: string; history: MemoryRevision[];
}

/** Retained original evidence, never model context. Conversion time is the root recordedAt. */
export interface MemoryOrigin { kind: "ALFRED_MEMORY"; id: string; text: string; topic: MemoryTopic; savedAt: string }
