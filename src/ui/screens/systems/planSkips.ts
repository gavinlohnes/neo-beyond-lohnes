import type { PlanCardKind } from "../../../application/shiftSleepPlan";

/**
 * CIRCADIAN-SPIKE-001: SKIP hides one sleep-plan card for that shift (or, for GRAYSON-FLIP-PLAN-001, that flip) on
 * this device. #723 review: TODAY's flip line reads the same marker, so a skipped flip leaves TODAY too.
 */
export const skipKey = (date: string, kind: PlanCardKind) => `beyond.shiftSleepPlan.skip.${date}.${kind}`;
export const readSkip = (key: string) => { try { return localStorage.getItem(key) === "1"; } catch { return false; } };
export const writeSkip = (key: string) => { try { localStorage.setItem(key, "1"); } catch { /* the card simply comes back next time */ } };
