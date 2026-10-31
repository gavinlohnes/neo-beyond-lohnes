import { RRule } from "rrule";
import { INTENT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { createObligation } from "./intentCommands";
import { getUnresolvedObligations } from "./intentQueries";
import { rememberFact, getMemories } from "./alfred/alfredMemory";
import { formatLocalDate } from "../engine/scheduledContext";
import type { AlfredMemory } from "../domain/alfred/types";
import type { Obligation } from "../domain/intent/types";

/**
 * RELATIONSHIPS-001 (owner go 2026-10-31, "Go relationships"): remember the people who matter with
 * the records BEYOND already has. A person's date is a PERSON fact Alfred keeps plus an ordinary
 * yearly-repeating commitment, saved together on the operator's confirm. No contact store, no
 * inferred relationships, no reminders beyond the commitment's own due date.
 */

export const OCCASIONS = ["Birthday", "Anniversary", "Other"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export interface PersonDateInput { person: string; occasion: string; month: number; day: number; note?: string | undefined }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, "0");

export function describeMonthDay(month: number, day: number): string { return `${MONTHS[month - 1]} ${day}`; }

/** The next calendar date (YYYY-MM-DD) on or after `today` for this month/day. Feb 29 waits for a leap year. */
export function nextAnnualDate(month: number, day: number, today: string): string {
  const year = Number(today.slice(0, 4));
  for (let y = year; y < year + 9; y++) {
    const candidate = `${y}-${pad(month)}-${pad(day)}`;
    const real = new Date(`${candidate}T12:00:00Z`);
    if (real.getUTCMonth() + 1 === month && real.getUTCDate() === day && candidate >= today) return candidate;
  }
  throw new Error("INVALID_DATE: that date never comes round.");
}

/** A yearly rule anchored on its first date, the same DTSTART form buildRecurrenceRule writes. */
export function yearlyRule(anchor: string): string {
  return new RRule({ freq: RRule.YEARLY, interval: 1, dtstart: new Date(`${anchor}T00:00:00Z`) }).toString();
}

/**
 * Alfred's repeat rules arrive as bare RRULE text. Unanchored, rrule.js counts from whatever moment
 * it happens to be parsed, so "every week" drifts to the day it's ticked done. Anchor it on the
 * due date (or today), and refuse a rule rrule.js can't read rather than store it.
 */
export function anchorRule(raw: string, anchor: string): string {
  const body = raw.trim().replace(/^RRULE:/i, "");
  if (/DTSTART/i.test(body)) { RRule.fromString(body); return body; }
  const anchored = `DTSTART:${anchor.replace(/-/g, "")}T000000Z\nRRULE:${body}`;
  RRule.fromString(anchored);
  return anchored;
}

function validate(input: PersonDateInput) {
  const person = input.person.trim(), occasion = input.occasion.trim();
  if (!person) throw new Error("PERSON_REQUIRED: say who this is.");
  if (!occasion) throw new Error("OCCASION_REQUIRED: say what the date is.");
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error("INVALID_DATE: month must be 1 to 12.");
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > DAYS_IN[input.month - 1]!) throw new Error("INVALID_DATE: that day isn't in that month.");
  return { person, occasion, note: input.note?.trim() || undefined };
}

/** One fact and one yearly commitment, together or not at all. */
export async function addPersonDate(input: PersonDateInput, now = new Date()): Promise<{ memory: AlfredMemory; reminder: Obligation }> {
  const { person, occasion, note } = validate(input);
  const due = nextAnnualDate(input.month, input.day, formatLocalDate(now));
  return writeAtomically(["alfredMemories", ...INTENT_WRITE_TABLES], async () => {
    const memory = await rememberFact(`${person}: ${occasion.toLowerCase()} ${describeMonthDay(input.month, input.day)}${note ? `. ${note}` : ""}`, "PERSON");
    const reminder = await createObligation({
      title: `${person}'s ${occasion.toLowerCase()}`,
      dueAt: due,
      recurrence: { rrule: yearlyRule(due) },
      ...(note ? { description: note } : {}),
    });
    return { memory, reminder };
  });
}

export interface PeopleView {
  /** Unresolved yearly commitments, soonest first, with whole days until each. */
  upcoming: { reminder: Obligation; daysAway: number }[];
  /** What the operator asked Alfred to keep about people, newest first. */
  facts: AlfredMemory[];
}

const isYearly = (o: Obligation) => /FREQ=YEARLY/i.test(o.recurrence?.rrule ?? "");

export async function getPeopleView(now = new Date()): Promise<PeopleView> {
  const today = formatLocalDate(now);
  const [tasks, memories] = await Promise.all([getUnresolvedObligations(), getMemories()]);
  const days = (date: string) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return {
    upcoming: tasks.filter((t) => isYearly(t) && t.dueAt).map((t) => ({ reminder: t, daysAway: days(t.dueAt!) }))
      .sort((a, b) => a.reminder.dueAt!.localeCompare(b.reminder.dueAt!)),
    facts: memories.filter((m) => m.topic === "PERSON").reverse(),
  };
}
