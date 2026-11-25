import { describe, expect, it } from "vitest";
import {
  trainingYear, workDueItems, workDueLine, workRecordProblem, yearlyHoursLine, yearlyTrainingHours, dayWords, type WorkRecord,
} from "../src/domain/workRecords";

/** GRAYSON-WORK-RECORD-001: the pure words, windows and totals. Thu Nov 26 2026 is "today". Invented data. */
const TODAY = "2026-11-26";
let n = 0;
const rec = (f: Partial<WorkRecord> & Pick<WorkRecord, "kind" | "title">): WorkRecord => ({
  id: `r${++n}`, status: "ACTIVE", history: [{ at: "2026-11-01T12:00:00.000Z", action: "ADDED" }], createdAt: `2026-11-01T12:00:0${n % 10}.000Z`, updatedAt: "2026-11-01T12:00:00.000Z", ...f,
});

describe("due on TODAY", () => {
  it("a court date shows from 7 days before, names the day and time, and waits for DONE once past", () => {
    const court = rec({ kind: "WORK_DATE", title: "Court", date: "2026-12-03", time: "09:00", workType: "COURT", remind: true, remindDays: 7 });
    expect(workDueItems([court], "2026-11-25")).toEqual([]);
    expect(workDueLine(workDueItems([court], TODAY))).toBe("Court Thursday, Dec 3 9:00 AM");
    expect(workDueLine(workDueItems([court], "2026-11-30"))).toBe("Court Thursday 9:00 AM");
    expect(workDueLine(workDueItems([court], "2026-12-02"))).toBe("Court tomorrow 9:00 AM");
    expect(workDueLine(workDueItems([court], "2026-12-03"))).toBe("Court today 9:00 AM");
    const past = workDueItems([court], "2026-12-04");
    expect(past[0]).toMatchObject({ text: "Court was Dec 3 9:00 AM", clear: "DONE" });
    expect(workDueItems([{ ...court, doneAt: "2026-12-04T12:00:00.000Z" }], "2026-12-04")).toEqual([]);
  });

  it("a certification shows inside its window until renewed; its words say expires or expired", () => {
    const cpr = rec({ kind: "CERTIFICATION", title: "CPR card", expiresOn: "2026-12-17", date: "2026-12-17", remind: true, remindDays: 60 });
    expect(workDueLine(workDueItems([cpr], TODAY))).toBe("CPR card expires Dec 17, in 21 days");
    expect(workDueItems([{ ...cpr, remindDays: 20 }], TODAY)).toEqual([]);
    expect(workDueLine(workDueItems([cpr], "2026-12-20"))).toBe("CPR card expired Dec 17");
    expect(workDueItems([{ ...cpr, expiresOn: "2028-12-17" }], "2026-12-20")).toEqual([]);
    const { expiresOn: _e, ...noExpiry } = cpr;
    expect(workDueItems([noExpiry], TODAY)).toEqual([]);
  });

  it("a milestone shows in its window until its day; Remind me off, removed items and training never show", () => {
    const mark = rec({ kind: "MILESTONE", title: "Two-year mark", date: "2027-01-09", remind: true, remindDays: 30 });
    expect(workDueItems([mark], "2026-12-09")).toEqual([]);
    expect(workDueLine(workDueItems([mark], "2026-12-10"))).toBe("Two-year mark in 30 days");
    expect(workDueLine(workDueItems([mark], "2027-01-09"))).toBe("Two-year mark today");
    expect(workDueItems([mark], "2027-01-10")).toEqual([]);
    expect(workDueItems([{ ...mark, remind: false }], "2026-12-20")).toEqual([]);
    expect(workDueItems([{ ...mark, status: "REMOVED" }], "2026-12-20")).toEqual([]);
    expect(workDueItems([rec({ kind: "TRAINING", title: "Firearms", date: TODAY, hours: 4 })], TODAY)).toEqual([]);
  });

  it("nearest date first, with +N more inside the one line", () => {
    const a = rec({ kind: "MILESTONE", title: "Two-year mark", date: "2026-12-20", remind: true, remindDays: 30 });
    const b = rec({ kind: "WORK_DATE", title: "Court", date: "2026-11-30", workType: "COURT", remind: true, remindDays: 7 });
    const c = rec({ kind: "CERTIFICATION", title: "CPR card", expiresOn: "2026-12-10", remind: true, remindDays: 60 });
    const items = workDueItems([a, b, c], TODAY);
    expect(items.map((i) => i.record.title)).toEqual(["Court", "CPR card", "Two-year mark"]);
    expect(workDueLine(items)).toBe("Court Monday · +2 more");
    expect(workDueLine([])).toBeNull();
  });
});

