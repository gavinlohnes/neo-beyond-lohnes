/** PREP-001: operator-confirmed preparation, never consumption or an obligation. */
export type PreparationItem = "FOOD" | "BOTTLE";
export type PreparationValue = "UNCONFIRMED" | "READY" | "HOMEMADE" | "FROZEN" | "OTHER" | "NOT_NEEDED";
export const PREPARATION_LABELS: Record<PreparationValue, string> = {
  UNCONFIRMED: "Not confirmed", READY: "Ready", HOMEMADE: "Homemade packed", FROZEN: "Frozen backup packed",
  OTHER: "Other arrangement covered", NOT_NEEDED: "Not needed tonight",
};
export interface PreparationEntry { id: string | null; value: PreparationValue; recordedAt: string | null }
export type PreparationState = Record<PreparationItem, PreparationEntry>;
