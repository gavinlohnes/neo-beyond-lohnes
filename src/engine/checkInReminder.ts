import { formatLocalDate } from "./scheduledContext";

/**
 * REMIND-001 (2026-09-15). Pure, deterministic, zero-I/O: the one
 * decision of whether a check-in reminder is due right now, given
 * already-true facts the caller supplies (application/
 * checkInReminderQueries.ts's maybeSendCheckInReminder). Plain primitives
 * in, not a shared type imported from persistence/* or application/* —
 * this module must never import from either (see .claude/rules/engine.md).
 *
 * Not itself a Recommendation and never composed into AdvisoryNote/
 * advisory.ts — this is a wholly separate, UI-adjacent notification
 * concern, not INTERPRET-stage material about a domain fact.
 */
export function shouldSendCheckInReminder(
  now: Date,
  enabled: boolean,
  reminderHour: number,
  lastReminderSentDate: string | null,
  hasCheckedInToday: boolean,
): boolean {
  if (!enabled) return false;
  if (hasCheckedInToday) return false;
  const today = formatLocalDate(now);
  if (lastReminderSentDate === today) return false;
  return now.getHours() >= reminderHour;
}
