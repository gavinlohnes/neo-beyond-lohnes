/** MEMORY-001: operator-authored facts; never inferred or recommendation inputs. */
export const MEMORY_KINDS = ["PREP_FOOD", "PREP_BOTTLE", "PREP_OTHER", "RECOVERY"] as const;
export type MemoryKind = typeof MEMORY_KINDS[number];
export const MEMORY_LABELS: Record<MemoryKind, string> = {
  PREP_FOOD: "Food preparation", PREP_BOTTLE: "Bottle preparation", PREP_OTHER: "Other preparation", RECOVERY: "Recovery",
};
export type MemoryStatus = "ACTIVE" | "IRRELEVANT";
export type MemoryAction = "CREATED" | "CORRECTED" | "CONFIRMED" | "IRRELEVANT" | "RESTORED";
export interface MemoryRevision {
  id: string; factId: string; kind: MemoryKind; statement: string; status: MemoryStatus;
  action: MemoryAction; supersedes: string | null; recordedAt: string; beyondDayId: string;
  lastConfirmedAt: string;
}
export interface MemoryFact extends MemoryRevision {
  source: "OPERATOR"; createdAt: string; history: MemoryRevision[];
}
