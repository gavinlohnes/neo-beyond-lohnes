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

// ---- Drop 4 (urge if-then plans, 2026-10-03) ----

/** Settings label for one trigger's plan. */
export function describeIfThenPlanLabel(trigger: UrgeTrigger): string {
  return `If it's “${URGE_TRIGGER_LABELS[trigger]}”, then I'll… (optional)`;
}

/** Shown right after an urge with that trigger is logged — the owner's own words. */
export function describeYourPlan(trigger: UrgeTrigger, plan: string): string {
  return `Your plan for ${URGE_TRIGGER_LABELS[trigger]}: ${plan}`;
}

export function describePlanResponse(used: boolean): string {
  return used ? "Noted — plan used." : "Noted.";
}
