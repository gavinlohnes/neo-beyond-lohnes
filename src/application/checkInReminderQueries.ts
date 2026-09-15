import { shouldSendCheckInReminder } from "../engine/checkInReminder";
import { formatLocalDate } from "../engine/scheduledContext";
import {
  getCheckInReminderPreference,
  getLastReminderSentDate,
  requestCheckInNotificationPermission,
  sendCheckInReminderNotification,
  setCheckInReminderPreference,
  type CheckInReminderPreference,
} from "../persistence/checkInReminder";
import { getActiveDay, getLatestCheckIn } from "./queries";

/**
 * REMIND-001 (2026-09-15): the one application-layer seam for this
 * capability. UI never imports persistence/checkInReminder.ts directly —
 * MoreScreen.tsx/App.tsx go through here instead, matching
 * "src/application/ is the sole gateway to persistence" (see CLAUDE.md's
 * Architecture layer rules and scripts/check-architecture-boundaries.mjs,
 * which does not grant either of those files a new persistence import).
 */
export {
  getCheckInReminderPreference,
  setCheckInReminderPreference,
  requestCheckInNotificationPermission,
  type CheckInReminderPreference,
};

/** No ACTIVE day yet, or an ACTIVE day with no check-in yet, both count as "hasn't checked in today." */
async function hasCheckedInToday(): Promise<boolean> {
  const day = await getActiveDay();
  if (!day) return false;
  const checkIn = await getLatestCheckIn(day.id);
  return checkIn !== undefined;
}

/**
 * Fetches every already-true fact `shouldSendCheckInReminder` needs, hands
 * them to that pure engine decision unchanged, and — only if it says
 * yes — sends the actual notification. This function is the only place
 * that combines "read real state" with "decide" with "act"; the engine
 * function itself never touches Dexie/localStorage/Notification, and the
 * persistence functions never decide anything. Safe to call on every
 * app mount (see app/App.tsx) — idempotent per calendar day via
 * getLastReminderSentDate, and a no-op whenever the preference is
 * disabled, which is the default.
 */
export async function maybeSendCheckInReminder(now: Date = new Date()): Promise<boolean> {
  const preference = getCheckInReminderPreference();
  if (!preference.enabled) return false;

  const checkedIn = await hasCheckedInToday();
  const lastSent = getLastReminderSentDate();

  const due = shouldSendCheckInReminder(now, preference.enabled, preference.reminderHour, lastSent, checkedIn);
  if (!due) return false;

  sendCheckInReminderNotification(formatLocalDate(now));
  return true;
}
