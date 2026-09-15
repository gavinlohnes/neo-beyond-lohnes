import { RRule, Weekday } from "rrule";

/**
 * INTENT-002: pure wrapper around rrule.js, per this repo's own
 * CAPABILITY_MAP.md caveat ("rrule.js documents some deviations from
 * strict RFC behavior, so wrap it behind BEYOND's own tests/contracts
 * rather than trusting its output unquestioned"). No I/O, no Dexie, no
 * application-layer import — pure derivation from plain inputs to plain
 * outputs, same as every other engine/* module.
 */

export type RecurrenceFreq = "DAILY" | "WEEKLY" | "MONTHLY";

const WEEKDAY_CODES: Record<string, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

export interface RecurrencePreset {
  freq: RecurrenceFreq;
  /** Every N days/weeks/months. Always >= 1. */
  interval: number;
  /** WEEKLY only — RFC 5545 two-letter weekday codes, e.g. ["MO","WE","FR"]. Ignored for DAILY/MONTHLY. */
  byDay?: string[];
  /** YYYY-MM-DD — the schedule's anchor date. rrule.js computes every occurrence relative to this, never to "now". */
  anchor: string;
}

/**
 * Builds the full two-line RFC 5545 string (`DTSTART:...\nRRULE:...`)
 * this repo stores as `RecurrenceRule.rrule` — never hand-formatted.
 * The DTSTART line is what makes `deriveNextOccurrenceDate` below
 * deterministic: without an explicit dtstart, rrule.js anchors to the
 * moment the RRule object happens to be constructed, which would make
 * BEYOND's own recurrence dates depend on exactly when the app computes
 * them rather than on the schedule the operator actually set up
 * (confirmed directly against the installed rrule version before this
 * module was written — see tests/engine/recurrence.test.ts).
 */
export function buildRecurrenceRule(preset: RecurrencePreset): string {
  const freq = { DAILY: RRule.DAILY, WEEKLY: RRule.WEEKLY, MONTHLY: RRule.MONTHLY }[preset.freq];
  const byweekday =
    preset.freq === "WEEKLY" && preset.byDay && preset.byDay.length > 0
      ? preset.byDay.map((code) => WEEKDAY_CODES[code]).filter((w): w is Weekday => w !== undefined)
      : undefined;
  const rule = new RRule({
    freq,
    interval: preset.interval,
    dtstart: new Date(`${preset.anchor}T00:00:00Z`),
    ...(byweekday && byweekday.length > 0 ? { byweekday } : {}),
  });
  return rule.toString();
}

/**
 * The next occurrence strictly after `afterDate`, or `null` if the rule
 * has no further occurrences. Both dates are YYYY-MM-DD — Obligation's
 * own day-grained convention (see domain/intent/types.ts's Obligation
 * doc comment), never a sub-day instant.
 */
export function deriveNextOccurrenceDate(rrule: string, afterDate: string): string | null {
  const rule = RRule.fromString(rrule);
  const next = rule.after(new Date(`${afterDate}T00:00:00Z`), false);
  return next ? next.toISOString().slice(0, 10) : null;
}

/** Human-readable summary for display — never re-derives the rule's own semantics differently from what buildRecurrenceRule/deriveNextOccurrenceDate actually compute. */
export function describeRecurrence(rrule: string): string {
  const rule = RRule.fromString(rrule);
  return rule.toText();
}

const WEEKDAY_NUMS: Record<number, string> = { 0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU" };
const FREQ_NUMS: Record<number, RecurrenceFreq> = { [RRule.DAILY]: "DAILY", [RRule.WEEKLY]: "WEEKLY", [RRule.MONTHLY]: "MONTHLY" };

/**
 * The inverse of buildRecurrenceRule — lets an edit form re-populate its
 * frequency/interval/weekday picker from an already-stored rule, instead
 * of only ever being able to set recurrence once and never adjust it.
 * Returns `null` for a frequency this repo's picker doesn't offer
 * (rrule.js supports far more than DAILY/WEEKLY/MONTHLY; a rule built
 * by anything other than buildRecurrenceRule is out of scope here).
 */
export function parseRecurrencePreset(rrule: string): RecurrencePreset | null {
  const rule = RRule.fromString(rrule);
  const freq = FREQ_NUMS[rule.options.freq];
  if (!freq || !rule.options.dtstart) return null;
  const byDay = Array.isArray(rule.options.byweekday)
    ? rule.options.byweekday.map((n: number) => WEEKDAY_NUMS[n]).filter((c): c is string => c !== undefined)
    : undefined;
  return {
    freq,
    interval: rule.options.interval,
    ...(byDay && byDay.length > 0 ? { byDay } : {}),
    anchor: rule.options.dtstart.toISOString().slice(0, 10),
  };
}
