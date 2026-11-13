import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "dexie-export-import";
import { setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import {
  cancelScheduleException, changeScheduleException, confirmScheduleException, confirmShiftSwap, getConfirmedExceptions, moveScheduleException,
} from "../../src/application/scheduleExceptions";
import { getWeekAhead } from "../../src/application/weekAheadQueries";
import { getWeekEnergyForecast } from "../../src/application/weekEnergyForecast";
import { readOperatorContext } from "../../src/application/operatorContext";
import { answerQuestion } from "../../src/application/helper/freeAnswers";
import { deriveLifeState, lifeStateInput } from "../../src/application/lifeState";
import { getShiftWhatIf } from "../../src/application/shiftWhatIf";
import { getSchedulePattern, getWorkContextSource } from "../../src/application/queries";
import { applyAnyRestore } from "../../src/persistence/restore";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { getProgrammeView } from "../../src/application/trainingProgrammeQueries";

/**
 * SCHEDULE-EXCEPTIONS-001: confirmed future changes on Gavin's 2-2-3 rotation. Week B from Mon Nov 16 2026 works Wed 18
 * and Thu 19 (18:00–06:00); Fri 20–Sun 22 are off; Mon 23 and Tue 24 work. A lived day runs 16:30 → 16:30.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const MON = new Date(2026, 10, 16, 12);
const at = (d: number, h = 12, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION); vi.setSystemTime(MON); });
afterEach(() => { vi.useRealTimers(); });
const weekDay = async (date: string, now = MON) => (await getWeekAhead(now)).days.find((d) => d.date === date)!;
const alfred = async (now = MON) => (await readOperatorContext({ purpose: "local", includePersonal: false }, now)).records.find((r) => r.title === "Next seven scheduled days")!.text;

describe("the four actions", () => {
  it("no exceptions: the rotation is the forecast", async () => {
    expect(await weekDay("2026-11-21")).toMatchObject({ work: "OFF", basis: "PREDICTED" });
  });

  it("overtime on a scheduled day off informs every planning system, and isn't work done", async () => {
    const e = await confirmScheduleException({ date: "2026-11-21", kind: "WORK", note: "Covering for Sam" });
    expect(e).toMatchObject({ reason: "OVERTIME", status: "ACTIVE", history: [{ action: "CONFIRMED", kind: "WORK", note: "Covering for Sam" }] });
    expect(await weekDay("2026-11-21")).toMatchObject({ work: "WORK", basis: "CONFIRMED", shiftStartHour: 18 });
    expect((await getWeekEnergyForecast(MON)).days.find((d) => d.date === "2026-11-21")?.work).toBe("WORK");
    expect(await alfred()).toContain("2026-11-21 WORK 18:00 (confirmed change)");
    expect(await alfred()).toContain("Alfred cannot change the schedule.");
    expect(await answerQuestion("when do i work", at(20, 9))).toBe("Next shift: Sat, Nov 21, 18:00. A schedule change you confirmed.");
    // No lived day was started or recorded by it.
    expect(await db.beyondDays.count()).toBe(0);
  });

  it("confirmed overtime moves the training programme's rotation slot to a work slot", async () => {
    await saveTrainingProgramme({ mode: "ROTATION", slots: { WORK1: "A", WORK2: "B", WORK3: "C", OFF1: "B", OFF2: "C", OFF3: "A" } }, null);
    expect((await getProgrammeView(at(21, 17))).planned.key).toMatch(/^OFF/);
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    expect((await getProgrammeView(at(21, 17))).planned.key).toMatch(/^WORK/);
  });

  it("time off on a scheduled work day, and Life State plans around it", async () => {
    await confirmScheduleException({ date: "2026-11-23", kind: "OFF" });
    expect(await weekDay("2026-11-23", at(20))).toMatchObject({ work: "OFF", basis: "CONFIRMED", shiftStartHour: null });
    // Sun 22 would be a FLIP (back on Mon); with Mon confirmed off it is a free day, and WHY says why.
    const pattern = await getSchedulePattern();
    const sunday = deriveLifeState(lifeStateInput(at(22, 18), pattern, "OFF", "OFF", "SCHEDULE", new Map([["2026-11-23", "OFF"]])))!;
    expect(sunday.state).toBe("FREE");
    expect(sunday.why[2]).toBe("Tomorrow: a day off, a schedule change you confirmed.");
  });

  it("a shift swap changes both dates in one go, and cancels as one", async () => {
    const [work, off] = await confirmShiftSwap({ workDate: "2026-11-21", offDate: "2026-11-19" });
    expect(work!.swapId).toBe(off!.swapId);
    expect([await weekDay("2026-11-21"), await weekDay("2026-11-19")].map((d) => [d.work, d.basis])).toEqual([["WORK", "CONFIRMED"], ["OFF", "CONFIRMED"]]);
    const cancelled = await cancelScheduleException(off!.id);
    expect(cancelled.map((e) => e.status)).toEqual(["CANCELLED", "CANCELLED"]);
    expect((await weekDay("2026-11-21")).basis).toBe("PREDICTED");
    expect((await weekDay("2026-11-19")).basis).toBe("PREDICTED");
    // Nothing deleted: both rows remain with their history.
    expect((await db.scheduleExceptions.toArray()).map((e) => e.history.map((h) => h.action))).toEqual([["CONFIRMED", "CANCELLED"], ["CONFIRMED", "CANCELLED"]]);
  });

  it("a swap is all or nothing: a bad half writes neither", async () => {
    await expect(confirmShiftSwap({ workDate: "2026-11-21", offDate: "2026-11-20" })).rejects.toThrow(/EXCEPTION_SWAP_OFF_DAY/);
    await confirmScheduleException({ date: "2026-11-19", kind: "OFF" });
    await expect(confirmShiftSwap({ workDate: "2026-11-21", offDate: "2026-11-19" })).rejects.toThrow(/EXCEPTION_CONFLICT/);
    expect(await db.scheduleExceptions.count()).toBe(1);
  });

  it("editing keeps the history; moving cancels and re-confirms; cancelling returns the day to the rotation", async () => {
    const e = await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    const [edited] = await changeScheduleException(e.id, { note: "Double shift" });
    expect(edited!.history.map((h) => h.action)).toEqual(["CONFIRMED", "CHANGED"]);
    expect(edited!.note).toBe("Double shift");
    const moved = await moveScheduleException(e.id, "2026-11-22");
    expect((await db.scheduleExceptions.get(e.id))!.status).toBe("CANCELLED");
    expect(moved).toMatchObject({ date: "2026-11-22", kind: "WORK", status: "ACTIVE", note: "Double shift" });
    await cancelScheduleException(moved.id);
    expect((await weekDay("2026-11-22")).basis).toBe("PREDICTED");
    expect(await getConfirmedExceptions()).toEqual(new Map());
  });
});

describe("safeguards", () => {
  it("one confirmed change per date: a second is refused, never silently overwritten", async () => {
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    await expect(confirmScheduleException({ date: "2026-11-21", kind: "WORK" })).rejects.toThrow(/EXCEPTION_CONFLICT/);
    expect(await db.scheduleExceptions.count()).toBe(1);
  });

  it("a change that matches the rotation, a day that has started, or no saved schedule is refused", async () => {
    await expect(confirmScheduleException({ date: "2026-11-21", kind: "OFF" })).rejects.toThrow(/EXCEPTION_MATCHES_ROTATION/);
    // 16:30 boundary: Wed 18's lived day starts at 16:30.
    await expect(confirmScheduleException({ date: "2026-11-18", kind: "OFF" }, at(18, 16, 29))).resolves.toMatchObject({ date: "2026-11-18" });
    await expect(confirmScheduleException({ date: "2026-11-19", kind: "OFF" }, at(19, 16, 31))).rejects.toThrow(/EXCEPTION_DAY_STARTED/);
    await db.schedulePatterns.clear();
    await expect(confirmScheduleException({ date: "2026-11-22", kind: "WORK" })).rejects.toThrow(/EXCEPTION_NO_SCHEDULE/);
  });

  it("an edited rotation leaves confirmed changes as confirmed", async () => {
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    await updateSchedulePattern({ ...ROTATION, weeks: [{ workdays: [] }] }); // now never at work
    expect(await weekDay("2026-11-21")).toMatchObject({ work: "WORK", basis: "CONFIRMED" });
    expect(await weekDay("2026-11-23", at(20))).toMatchObject({ work: "OFF", basis: "PREDICTED" });
  });

  it("What-If stays hypothetical: it never creates or changes a confirmed change", async () => {
    await getShiftWhatIf({ date: "2026-11-21", to: "WORK" }, [], MON);
    expect(await db.scheduleExceptions.count()).toBe(0);
  });
});

describe("becoming a recorded day", () => {
  it("when the lived day starts, the confirmed change is recorded, and says where it came from", async () => {
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    vi.setSystemTime(at(21, 16, 35)); // Sat's lived day starts; the overnight shift belongs to it
    const day = await startDay();
    expect(day.workContext).toBe("WORK");
    expect(await getWorkContextSource(day.id)).toBe("SCHEDULE_EXCEPTION");
    expect(await weekDay("2026-11-21", at(21, 17))).toMatchObject({ work: "WORK", basis: "RECORDED" });
    const today = (await readOperatorContext({ purpose: "local", includePersonal: false }, at(21, 17))).records.find((r) => r.kind === "CURRENT_DAY")!.text;
    expect(today).toContain("a work day, set from a schedule change you confirmed, when the day started");
    // Still Sat's lived day at Sun 09:00.
    expect((await getWeekAhead(at(22, 9))).days[0]).toMatchObject({ date: "2026-11-22", basis: "PREDICTED" });
  });

  it("what you record on the day still wins over the confirmed change", async () => {
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    vi.setSystemTime(at(21, 16, 35));
    const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
    expect(await weekDay("2026-11-21", at(21, 17))).toMatchObject({ work: "OFF", basis: "RECORDED" });
  });
});

describe("backup and restore", () => {
  type ExportJson = Record<string, unknown> & { data: { databaseVersion: number; tables: { name: string }[]; data: { tableName: string; rows: unknown[] }[] } };
  const exportJson = async () => JSON.parse(await (await db.export()).text()) as ExportJson;
  const file = (json: ExportJson) => new File([JSON.stringify(json)], "backup.json", { type: "application/json" });

  it("a new backup keeps confirmed changes, with their history", async () => {
    const e = await confirmScheduleException({ date: "2026-11-21", kind: "WORK", note: "Covering" });
    await changeScheduleException(e.id, { note: "Covering for Sam" });
    const backup = await exportJson();
    await db.scheduleExceptions.clear();
    await applyAnyRestore(file(backup));
    const [restored] = await db.scheduleExceptions.toArray();
    expect(restored).toMatchObject({ id: e.id, date: "2026-11-21", kind: "WORK", note: "Covering for Sam" });
    expect(restored!.history.map((h) => h.action)).toEqual(["CONFIRMED", "CHANGED"]);
  });

  it("a backup from before this schema still restores, with no confirmed changes (replace-only)", async () => {
    const backup = await exportJson();
    const older: ExportJson = { ...backup, data: { ...backup.data, databaseVersion: 25, tables: backup.data.tables.filter((t) => t.name !== "scheduleExceptions"), data: backup.data.data.filter((t) => t.tableName !== "scheduleExceptions") } };
    await confirmScheduleException({ date: "2026-11-21", kind: "WORK" });
    await applyAnyRestore(file(older));
    expect(await db.scheduleExceptions.count()).toBe(0);
    expect((await getSchedulePattern()).weeks).toEqual(ROTATION.weeks);
  });
});
