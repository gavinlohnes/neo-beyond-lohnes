/**
 * GRAYSON-DAY-TARGETS-001 (Gavin, 2026-11-25: "Yes. That's a good idea."): a calorie target for each kind of day. Pure,
 * no I/O. Each day's target is his plain (weekly) target plus his own adjustment for the day's kind, plus his lift-day
 * adjustment when a strength workout is planned or logged, never below his floor. A day whose kind can't be placed uses
 * the plain target. Off, nothing changes: the plain target everywhere.
 */
export type DayTargetKind = "WORK" | "RECOVERY" | "OFF";
export interface DayTargetAdjust { WORK: number; RECOVERY: number; OFF: number; LIFT: number }
export interface DayTargetSettings { on: boolean; adjustKcal: DayTargetAdjust }

export const DAY_TARGET_STEP = 50;
export const DAY_TARGET_LIMIT = 1000;
/** The floor when he hasn't set his own (the weekly proposal's floor, TARGET-PROPOSAL-002). */
export const DEFAULT_CALORIE_FLOOR = 1500;
export const ZERO_ADJUST: DayTargetAdjust = { WORK: 0, RECOVERY: 0, OFF: 0, LIFT: 0 };
export const KIND_LABEL: Record<DayTargetKind, string> = { WORK: "Work night", RECOVERY: "First day off", OFF: "Day off" };
export const LIFT_LABEL = "Lift day";

export interface DayTargetPart { label: string; kcal: number }
export interface DayTarget {
  kcal: number;
  /** The plain (weekly) target it starts from. */
  base: number;
  on: boolean;
  kind: DayTargetKind | null;
  lift: boolean;
  /** True when his floor lifted the day's number. */
  floorHeld: boolean;
  /** "Weekly target 1950", "Work night +100", "Lift day +150"; empty when off. */
  parts: DayTargetPart[];
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The day's target. `kind` null (the schedule can't place it) or settings off gives the plain target. */
export function dayTarget(base: number, settings: DayTargetSettings | undefined, kind: DayTargetKind | null, lift: boolean,
  floor: number = DEFAULT_CALORIE_FLOOR): DayTarget {
  if (!settings?.on || kind === null) return { kcal: base, base, on: !!settings?.on, kind, lift: false, floorHeld: false, parts: [] };
  const a = settings.adjustKcal;
  const parts: DayTargetPart[] = [{ label: "Weekly target", kcal: base }, { label: KIND_LABEL[kind], kcal: a[kind] }];
  if (lift) parts.push({ label: LIFT_LABEL, kcal: a.LIFT });
  const raw = base + a[kind] + (lift ? a.LIFT : 0);
  const kcal = Math.max(raw, floor);
  return { kcal, base, on: true, kind, lift, floorHeld: kcal > raw, parts };
}

/** "Weekly target 1950 · work night +100 · lift day +150". */
export function describeParts(t: DayTarget): string {
  if (!t.parts.length) return `Your daily target ${t.base}`;
  const [first, ...rest] = t.parts;
  const text = [`${first!.label} ${first!.kcal}`, ...rest.map((p) => `${p.label.toLowerCase()} ${signed(p.kcal)}`)].join(" · ");
  return t.floorHeld ? `${text} · held at your floor, ${t.kcal}` : text;
}

/** "Work night, lift day", or null when the plain target applies. */
export function dayTargetLabel(t: DayTarget): string | null {
  if (!t.on || !t.kind) return null;
  return t.lift ? `${KIND_LABEL[t.kind]}, ${LIFT_LABEL.toLowerCase()}` : KIND_LABEL[t.kind];
}

export interface ProjectedDay { kind: DayTargetKind | null; lift: boolean }

/** The average day target over the projected days (his two saved weeks). */
export function averageTarget(days: readonly ProjectedDay[], base: number, settings: DayTargetSettings, floor: number = DEFAULT_CALORIE_FLOOR): number {
  if (!days.length) return base;
  return days.reduce((sum, d) => sum + dayTarget(base, settings, d.kind, d.lift, floor).kcal, 0) / days.length;
}

/** Rounded gap between the two-week average and his target; within 25 kcal reads as on target. */
export function averageGap(days: readonly ProjectedDay[], base: number, settings: DayTargetSettings, floor?: number): number {
  const gap = Math.round(averageTarget(days, base, settings, floor) - base);
  return Math.abs(gap) < DAY_TARGET_STEP / 2 ? 0 : gap;
}

/**
 * BALANCE: the day-off adjustment (in steps of 50, within ±1000) that brings the two-week average closest to his
 * target. Null when the two weeks have no day off to balance with. Never applied by itself.
 */
export function balanceOff(days: readonly ProjectedDay[], base: number, settings: DayTargetSettings, floor?: number): number | null {
  if (!days.some((d) => d.kind === "OFF")) return null;
  let best = settings.adjustKcal.OFF, bestGap = Infinity;
  for (let off = -DAY_TARGET_LIMIT; off <= DAY_TARGET_LIMIT; off += DAY_TARGET_STEP) {
    const gap = Math.abs(averageTarget(days, base, { ...settings, adjustKcal: { ...settings.adjustKcal, OFF: off } }, floor) - base);
    if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) < 1e-9 && Math.abs(off) < Math.abs(best))) { best = off; bestGap = gap; }
  }
  return best;
}
