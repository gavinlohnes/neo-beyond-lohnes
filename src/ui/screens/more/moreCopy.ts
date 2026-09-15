/**
 * REMIND-001 (2026-09-15). Pure copy/formatting helper, unit-tested
 * independently of the DOM — same pattern every other screen's
 * co-located *Copy.ts module already follows (e.g. trainCopy.ts).
 */

/** 0-23 (local hour) -> a plain 12-hour label, e.g. 20 -> "8:00 PM", 0 -> "12:00 AM", 13 -> "1:00 PM". */
export function formatReminderHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour}:00 ${period}`;
}
