import { describe, expect, it } from "vitest";
import { deriveShiftWhatIf, shiftWhatIf } from "../../src/application/shiftWhatIf";
import { deriveWeekAhead, type WeekTasksDay } from "../../src/application/weekAheadQueries";
import type { GoogleCalendarEvent } from "../../src/application/googleCalendar";
import type { SchedulePattern } from "../../src/domain/common/types";
import type { PictureRow } from "../../src/application/wholePictureProjection";

/** BIG-IDEAS-001 item 1. Invented runs only: 4-shift runs then 3 days off, repeated. */
const row = (context: "WORK" | "OFF", energy?: number, sleepHours?: number) => ({ context, energy, sleepHours, start: "x", dayIds: [] }) as unknown as PictureRow;
const cycle = (lastEnergy: number, off1: number, off2: number) => [row("WORK", 4), row("WORK", 3), row("WORK", 3), row("WORK", lastEnergy), row("OFF", 3, off1), row("OFF", 4, off2), row("OFF", 4, 8)];

describe("shift what-if", () => {
  it("looks only at complete runs of exactly that length and says what followed, with counts", () => {
    const rows = [row("OFF", 3, 8), ...cycle(2, 9, 7), ...cycle(2, 10, 8), ...cycle(1, 11, 7), row("WORK", 3), row("WORK", 3), row("OFF", 4, 7)];
    const w = shiftWhatIf(rows, 4);
    expect(w).toMatchObject({ shifts: 4, runs: 3, enough: true });
    expect(w.lastShiftEnergy).toEqual({ mean: 5 / 3, days: 3 });
    expect(w.offDay1Sleep).toEqual({ mean: 10, days: 3 });
    expect(w.offDay2Sleep.days).toBe(3);
  });

  it("says nothing it can't support: too few comparable runs, or a run still going", () => {
    expect(shiftWhatIf([row("OFF"), ...cycle(2, 9, 7)], 4)).toMatchObject({ runs: 1, enough: false, lastShiftEnergy: { mean: undefined, days: 1 } });
    // A WORK run at the very start may be clipped by the history window, so it never counts.
    expect(shiftWhatIf([...cycle(2, 9, 7)], 4).runs).toBe(0);
    expect(shiftWhatIf([row("WORK", 3), row("WORK", 3), row("WORK", 3), row("WORK", 3)], 4).runs).toBe(0);
  });

  it("never takes a run's length from one an unrecorded day cuts short", () => {
    const unknown = { ...row("OFF"), context: "UNKNOWN" } as unknown as PictureRow;
    // Only 5-shift runs were worked; in each, the first day was never opened, leaving 4 recorded shifts.
    const cut = () => [unknown, row("WORK", 4), row("WORK", 3), row("WORK", 3), row("WORK", 2), row("OFF", 3, 9), row("OFF", 4, 8)];
    expect(shiftWhatIf([row("OFF"), ...cut(), ...cut(), ...cut()], 4).runs).toBe(0);
    // The same runs with every day recorded still count.
    expect(shiftWhatIf([row("OFF"), ...cycle(2, 9, 7), ...cycle(2, 10, 8), ...cycle(1, 11, 7)], 4).runs).toBe(3);
  });
});

