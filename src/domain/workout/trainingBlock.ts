// Domain layer must not import React, Dexie, or UI code.

/**
 * GRAYSON-BLOCK-CYCLE-001 (Gavin, 2026-11-25: "do these work outs for 4 to 6 weeks ... then Delta and I will review and
 * see what needs to be changed"). A block he starts: a length, an optional focus, and a lighter last week. Its review
 * offers 2 to 3 changes from fixed rules, each his to accept or skip. Every threshold is his (BlockSettings).
 */
export const BLOCK_WEEKS_MIN = 4;
export const BLOCK_WEEKS_MAX = 6;
export const BLOCK_FOCUS_MAX = 3;

export interface TrainingBlock {
  /** Local date (YYYY-MM-DD) of the Monday the block starts. */
  startDate: string;
  weeks: number;
  /** 0 to 3 focus areas (TRAIN Intelligence §7). */
  focus: string[];
  lightLastWeek: boolean;
  /** Block weeks (1-based) he turned back to normal with NORMAL THIS WEEK. */
  normalWeeks?: number[];
  /** Set when he ended the block early: the local date it ended. */
  endedOn?: string;
  /** Lifts that start lighter (percent) in this block, until he logs them: handed over once by NEXT BLOCK. */
  weightDrops?: Record<string, number>;
  /** Accepted in this block's review: handed to the next block by NEXT BLOCK, once (never carried further). */
  pendingDrops?: Record<string, number>;
}

export interface BlockSettings {
  /** Sessions done under this share of planned suggests one fewer day a week. */
  sessionsShare: number;
  /** A stalled lift's suggested weight drop, in percent. */
  weightDropPercent: number;
  /** The light week's share of working sets left out (rounded down, never below 1 set). */
  lightFraction: number;
  /** Direct sets per week, low to high, for focus areas (§7's starting ranges; others are his to set). */
  focusRanges: Record<string, [number, number]>;
}

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  sessionsShare: 0.75,
  weightDropPercent: 10,
  lightFraction: 1 / 3,
  // TRAIN Intelligence §7: "roughly 8-10 direct chest sets, 4-6 direct triceps sets ... and 6-8 relevant trap/upper-back
  // sets per complete rotation". Read as per week here (the brief's review line is per week).
  focusRanges: { Chest: [8, 10], Triceps: [4, 6], Traps: [6, 8] },
};

/** Latest wins. `block` null means no block (ended or undone to nothing). */
export interface TrainingBlockSetPayload {
  commandId: string;
  block: TrainingBlock | null;
  settings: BlockSettings;
  reason: "START" | "CHANGE" | "END" | "NORMAL_WEEK" | "SETTINGS" | "UNDO" | "NEXT";
  undoesEventId?: string;
}

const DAY_MS = 86_400_000;
const parseDate = (date: string) => { const [y, m, d] = date.split("-").map(Number); return new Date(y!, m! - 1, d!); };
const dayNumber = (date: Date) => Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / DAY_MS);

/** The block week (1-based) a date falls in, or null before it starts, after it ends, or after he ended it. */
export function blockWeekOf(block: TrainingBlock, date: Date): number | null {
  if (block.endedOn && dayNumber(date) > dayNumber(parseDate(block.endedOn))) return null;
  const days = dayNumber(date) - dayNumber(parseDate(block.startDate));
  if (days < 0) return null;
  const week = Math.floor(days / 7) + 1;
  return week > block.weeks ? null : week;
}

/** The block's last day (the Sunday of its last week). */
export function blockLastDay(block: TrainingBlock): Date {
  const start = parseDate(block.startDate);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + block.weeks * 7 - 1);
}

export function isLightWeek(block: TrainingBlock, date: Date): boolean {
  const week = blockWeekOf(block, date);
  return week !== null && block.lightLastWeek && week === block.weeks && !(block.normalWeeks ?? []).includes(week);
}

/** About a third fewer working sets, rounded down, never below 1. Same exercises, same weights. */
export function lightSets(sets: number, fraction = DEFAULT_BLOCK_SETTINGS.lightFraction): number {
  return Math.max(1, sets - Math.floor(sets * fraction));
}

/** Plain words, or null when the block can be saved. */
export function validateBlock(block: TrainingBlock): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(block.startDate) || parseDate(block.startDate).getDay() !== 1) return "A block starts on a Monday.";
  if (!Number.isInteger(block.weeks) || block.weeks < BLOCK_WEEKS_MIN || block.weeks > BLOCK_WEEKS_MAX) return `A block is ${BLOCK_WEEKS_MIN} to ${BLOCK_WEEKS_MAX} weeks.`;
  if (block.focus.length > BLOCK_FOCUS_MAX || new Set(block.focus).size !== block.focus.length) return `Pick up to ${BLOCK_FOCUS_MAX} different focus areas.`;
  return null;
}

export function validateBlockSettings(s: BlockSettings): string | null {
  if (!(s.sessionsShare > 0 && s.sessionsShare <= 1)) return "The sessions share goes from 1% to 100%.";
  if (!(s.weightDropPercent >= 1 && s.weightDropPercent <= 50)) return "The weight drop goes from 1% to 50%.";
  if (!(s.lightFraction > 0 && s.lightFraction < 1)) return "The light week leaves out between 1% and 99% of sets.";
  for (const [area, [lo, hi]] of Object.entries(s.focusRanges)) if (!(Number.isInteger(lo) && Number.isInteger(hi) && lo >= 0 && hi >= lo && hi <= 40)) return `${area}: the range goes from 0 to 40 sets, low at or below high.`;
  return null;
}
