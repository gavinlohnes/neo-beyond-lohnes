/**
 * REMIND-001 (2026-09-15): Check-in reminder, on-device only. Same
 * treatment as backup.ts's last-backup timestamp and outcomeDismissals.ts:
 * operational/UI bookkeeping, not meaningful domain history, stored in
 * localStorage rather than as a domain event. The Notification API call
 * itself living here (not application/*) mirrors backup.ts's own
 * shareBackup, which already calls navigator.share directly from this
 * layer — a real precedent for "a browser-API side effect for an
 * operational, not domain, concern lives in persistence/*".
 *
 * Deliberately NOT a push notification and needs no backend: BEYOND's
 * existing backup-reminder doctrine (backup.ts's own doc comment) rejects
 * push specifically because "BEYOND has no backend to support one
 * without contradicting local-first doctrine" — that reasoning is about
 * server-triggered push, not a local, client-scheduled Notification the
 * browser itself displays with no push service involved. Also explicitly
 * NOT the same as always-on background delivery: this only ever fires
 * from a live check when the app happens to be open (see
 * application/checkInReminderQueries.ts's maybeSendCheckInReminder) —
 * there is no Periodic Background Sync, no Push subscription, and no
 * guarantee of firing on a day the app is never opened. That limitation
 * is deliberate and honest, not an oversight.
 */
export interface CheckInReminderPreference {
  enabled: boolean;
  /** 0-23, local time — the hour after which a reminder becomes eligible. */
  reminderHour: number;
}

const PREFERENCE_KEY = "beyond:checkInReminderPreference";
const LAST_SENT_KEY = "beyond:checkInReminderLastSentDate";

/** No real signal for a "right" default time — evening, after a typical workday, is a reasonable starting point the operator can freely change. */
export const DEFAULT_REMINDER_HOUR = 20;

const DEFAULT_PREFERENCE: CheckInReminderPreference = { enabled: false, reminderHour: DEFAULT_REMINDER_HOUR };

/** Never throws on malformed/missing stored data — falls back to disabled, matching this app's general "invalid data is excluded, not fatal" convention. */
export function getCheckInReminderPreference(): CheckInReminderPreference {
  const raw = localStorage.getItem(PREFERENCE_KEY);
  if (!raw) return DEFAULT_PREFERENCE;
  try {
    const parsed = JSON.parse(raw) as Partial<CheckInReminderPreference>;
    const reminderHour =
      typeof parsed.reminderHour === "number" && parsed.reminderHour >= 0 && parsed.reminderHour <= 23
        ? parsed.reminderHour
        : DEFAULT_REMINDER_HOUR;
    return { enabled: parsed.enabled === true, reminderHour };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function setCheckInReminderPreference(preference: CheckInReminderPreference): void {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preference));
}

export function getLastReminderSentDate(): string | null {
  return localStorage.getItem(LAST_SENT_KEY);
}

function recordReminderSent(dateStr: string): void {
  localStorage.setItem(LAST_SENT_KEY, dateStr);
}

/**
 * User-initiated only (called from the opt-in toggle in MoreScreen) —
 * never called automatically, so the operator is never surprised by a
 * permission prompt they didn't ask for.
 */
export async function requestCheckInNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  return Notification.requestPermission();
}

/**
 * The one place this Drop actually shows a notification. Never prompts
 * for permission itself (see requestCheckInNotificationPermission) — if
 * permission isn't already "granted", this silently does nothing rather
 * than surfacing an error, since the caller (application/
 * checkInReminderQueries.ts's maybeSendCheckInReminder) has already
 * decided a reminder is due; a missing/revoked permission is a reason to
 * skip, not a failure to report.
 */
export function sendCheckInReminderNotification(todayDateStr: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification("BEYOND", {
    body: "You haven't checked in today yet.",
    tag: "beyond-checkin-reminder",
  });
  recordReminderSent(todayDateStr);
}
