import { RRule } from "rrule";
import { INTENT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { createObligation } from "./intentCommands";
import { getUnresolvedObligations } from "./intentQueries";
import { getMemories, rememberFact } from "./alfred/alfredMemory";
import { formatLocalDate } from "../engine/scheduledContext";
import type { AlfredMemory } from "../domain/alfred/types";
import type { Obligation } from "../domain/intent/types";

/**
 * HOME-001 (owner go 2026-10-31, "Go home"): keep the house running with records BEYOND already has.
 * A home item is a HOME fact Alfred keeps (filter size, model number, who to call) and, if it
 * repeats, an ordinary repeating commitment titled "Home: …", saved together on the operator's
 * confirm. The visible "Home: " title is how the Home view finds them again, also after a repeat
 * creates the next one. No new store, no nagging, nothing marked overdue beyond its own date.
 */

export const HOME_PREFIX = "Home: ";
export const REPEAT_UNITS = ["WEEKS", "MONTHS", "YEARS"] as const;
export type RepeatUnit = (typeof REPEAT_UNITS)[number];
export interface HomeItemInput {
  item: string;
  details?: string | undefined;
  repeat?: { every: number; unit: RepeatUnit; firstDue: string } | undefined;
}

/**
 * A real calendar date in YYYY-MM-DD. Review of #360: Date.parse rolls "2027-02-30" over to
 * March 2, so the date must read back unchanged, not just look right.
 */
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
const UNIT_WORD: Record<RepeatUnit, [string, string]> = { WEEKS: ["week", "weeks"], MONTHS: ["month", "months"], YEARS: ["year", "years"] };
export const describeRepeat = (every: number, unit: RepeatUnit) => `every ${every === 1 ? UNIT_WORD[unit][0] : `${every} ${UNIT_WORD[unit][1]}`}`;

/** An anchored rule (DTSTART on the first due date), the same form buildRecurrenceRule writes. */
export function repeatRule(every: number, unit: RepeatUnit, firstDue: string): string {
  const freq = unit === "WEEKS" ? RRule.WEEKLY : unit === "MONTHS" ? RRule.MONTHLY : RRule.YEARLY;
  return new RRule({ freq, interval: every, dtstart: new Date(`${firstDue}T00:00:00Z`) }).toString();
}

function validate(input: HomeItemInput) {
  const item = input.item.trim(), details = input.details?.trim() || undefined;
  if (!item) throw new Error("ITEM_REQUIRED: say what this is.");
  if (item.length > 80) throw new Error("ITEM_TOO_LONG: keep the name short.");
  if (!details && !input.repeat) throw new Error("NOTHING_TO_KEEP: add details, a repeat, or both.");
  const r = input.repeat;
  if (r && (!Number.isInteger(r.every) || r.every < 1 || r.every > 60)) throw new Error("INVALID_REPEAT: repeat every 1 to 60.");
  if (r && !isRealDate(r.firstDue)) throw new Error("INVALID_DATE: give a real next due date.");
  return { item, details, repeat: r };
}

/** The fact (if any) and the repeating reminder (if any), together or not at all. */
export async function addHomeItem(input: HomeItemInput): Promise<{ memory: AlfredMemory | null; reminder: Obligation | null }> {
  const { item, details, repeat } = validate(input);
  return writeAtomically(["alfredMemories", ...INTENT_WRITE_TABLES], async () => {
    const memory = details ? await rememberFact(`${item}: ${details}`, "HOME") : null;
    const reminder = repeat ? await createObligation({
      title: `${HOME_PREFIX}${item}`,
      dueAt: repeat.firstDue,
      recurrence: { rrule: repeatRule(repeat.every, repeat.unit, repeat.firstDue) },
      ...(details ? { description: details } : {}),
    }) : null;
    return { memory, reminder };
  });
}

export interface HomeView {
  /** Open "Home: " commitments, soonest first, with whole days until each (negative: still open after its date). */
  due: { reminder: Obligation; daysAway: number | null }[];
  /** What the operator asked Alfred to keep about the home, newest first. */
  facts: AlfredMemory[];
}

export async function getHomeView(now = new Date()): Promise<HomeView> {
  const today = formatLocalDate(now);
  const [tasks, memories] = await Promise.all([getUnresolvedObligations(), getMemories()]);
  const days = (date: string) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return {
    due: tasks.filter((t) => t.title.startsWith(HOME_PREFIX))
      .map((t) => ({ reminder: t, daysAway: t.dueAt ? days(t.dueAt) : null }))
      .sort((a, b) => (a.reminder.dueAt ?? "9999").localeCompare(b.reminder.dueAt ?? "9999")),
    facts: memories.filter((m) => m.topic === "HOME").reverse(),
  };
}
