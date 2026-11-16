import { describe, expect, it } from "vitest";
import { applyAlertContract, describeReminderAlert, inQuietHours, isClockTime, taskAlertAt, type BridgeMoment } from "../src/application/bridgePlan";
import { CLOCK_HHMM } from "../src/persistence/intentValidation";
import type { KeyMomentAlertSettings } from "../src/domain/common/types";

/** REMIND-AT-001 unit layer: time parsing, the contract with a timed task, DST. Runs under TZ=UTC and America/Chicago. */
const chicago = Intl.DateTimeFormat().resolvedOptions().timeZone === "America/Chicago";
const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const NONE: KeyMomentAlertSettings = { off: [], quietFrom: null, quietTo: null };
const m = (when: number, kind: BridgeMoment["kind"], text: string = kind): BridgeMoment => ({ at: when, kind, title: "", text, go: "" });

describe("REMIND-AT-001 — time parsing", () => {
  it("accepts only a 24-hour HH:MM clock time", () => {
    for (const ok of ["00:00", "07:05", "17:30", "23:59"]) { expect(isClockTime(ok)).toBe(true); expect(CLOCK_HHMM.test(ok)).toBe(true); }
    for (const bad of ["24:00", "7:30", "17:60", "5pm", "17:30:00", "", " 17:30", "after I wake"]) {
      expect(isClockTime(bad)).toBe(false);
      expect(CLOCK_HHMM.test(bad)).toBe(false);
    }
    expect(isClockTime(undefined)).toBe(false);
  });

  it("puts the alert at the reminder time on the due day, else 16:00, and refuses a malformed day", () => {
    expect(taskAlertAt("2026-11-16", "17:30")).toBe(at(2026, 11, 16, 17, 30));
    expect(taskAlertAt("2026-11-16")).toBe(at(2026, 11, 16, 16));
    expect(taskAlertAt("2026-11-16", "25:00")).toBe(at(2026, 11, 16, 16));
    expect(taskAlertAt("16/11/2026", "17:30")).toBeNull();
    expect(new Date(taskAlertAt("2026-11-16", "17:30")!).toISOString()).toBe(chicago ? "2026-11-16T23:30:00.000Z" : "2026-11-16T17:30:00.000Z");
  });

  it("keeps the wall-clock hour across DST (fall back 1 Nov 2026, spring forward 14 Mar 2027)", () => {
    const before = new Date(taskAlertAt("2026-10-31", "17:30")!), after = new Date(taskAlertAt("2026-11-01", "17:30")!);
    expect([before.getHours(), after.getHours()]).toEqual([17, 17]);
    expect(after.getTime() - before.getTime()).toBe((chicago ? 25 : 24) * 3_600_000);
    // 02:30 doesn't exist on 14 Mar 2027 in Chicago: it lands on the real clock time, 03:30.
    expect(new Date(taskAlertAt("2027-03-14", "02:30")!).getHours()).toBe(chicago ? 3 : 2);
    // 01:30 happens twice on 1 Nov 2026 in Chicago: it fires once, at a real 01:30.
    expect(new Date(taskAlertAt("2026-11-01", "01:30")!).getHours()).toBe(1);
  });
});

