import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { setCheckInReminderPreference } from "../../src/persistence/checkInReminder";
import { maybeSendCheckInReminder } from "../../src/application/checkInReminderQueries";

/**
 * REMIND-001 (2026-09-15). Real command/query layer proof that
 * maybeSendCheckInReminder correctly composes real Dexie state (is there
 * an ACTIVE day, has it been checked into) with the persisted preference
 * and the pure engine decision — not just each piece in isolation.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function stubGrantedNotification() {
  const NotificationMock = vi.fn();
  vi.stubGlobal("Notification", Object.assign(NotificationMock, { permission: "granted" }));
  return NotificationMock;
}

const NIGHT = new Date("2026-09-15T21:00:00");

describe("maybeSendCheckInReminder", () => {
  it("preference disabled (the default) -> never sends, even past the hour with no check-in", async () => {
    const NotificationMock = stubGrantedNotification();
    expect(await maybeSendCheckInReminder(NIGHT)).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("enabled, no ACTIVE day at all yet, past the hour -> sends", async () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 20 });
    const NotificationMock = stubGrantedNotification();

    expect(await maybeSendCheckInReminder(NIGHT)).toBe(true);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
  });

  it("enabled, an ACTIVE day exists but no check-in yet, past the hour -> sends", async () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 20 });
    await startDay();
    const NotificationMock = stubGrantedNotification();

    expect(await maybeSendCheckInReminder(NIGHT)).toBe(true);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
  });

  it("enabled, already checked in today -> never sends", async () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 20 });
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const NotificationMock = stubGrantedNotification();

    expect(await maybeSendCheckInReminder(NIGHT)).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("enabled, no check-in, but not yet past the reminder hour -> does not send", async () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 20 });
    const NotificationMock = stubGrantedNotification();

    expect(await maybeSendCheckInReminder(new Date("2026-09-15T12:00:00"))).toBe(false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("only sends once per calendar day, even across repeated calls", async () => {
    setCheckInReminderPreference({ enabled: true, reminderHour: 20 });
    const NotificationMock = stubGrantedNotification();

    expect(await maybeSendCheckInReminder(NIGHT)).toBe(true);
    expect(await maybeSendCheckInReminder(NIGHT)).toBe(false);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
  });
});
