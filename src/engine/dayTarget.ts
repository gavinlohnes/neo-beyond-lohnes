import type { EatingWindowDayKind, NutritionTargets } from "../domain/common/types";

export type DayTargetPart = { label: "Work night" | "First day off" | "Day off" | "Lift day"; kcal: number };
export interface DayCalorieTarget {
  kcal: number | undefined;
  /** The plain (weekly) target the day starts from. */
  base: number | undefined;
  kind: EatingWindowDayKind | null;
  lift: boolean;
  parts: DayTargetPart[];
  floorHeld: boolean;
}

const LABELS: Record<EatingWindowDayKind, DayTargetPart["label"]> = {
  WORK: "Work night", RECOVERY: "First day off", OFF: "Day off",
};

/** Pure, deterministic target derivation. Disabled/unknown-kind days remain byte-for-byte plain-target behavior. */
export function deriveDayCalorieTarget(targets: NutritionTargets, kind: EatingWindowDayKind | null, lift: boolean): DayCalorieTarget {
  const base = targets.calorieTargetKcal;
  if (base === undefined || !targets.dayTargets?.on || !kind) return { kcal: base, base, kind, lift: false, parts: [], floorHeld: false };
  const parts: DayTargetPart[] = [{ label: LABELS[kind], kcal: targets.dayTargets.adjustKcal[kind] }];
  if (lift) parts.push({ label: "Lift day", kcal: targets.dayTargets.adjustKcal.LIFT });
  const raw = base + parts.reduce((sum, part) => sum + part.kcal, 0);
  const floor = targets.calorieFloorKcal ?? 1500;
  return { kcal: Math.max(raw, floor), base, kind, lift, parts, floorHeld: raw < floor };
}

export function averageDayTargets(targets: NutritionTargets, days: readonly { kind: EatingWindowDayKind | null; lift: boolean }[]): number | undefined {
  if (targets.calorieTargetKcal === undefined || days.length === 0) return undefined;
  return days.reduce((sum, day) => sum + (deriveDayCalorieTarget(targets, day.kind, day.lift).kcal ?? 0), 0) / days.length;
}

/** Adjustment required on OFF days to make the projected average equal the plain target. */
export function balancedOffAdjustment(targets: NutritionTargets, days: readonly { kind: EatingWindowDayKind | null; lift: boolean }[]): number | null {
  if (targets.calorieTargetKcal === undefined || !targets.dayTargets || days.length === 0) return null;
  const offCount = days.filter((day) => day.kind === "OFF").length;
  if (!offCount) return null;
  const withoutOff = { ...targets, dayTargets: { ...targets.dayTargets, adjustKcal: { ...targets.dayTargets.adjustKcal, OFF: 0 } } };
  const total = days.reduce((sum, day) => sum + (deriveDayCalorieTarget(withoutOff, day.kind, day.lift).kcal ?? targets.calorieTargetKcal!), 0);
  return Math.round(((targets.calorieTargetKcal * days.length - total) / offCount) / 50) * 50;
}