describe("REMIND-AT-001 — a timed TASK_DUE under the cap and quiet hours", () => {
  it("drops a timed reminder in quiet hours (start inclusive, end exclusive, across midnight)", () => {
    const quiet: KeyMomentAlertSettings = { off: [], quietFrom: "22:00", quietTo: "07:00" };
    expect(inQuietHours(at(2026, 11, 16, 22), quiet)).toBe(true);
    expect(inQuietHours(at(2026, 11, 17, 6, 59), quiet)).toBe(true);
    expect(inQuietHours(at(2026, 11, 17, 7), quiet)).toBe(false);
    const kept = applyAlertContract([m(at(2026, 11, 16, 23, 30), "TASK_DUE"), m(at(2026, 11, 17, 7), "TASK_DUE", "ok")], quiet);
    expect(kept.map((k) => k.text)).toEqual(["ok"]);
  });

  it("keeps 3 a lived day by priority then time: shift alerts first, earlier tasks before later, wake last", () => {
    // Lived day 16:30 Mon 16 Nov to 16:30 Tue 17 Nov.
    const moments = [
      m(at(2026, 11, 17, 12), "TASK_DUE", "noon reminder"),
      m(at(2026, 11, 17, 9), "TASK_DUE", "9am reminder"),
      m(at(2026, 11, 16, 17, 30), "BEFORE_SHIFT"),
      m(at(2026, 11, 17, 6), "SHIFT_DONE"),
      m(at(2026, 11, 17, 7), "WAKE"),
    ];
    expect(applyAlertContract(moments, NONE).map((k) => k.text)).toEqual(["BEFORE_SHIFT", "SHIFT_DONE", "9am reminder"]);
    // The same reminder at 17:00 is the next lived day, so it isn't capped by this one.
    const next = applyAlertContract([...moments, m(at(2026, 11, 17, 17), "TASK_DUE", "evening")], NONE);
    expect(next.map((k) => k.text)).toContain("evening");
    expect(applyAlertContract(moments, { off: ["TASK_DUE"], quietFrom: null, quietTo: null }).some((k) => k.kind === "TASK_DUE")).toBe(false);
    // A reminder at or after 16:30 counts toward the NEXT lived day's cap (16:30 Tue to 16:30 Wed) and loses there by time.
    const tue = [
      m(at(2026, 11, 17, 16, 30), "TASK_DUE", "16:30 reminder"),
      m(at(2026, 11, 17, 17, 30), "BEFORE_SHIFT", "tue shift"),
      m(at(2026, 11, 18, 6), "SHIFT_DONE", "wed done"),
      m(at(2026, 11, 18, 9), "TASK_DUE", "wed 9am"),
    ];
    expect(applyAlertContract([...moments, ...tue], NONE).map((k) => k.text))
      .toEqual(["BEFORE_SHIFT", "SHIFT_DONE", "9am reminder", "16:30 reminder", "tue shift", "wed done"]);
    expect(describeReminderAlert({ state: "SILENT", at: at(2026, 11, 18, 9), reason: "CAP_FULL" }))
      .toBe("Won't alert: the day from 16:30 Tue 17 Nov already has 3 alerts that come first (shift alerts, then earlier tasks).");
  });

  it("says every won't-alert reason in one plain line", () => {
    const when = at(2026, 11, 17, 12);
    expect(describeReminderAlert({ state: "ALERTS", at: when })).toBe("Alerts at 12:00 on Tue 17 Nov. Your phone gets it at the next SYNC GARMIN.");
    expect(describeReminderAlert({ state: "SILENT", at: when, reason: "PAST" })).toBe("Won't alert: that time has already passed.");
    expect(describeReminderAlert({ state: "SILENT", at: when, reason: "KIND_OFF" })).toMatch(/^Won't alert: task alerts are off/);
    expect(describeReminderAlert({ state: "SILENT", at: at(2026, 11, 17, 23, 30), reason: "QUIET_HOURS" }, { off: [], quietFrom: "22:00", quietTo: "07:00" }))
      .toBe("Won't alert: 23:30 is in your quiet hours (22:00 to 07:00).");
    expect(describeReminderAlert({ state: "SILENT", at: when, reason: "ON_THE_CLOCK" })).toBe("Won't alert: 12:00 falls during a shift of your standing rotation.");
    expect(describeReminderAlert({ state: "SILENT", at: when, reason: "CAP_FULL" }))
      .toBe("Won't alert: the day from 16:30 Mon 16 Nov already has 3 alerts that come first (shift alerts, then earlier tasks).");
    expect(describeReminderAlert({ state: "LATER", at: when })).toMatch(/^Set for 12:00 on Tue 17 Nov\. It's over four weeks away/);
  });
});