describe("SHIFT-WHAT-IF: flipping one Week Ahead day", () => {
  // Gavin's rotation, Week A from Mon Oct 26: Mon, Tue work; Wed, Thu off; Fri–Sun work; Week B Mon, Tue off.
  const pattern: SchedulePattern = { id: "current", anchorMonday: "2026-08-17", weeks: [{ workdays: [1, 2, 5, 6, 0] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6, createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z" };
  const now = new Date(2026, 9, 26, 9);
  const local = (iso: string) => new Date(iso).getTime();
  const three = [row("WORK", 3), row("WORK", 3), row("WORK", 2), row("OFF", 3, 9), row("OFF", 4, 8)];
  const history = [row("OFF", 3, 8), ...three, ...three, ...three];
  const base = { now, pattern, firstTemplate: "A" as const, rows: history, tasks: [], events: [] };

  it("reads the saved schedule exactly as Week Ahead does", () => {
    const week = deriveWeekAhead(now, pattern, "A").days;
    for (const day of week) {
      const to = day.work === "WORK" ? "OFF" : "WORK";
      expect(deriveShiftWhatIf({ ...base, change: { date: day.date, to } })?.from).toBe(day.work);
    }
  });

  it("picking up day off 1: a longer run, a shorter break, a shorter window to sleep, and what your 3-shift runs looked like", () => {
    const tasks = [{ date: "2026-10-28", planned: [{ id: "o1", title: "Dentist" }], due: [] }] as unknown as WeekTasksDay[];
    const events: GoogleCalendarEvent[] = [
      { id: "e1", title: "Dinner", start: new Date(2026, 9, 28, 20).toISOString(), end: new Date(2026, 9, 28, 21).toISOString(), allDay: false, calendar: "primary" },
      { id: "e2", title: "Early call", start: new Date(2026, 9, 29, 5).toISOString(), end: new Date(2026, 9, 29, 5, 30).toISOString(), allDay: false, calendar: "primary" },
      { id: "e3", title: "Coffee", start: new Date(2026, 9, 29, 10).toISOString(), end: new Date(2026, 9, 29, 11).toISOString(), allDay: false, calendar: "primary" },
    ];
    const w = deriveShiftWhatIf({ ...base, tasks, events, change: { date: "2026-10-28", to: "WORK" } })!;
    expect(w.from).toBe("OFF");
    expect(local(w.shift.start)).toBe(new Date(2026, 9, 28, 18).getTime());
    expect(local(w.shift.end)).toBe(new Date(2026, 9, 29, 6).getTime());
    expect(w.run.before).toMatchObject({ from: "2026-10-26", to: "2026-10-27", days: 2, clipped: false });
    expect(w.run.after).toMatchObject({ from: "2026-10-26", to: "2026-10-28", days: 3 });
    expect(w.recovery.before).toMatchObject({ from: "2026-10-28", to: "2026-10-29", days: 2 });
    expect(w.recovery.after).toMatchObject({ from: "2026-10-29", to: "2026-10-29", days: 1 });
    expect(w.sleepWindow.before.hours).toBe(60);
    expect(w.sleepWindow.after.hours).toBe(36);
    expect(local(w.sleepWindow.after.from!)).toBe(new Date(2026, 9, 29, 6).getTime());
    expect(w.history.after).toMatchObject({ shifts: 3, runs: 3, enough: true });
    expect(w.history.after!.offDay1Sleep.mean).toBe(9);
    expect(w.history.before).toMatchObject({ shifts: 2, runs: 0, enough: false });
    // Tuesday is no longer the run's last shift, so its after-shift workout moves.
    expect(w.training.find((t) => t.date === "2026-10-27")).toMatchObject({ beforeAfterShift: true, after: null });
    expect(w.training.find((t) => t.date === "2026-10-28")).toMatchObject({ afterAfterShift: true });
    expect(w.commitments).toEqual([
      { kind: "PLANNED", title: "Dentist", date: "2026-10-28", duringShift: false },
      { kind: "CALENDAR", title: "Dinner", date: "2026-10-28", duringShift: true },
      { kind: "CALENDAR", title: "Early call", date: "2026-10-29", duringShift: true },
    ]);
  });

  it("dropping a run's first shift: a shorter run, a longer break and a longer window to sleep", () => {
    const w = deriveShiftWhatIf({ ...base, change: { date: "2026-10-30", to: "OFF" } })!;
    expect(w.from).toBe("WORK");
    expect(w.run.before).toMatchObject({ from: "2026-10-30", to: "2026-11-01", days: 3 });
    expect(w.run.after).toMatchObject({ from: "2026-10-31", to: "2026-11-01", days: 2 });
    expect(w.recovery.before).toMatchObject({ from: "2026-11-02", days: 2 });
    expect(w.recovery.after).toMatchObject({ from: "2026-10-28", to: "2026-10-30", days: 3 });
    expect(w.sleepWindow.before.hours).toBe(12);
    expect(w.sleepWindow.after.hours).toBe(84);
    expect(w.history.before).toMatchObject({ shifts: 3, runs: 3, enough: true });
  });

  it("a day shift picked up stays on its own day, as the Engine assigns it", () => {
    // Review of #474: Mon–Fri 07:00–19:00. A picked-up Sat holds Sat 07–19, so the window after it runs to Mon 07:00.
    const days: SchedulePattern = { ...pattern, anchorMonday: "2026-10-26", weeks: [{ workdays: [1, 2, 3, 4, 5] }], shiftStartHour: 7, shiftEndHour: 19 };
    const w = deriveShiftWhatIf({ ...base, pattern: days, change: { date: "2026-10-31", to: "WORK" } })!;
    expect(local(w.shift.start)).toBe(new Date(2026, 9, 31, 7).getTime());
    expect(local(w.shift.end)).toBe(new Date(2026, 9, 31, 19).getTime());
    expect(local(w.sleepWindow.after.from!)).toBe(new Date(2026, 9, 31, 19).getTime());
    expect(local(w.sleepWindow.after.to!)).toBe(new Date(2026, 10, 2, 7).getTime());
    // And a scheduled weekday's shift is the one the Engine gives that lived day.
    const fri = deriveShiftWhatIf({ ...base, pattern: days, change: { date: "2026-10-30", to: "OFF" } })!;
    expect(local(fri.shift.start)).toBe(new Date(2026, 9, 30, 7).getTime());
  });

  it("answers only real changes to the next seven days", () => {
    expect(deriveShiftWhatIf({ ...base, change: { date: "2026-10-26", to: "WORK" } })).toBeNull();
    expect(deriveShiftWhatIf({ ...base, change: { date: "2026-11-02", to: "WORK" } })).toBeNull();
    expect(deriveShiftWhatIf({ ...base, change: { date: "2026-10-25", to: "WORK" } })).toBeNull();
  });
});
