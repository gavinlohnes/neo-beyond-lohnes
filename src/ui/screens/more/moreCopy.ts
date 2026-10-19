/**
 * REMIND-001 (2026-09-15). Pure copy/formatting helper, unit-tested
 * independently of the DOM — same pattern every other screen's
 * co-located *Copy.ts module already follows (e.g. trainCopy.ts).
 */

/** Local hour displayed as HH:MM. Storage is unchanged. */
export function formatReminderHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
