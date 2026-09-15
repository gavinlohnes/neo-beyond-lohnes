import { describe, expect, it } from "vitest";
import { shouldSendCheckInReminder } from "../../src/engine/checkInReminder";

/**
 * REMIND-001 (2026-09-15). Pure unit tests — no Dexie, no localStorage,
 * no Notification, matching every other engine/* test file's zero-I/O
 * contract.
 */

const NOON = new Date("2026-09-15T12:00:00");
const NIGHT = new Date("2026-09-15T21:00:00");

describe("shouldSendCheckInReminder", () => {
  it("disabled preference -> never due, regardless of time/history", () => {
    expect(shouldSendCheckInReminder(NIGHT, false, 20, null, false)).toBe(false);
  });

  it("already checked in today -> never due", () => {
    expect(shouldSendCheckInReminder(NIGHT, true, 20, null, true)).toBe(false);
  });

  it("already reminded today -> not due again the same day", () => {
    expect(shouldSendCheckInReminder(NIGHT, true, 20, "2026-09-15", false)).toBe(false);
  });

  it("reminded on a different (past) day -> due again today", () => {
    expect(shouldSendCheckInReminder(NIGHT, true, 20, "2026-09-14", false)).toBe(true);
  });

  it("before the reminder hour -> not yet due", () => {
    expect(shouldSendCheckInReminder(NOON, true, 20, null, false)).toBe(false);
  });

  it("at or after the reminder hour, enabled, not checked in, not yet reminded today -> due", () => {
    expect(shouldSendCheckInReminder(NIGHT, true, 20, null, false)).toBe(true);
    expect(shouldSendCheckInReminder(new Date("2026-09-15T20:00:00"), true, 20, null, false)).toBe(true);
  });

  it("deterministic: same input -> same output", () => {
    expect(shouldSendCheckInReminder(NIGHT, true, 20, null, false)).toBe(
      shouldSendCheckInReminder(NIGHT, true, 20, null, false),
    );
  });
});
