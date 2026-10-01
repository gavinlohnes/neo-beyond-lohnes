import type { UrgeTrigger } from "../../../domain/common/types";

/** Drop 6: plain labels for the one-tap urge triggers. */
export const URGE_TRIGGER_LABELS: Record<UrgeTrigger, string> = {
  AFTER_SHIFT: "After shift",
  STRESS: "Stress",
  TIRED: "Tired",
  SOCIAL: "Social",
  BORED: "Bored",
  OTHER: "Other",
};

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 });
}

export function describeCleanDays(count: number): string {
  return `${count} clean ${count === 1 ? "day" : "days"} this month`;
}
