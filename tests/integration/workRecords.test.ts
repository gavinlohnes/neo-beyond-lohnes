import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateSchedulePattern } from "../../src/application/commands";
import {
  DEFAULT_WORK_RECORD_SETTINGS, WORK_RECORD_SETTINGS_KEY, addWorkRecord, changeWorkRecord, getWorkDatesOnSchedule, getWorkDue,
  getWorkRecords, markWorkDateDone, readWorkRecordSettings, removeWorkRecord, renewCertification, restoreWorkRecord,
  trainingHoursSummary, writeWorkRecordSettings,
} from "../../src/application/workRecords";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { readTravellingSettings } from "../../src/persistence/settingsTransfer";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-WORK-RECORD-001: his work record through the real commands. Gavin's 2-2-3 rotation: Week B from Mon Nov 16
 * 2026 works Wed 18 and Thu 19; Fri 20 to Sun 22 are off. Invented data.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const MON = new Date(2026, 10, 16, 12);
const at = (d: number, h = 12) => new Date(2026, 10, d, h);
beforeEach(async () => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION); vi.setSystemTime(MON);
});
afterEach(() => { vi.useRealTimers(); });
const actions = (r: { history: { action: string }[] }) => r.history.map((h) => h.action);

describe("each kind: added, changed, removed, restored, with history", () => {
  it("training hours", async () => {
    const t = await addWorkRecord({ kind: "TRAINING", title: "Defensive tactics", date: "2026-11-16", hours: 4, note: "Mat room" }, MON);
    const c = await changeWorkRecord(t.id, { kind: "TRAINING", title: "Defensive tactics", date: "2026-11-16", hours: 4.5 }, at(16, 13));
    expect(c).toMatchObject({ hours: 4.5, status: "ACTIVE" });
    expect(c.note).toBeUndefined();
    expect(c.history[1]).toMatchObject({ action: "CHANGED", before: { hours: 4, note: "Mat room" } });
    await removeWorkRecord(t.id, at(16, 14));
    expect(trainingHoursSummary(await getWorkRecords(), MON).hours).toBe(0);
    const r = await restoreWorkRecord(t.id, at(16, 15));
    expect(actions(r)).toEqual(["ADDED", "CHANGED", "REMOVED", "RESTORED"]);
    expect(trainingHoursSummary(await getWorkRecords(), MON).line).toBe("4.5 hours this year");
    await expect(changeWorkRecord(t.id, { kind: "TRAINING", title: "x", date: "2026-11-16", hours: 0.3 })).rejects.toThrow(/quarter hours/);
    await expect(changeWorkRecord(t.id, { kind: "MILESTONE", title: "x", date: "2026-11-16", remindDays: 3 })).rejects.toThrow(/keeps its kind/);
  });

  it("a certification, renewed", async () => {
    const cpr = await addWorkRecord({ kind: "CERTIFICATION", title: "CPR card", earnedOn: "2024-12-15", expiresOn: "2027-01-05" }, MON);
    expect(cpr).toMatchObject({ remind: true, remindDays: 60, date: "2027-01-05" });
    expect((await getWorkDue(MON)).map((d) => d.text)).toEqual(["CPR card expires Jan 5, 2027, in 50 days"]);
    // Reminder down to 30 days: it leaves TODAY.
    await changeWorkRecord(cpr.id, { kind: "CERTIFICATION", title: "CPR card", earnedOn: "2024-12-15", expiresOn: "2027-01-05", remind: true, remindDays: 30 }, at(16, 13));
    expect(await getWorkDue(MON)).toEqual([]);
    await changeWorkRecord(cpr.id, { kind: "CERTIFICATION", title: "CPR card", earnedOn: "2024-12-15", expiresOn: "2027-01-05", remind: true, remindDays: 60 }, at(16, 13));
    const renewed = await renewCertification(cpr.id, "2029-01-05", at(16, 14));
    expect(renewed).toMatchObject({ expiresOn: "2029-01-05", date: "2029-01-05" });
    expect(await getWorkDue(MON)).toEqual([]);
    await removeWorkRecord(cpr.id, at(16, 15));
    expect(actions(await restoreWorkRecord(cpr.id, at(16, 16)))).toEqual(["ADDED", "CHANGED", "CHANGED", "CHANGED", "REMOVED", "RESTORED"]);
  });

  it("a court date: due from 7 days before, stays when past, drops off after DONE", async () => {
    const court = await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" }, MON);
    expect(court).toMatchObject({ remind: true, remindDays: 7 });
    expect((await getWorkDue(MON))[0]!.text).toBe("Court Saturday 9:00 AM");
    expect((await getWorkDue(at(23)))[0]).toMatchObject({ text: "Court was Nov 21 9:00 AM", clear: "DONE" });
    const done = await markWorkDateDone(court.id, at(23));
    expect(done.doneAt).toBe(at(23).toISOString());
    expect(await getWorkDue(at(23))).toEqual([]);
    // Editing a done date keeps it done.
    expect((await changeWorkRecord(court.id, { kind: "WORK_DATE", title: "Court (traffic)", date: "2026-11-21", workType: "COURT", remind: true, remindDays: 7 }, at(23, 13))).doneAt).toBe(at(23).toISOString());
    await removeWorkRecord(court.id, at(23, 14));
    await expect(markWorkDateDone(court.id)).rejects.toThrow(/isn't in your work record/);
    expect(actions(await restoreWorkRecord(court.id, at(23, 15)))).toEqual(["ADDED", "CHANGED", "CHANGED", "REMOVED", "RESTORED"]);
  });

  it("a milestone, with Remind me off", async () => {
    const mark = await addWorkRecord({ kind: "MILESTONE", title: "Two-year mark", date: "2026-12-10" }, MON);
    expect((await getWorkDue(MON))[0]!.text).toBe("Two-year mark in 24 days");
    await changeWorkRecord(mark.id, { kind: "MILESTONE", title: "Two-year mark", date: "2026-12-10", remind: false, remindDays: 30 }, at(16, 13));
    expect(await getWorkDue(MON)).toEqual([]);
    await removeWorkRecord(mark.id, at(16, 14));
    await expect(removeWorkRecord(mark.id)).rejects.toThrow();
    expect(actions(await restoreWorkRecord(mark.id, at(16, 15)))).toEqual(["ADDED", "CHANGED", "REMOVED", "RESTORED"]);
  });
});

describe("his settings", () => {
  it("defaults until he changes them; new items take his per-kind days; they travel with the backup", async () => {
    expect(readWorkRecordSettings()).toEqual(DEFAULT_WORK_RECORD_SETTINGS);
    writeWorkRecordSettings({ ...DEFAULT_WORK_RECORD_SETTINGS, goalHours: 40, yearStartMonth: 7, remindDays: { WORK_DATE: 3, CERTIFICATION: 90, MILESTONE: 10 } });
    expect((await addWorkRecord({ kind: "WORK_DATE", title: "Class", date: "2026-11-30", workType: "TRAINING_CLASS" }, MON)).remindDays).toBe(3);
    expect((await addWorkRecord({ kind: "CERTIFICATION", title: "Taser" }, MON)).remindDays).toBe(90);
    await addWorkRecord({ kind: "TRAINING", title: "Range", date: "2026-07-02", hours: 4 }, MON);
    expect(trainingHoursSummary(await getWorkRecords(), MON).line).toBe("4 of 40 hours this year, 36 to go by Jun 30");
    expect(readTravellingSettings().values[WORK_RECORD_SETTINGS_KEY]).toBeDefined();
    expect(() => writeWorkRecordSettings({ ...DEFAULT_WORK_RECORD_SETTINGS, goalHours: -1 })).toThrow(/goal/);
    localStorage.setItem(WORK_RECORD_SETTINGS_KEY, "{broken");
    expect(readWorkRecordSettings()).toEqual(DEFAULT_WORK_RECORD_SETTINGS);
  });
});

describe("on the work schedule", () => {
  it("a work date on a day off offers MARK AS WORK; it saves nothing itself, and after his CONFIRM the offer is gone", async () => {
    await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT" }, MON);
    await addWorkRecord({ kind: "WORK_DATE", title: "Class", date: "2026-11-19", workType: "TRAINING_CLASS" }, MON);
    const before = await getWorkDatesOnSchedule(MON);
    expect(before.map((x) => [x.record.title, x.day, x.offerMarkAsWork])).toEqual([["Class", "WORK", false], ["Court", "OFF", true]]);
    expect(await db.scheduleExceptions.count()).toBe(0);
    // His CONFIRM in the existing OT confirmation (what MARK AS WORK opens).
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" }, MON);
    const after = await getWorkDatesOnSchedule(MON);
    expect(after.map((x) => [x.record.title, x.day, x.offerMarkAsWork, x.confirmed?.kind ?? null])).toEqual([["Class", "WORK", false, null], ["Court", "WORK", false, "WORK"]]);
  });
});

describe("backup", () => {
  it("round-trips in a native backup; an older backup without the table imports with it empty; a malformed row is skipped", async () => {
    const court = await addWorkRecord({ kind: "WORK_DATE", title: "Court", date: "2026-11-21", workType: "COURT" }, MON);
    await changeWorkRecord(court.id, { kind: "WORK_DATE", title: "Court", date: "2026-11-21", time: "09:00", workType: "COURT", remind: true, remindDays: 7 }, at(16, 13));
    const blob = await exportNativeBackup(false);
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    await applyRestore(new File([blob], "beyond.json"));
    const [restored] = await getWorkRecords();
    expect(restored).toMatchObject({ id: court.id, time: "09:00" });
    expect(actions(restored!)).toEqual(["ADDED", "CHANGED"]);

    const raw = JSON.parse(await blob.text()) as { data: { databaseVersion: number; tables: { name: string }[]; data: { tableName: string }[] } };
    raw.data.databaseVersion = 27;
    raw.data.tables = raw.data.tables.filter((t) => t.name !== "workRecords");
    raw.data.data = raw.data.data.filter((t) => t.tableName !== "workRecords");
    await applyRestore(new File([JSON.stringify(raw)], "older.json"));
    expect(await db.workRecords.count()).toBe(0);

    await db.workRecords.put({ id: "broken", kind: "TRAINING", title: "x", status: "ACTIVE" } as never);
    await addWorkRecord({ kind: "MILESTONE", title: "Mark", date: "2026-11-20" }, MON);
    expect((await getWorkRecords()).map((r) => r.title)).toEqual(["Mark"]);
    expect((await getWorkDue(MON)).map((d) => d.text)).toEqual(["Mark in 4 days"]);
  });
});