describe("training hours", () => {
  const t = (date: string, hours: number) => rec({ kind: "TRAINING", title: "In-service", date, hours });
  it("counts the training year from Jan 1, or from the month he picks, across the year start", () => {
    const rows = [t("2025-12-30", 2), t("2026-01-02", 4), t("2026-06-30", 1.5), t("2026-07-01", 3), t("2026-11-20", 0.25)];
    expect(trainingYear(TODAY, 1)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
    expect(yearlyTrainingHours(rows, TODAY, 1)).toBe(8.75);
    expect(trainingYear(TODAY, 7)).toEqual({ start: "2026-07-01", end: "2027-06-30" });
    expect(yearlyTrainingHours(rows, TODAY, 7)).toBe(3.25);
    expect(trainingYear("2026-03-01", 7)).toEqual({ start: "2025-07-01", end: "2026-06-30" });
    expect(yearlyTrainingHours(rows, "2026-03-01", 7)).toBe(7.5);
    expect(yearlyTrainingHours([{ ...t("2026-05-01", 9), status: "REMOVED" }], TODAY, 1)).toBe(0);
  });

  it("with a goal: 'N of G hours this year, X to go by <end>'; without: 'N hours this year'", () => {
    expect(yearlyHoursLine(4, 40, TODAY, 1)).toBe("4 of 40 hours this year, 36 to go by Dec 31");
    expect(yearlyHoursLine(26, null, TODAY, 1)).toBe("26 hours this year");
    expect(yearlyHoursLine(1, null, TODAY, 1)).toBe("1 hour this year");
    expect(yearlyHoursLine(44, 40, TODAY, 7)).toBe("44 of 40 hours this year, 0 to go by Jun 30");
    expect(yearlyHoursLine(2.5, 40, TODAY, 1)).toBe("2.5 of 40 hours this year, 37.5 to go by Dec 31");
  });
});

describe("checks", () => {
  it("refuses an empty title, a missing date, hours off the quarter, and reminder days out of range", () => {
    expect(workRecordProblem({ kind: "WORK_DATE", title: " ", date: TODAY, workType: "COURT", remindDays: 7 })).toMatch(/short title, like Court/);
    expect(workRecordProblem({ kind: "MILESTONE", title: "Mark", remindDays: 7 })).toBe("Pick a date.");
    expect(workRecordProblem({ kind: "TRAINING", title: "Range", date: TODAY, hours: 1.1 })).toMatch(/quarter hours/);
    expect(workRecordProblem({ kind: "TRAINING", title: "Range", date: TODAY, hours: 1.25 })).toBeNull();
    expect(workRecordProblem({ kind: "CERTIFICATION", title: "CPR", remindDays: 400 })).toMatch(/0 to 365/);
    expect(workRecordProblem({ kind: "CERTIFICATION", title: "CPR", earnedOn: "2026-02-01", expiresOn: "2026-01-01", remindDays: 60 })).toMatch(/before the date you earned/);
    expect(workRecordProblem({ kind: "CERTIFICATION", title: "CPR", remindDays: 60 })).toBeNull();
  });
  it("day words", () => {
    expect(dayWords("2026-11-20", TODAY)).toBe("Nov 20");
    expect(dayWords("2027-01-09", TODAY)).toBe("Saturday, Jan 9, 2027");
  });
});
