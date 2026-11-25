import type { DomainEvent, StandardTestKind, StandardTestRecordedPayload, StandardTestUnit } from "../common/types";
import { activeVoidedIds } from "../logVoids";

/**
 * GRAYSON-TRAIN-STANDARDS-001 (Gavin, 2026-11-24): the three standards tests BEYOND records (the Illinois POWER test's
 * sit-and-reach, one-minute sit-ups and 1.5-mile run; bench stays observed from his sets). Pure: validation, units,
 * the words a row says, and which results stand after removals and fixes. No score tables, no pass or fail: a target
 * is his own.
 */

export interface StandardTestInfo {
  kind: StandardTestKind;
  name: string;
  unit: StandardTestUnit;
  /** A bigger number is better (reach, reps); for the run, a smaller one is. */
  higherIsBetter: boolean;
}

export const STANDARD_TESTS: readonly StandardTestInfo[] = [
  { kind: "SIT_UPS_1MIN", name: "One-minute sit-ups", unit: "reps", higherIsBetter: true },
  { kind: "SIT_AND_REACH", name: "Sit-and-reach", unit: "in", higherIsBetter: true },
  { kind: "RUN_1_5_MILE", name: "1.5-mile run", unit: "seconds", higherIsBetter: false },
];
export const STANDARD_TEST: Readonly<Record<StandardTestKind, StandardTestInfo>> = Object.fromEntries(STANDARD_TESTS.map((t) => [t.kind, t])) as Record<StandardTestKind, StandardTestInfo>;

export const isStandardTestKind = (k: unknown): k is StandardTestKind => typeof k === "string" && Object.hasOwn(STANDARD_TEST, k);

/** The range each unit accepts: inches 0–30 in quarters, reps 0–150, seconds 300–3600 (5 to 60 minutes). */
export const STANDARD_LIMITS: Readonly<Record<StandardTestUnit, { min: number; max: number; step: number }>> = {
  in: { min: 0, max: 30, step: 0.25 },
  reps: { min: 0, max: 150, step: 1 },
  seconds: { min: 300, max: 3600, step: 1 },
};

/** Null when the value is fine for the test, otherwise the words to show. */
export function standardValueProblem(kind: StandardTestKind, value: number): string | null {
  const { unit } = STANDARD_TEST[kind];
  const { min, max, step } = STANDARD_LIMITS[unit];
  const onStep = Number.isFinite(value) && Math.abs(value / step - Math.round(value / step)) < 1e-9;
  if (Number.isFinite(value) && value >= min && value <= max && onStep) return null;
  if (unit === "in") return "Enter inches from 0 to 30, to the quarter inch.";
  if (unit === "reps") return "Enter whole reps from 0 to 150.";
  return "Enter a time from 5:00 to 60:00.";
}

export const STANDARD_NOTE_MAX = 200;

const QUARTERS = ["", "¼", "½", "¾"] as const;
/** 14.25 → "14¼", 0.5 → "½", 12 → "12". */
export function formatInches(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const q = Math.round((value - whole) * 4) % 4;
  return `${whole === 0 && q ? "" : whole}${QUARTERS[q]}`;
}

/** 822 → "13:42". */
export function formatRunTime(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "14¼ in", "38 reps", "13:42". */
export function formatStandardValue(kind: StandardTestKind, value: number): string {
  const { unit } = STANDARD_TEST[kind];
  if (unit === "in") return `${formatInches(value)} in`;
  if (unit === "reps") return `${value} ${value === 1 ? "rep" : "reps"}`;
  return formatRunTime(value);
}

export interface StandardResult {
  eventId: string;
  test: StandardTestKind;
  value: number;
  at: string;
  beyondDayId: string;
  note?: string;
  correctsEventId?: string;
  seq: number;
}

/**
 * Every result that stands, newest first: each STANDARD_TEST_RECORDED minus those a standing STANDARD_TEST_VOIDED
 * names (a put-back removal counts again). A fix voided the old one, so only the new one stands.
 */
export function projectStandardResults(events: readonly DomainEvent[]): StandardResult[] {
  const voided = activeVoidedIds(events, "STANDARD_TEST_VOIDED");
  return events
    .filter((e) => e.type === "STANDARD_TEST_RECORDED" && !voided.has(e.id))
    .map((e): StandardResult => {
      const p = e.payload as StandardTestRecordedPayload;
      return {
        eventId: e.id, test: p.test, value: p.value, at: p.at, beyondDayId: e.beyondDayId ?? p.beyondDayId, seq: e.seq ?? 0,
        ...(p.note ? { note: p.note } : {}), ...(p.correctsEventId ? { correctsEventId: p.correctsEventId } : {}),
      };
    })
    .filter((r) => isStandardTestKind(r.test))
    .sort((a, b) => b.at.localeCompare(a.at) || b.seq - a.seq);
}

/** "Oct 2", in the phone's own time zone, so a test at 23:30 Central shows that evening's date. */
export function standardDate(at: string): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function amount(kind: StandardTestKind, diff: number): string {
  const { unit } = STANDARD_TEST[kind];
  if (unit === "in") return `${formatInches(diff)} ${diff <= 1 ? "inch" : "inches"}`;
  if (unit === "reps") return `${diff} ${diff === 1 ? "rep" : "reps"}`;
  if (diff < 60) return `${diff} ${diff === 1 ? "second" : "seconds"}`;
  return `${formatRunTime(diff)} (min:s)`;
}

/** "1 inch further than Oct 2", "18 seconds slower than Oct 2", "Same as Oct 2". Never red, never pass or fail. */
export function describeStandardChange(kind: StandardTestKind, last: Pick<StandardResult, "value">, previous: Pick<StandardResult, "value" | "at">): string {
  const diff = Math.round((last.value - previous.value) * 100) / 100;
  const when = standardDate(previous.at);
  if (diff === 0) return `Same as ${when}`;
  const size = amount(kind, Math.abs(diff));
  const { unit } = STANDARD_TEST[kind];
  if (unit === "in") return `${size} ${diff > 0 ? "further" : "shorter"} than ${when}`;
  if (unit === "reps") return `${size} ${diff > 0 ? "more" : "fewer"} than ${when}`;
  return `${size} ${diff > 0 ? "slower" : "faster"} than ${when}`;
}

/** With his target: "13 seconds under your target", "22 seconds to go", "On your target". */
export function describeStandardTarget(kind: StandardTestKind, value: number, target: number): string {
  const { higherIsBetter, unit } = STANDARD_TEST[kind];
  const ahead = Math.round((higherIsBetter ? value - target : target - value) * 100) / 100;
  if (ahead === 0) return "On your target";
  const size = amount(kind, Math.abs(ahead));
  if (ahead < 0) return `${size} to go`;
  return `${size} ${unit === "seconds" ? "under" : "past"} your target`;
}
