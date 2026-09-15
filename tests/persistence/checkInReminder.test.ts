import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REMINDER_HOUR,
  getCheckInReminderPreference,
  getLastReminderSentDate,
  requestCheckInNotificationPermission,
  sendCheckInReminderNotification,
  setCheckInReminderPreference,
} from "../../src/persistence/checkInReminder";

/**
 * REMIND-001 (2026-09-15). Same localStorage-bookkeeping treatment as
 * backup.ts/outcomeDismissals.ts, plus the one place this Drop calls the
 * real Notification API — mocked via vi.stubGlobal("Notification", ...),
 * the same pattern backupNudge.test.ts already uses for navigator.share.
 */

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("getCheckInReminderPreference / setCheckInReminderPreference", () => {
  it("defaults to disabled with DEFAULT_REMINDER_HOUR when nothing is stored", () => {
    expect(getCheckInReminderPreference()).toEqual({ enabled: false, reminderHour: DEFAULT_REMINDER_HOUR });
  });

  it("round-trips a stored preference", () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 9 });
    expect(getCheckInReminderPreference()).toEqual({ enabled: true, reminderHour: 9 });
  });

  it("falls back to the default rather than throwing on malformed stored data", () => {
    localStorage.setItem("beyond:checkInReminderPreference", "not json");
    expect(getCheckInReminderPreference()).toEqual({ enabled: false, reminderHour: DEFAULT_REMINDER_HOUR });
  });

  it("falls back to DEFAULT_REMINDER_HOUR for an out-of-range stored hour, without dropping enabled", () => {
    localStorage.setItem("beyond:checkInReminderPreference", JSON.stringify({ enabled: true, reminderHour: 99 }));
    expect(getCheckInReminderPreference()).toEqual({ enabled: true, reminderHour: DEFAULT_REMINDER_HOUR });
  });
});

describe("getLastReminderSentDate", () => {
  it("null when a reminder has never been sent", () => {
    expect(getLastReminderSentDate()).toBeNull();
  });
});

describe("requestCheckInNotificationPermission", () => {
  it("resolves whatever Notification.requestPermission() resolves", async () => {
    vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
    await expect(requestCheckInNotificationPermission()).resolves.toBe("granted");
  });

  it("denied when Notification doesn't exist in this environment at all", async () => {
    vi.stubGlobal("Notification", undefined);
    await expect(requestCheckInNotificationPermission()).resolves.toBe("denied");
  });
});

describe("sendCheckInReminderNotification", () => {
  it("constructs a real Notification and records the sent date when permission is granted", () => {
    const NotificationMock = vi.fn();
    vi.stubGlobal("Notification", Object.assign(NotificationMock, { permission: "granted" }));

    sendCheckInReminderNotification("2026-09-15");

    expect(NotificationMock).toHaveBeenCalledTimes(1);
    expect(NotificationMock).toHaveBeenCalledWith("BEYOND", expect.objectContaining({ tag: "beyond-checkin-reminder" }));
    expect(getLastReminderSentDate()).toBe("2026-09-15");
  });

  it("does nothing (no construction, no bookkeeping) when permission is not granted", () => {
    const NotificationMock = vi.fn();
    vi.stubGlobal("Notification", Object.assign(NotificationMock, { permission: "denied" }));

    sendCheckInReminderNotification("2026-09-15");

    expect(NotificationMock).not.toHaveBeenCalled();
    expect(getLastReminderSentDate()).toBeNull();
  });

  it("does nothing when Notification doesn't exist in this environment at all", () => {
    vi.stubGlobal("Notification", undefined);
    expect(() => sendCheckInReminderNotification("2026-09-15")).not.toThrow();
    expect(getLastReminderSentDate()).toBeNull();
  });
});
