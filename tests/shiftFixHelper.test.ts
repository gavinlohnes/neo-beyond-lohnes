import { describe, expect, it } from "vitest";
import { interpret, parseClock, type HelperContext } from "../src/application/helper/freeHelper";

/** SHIFT-CORRECT-001: the free helper's shift phrases, pure. Sun Nov 15 2026 04:21; the day opened Sat 16:30. Invented ids. */
const iso = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const base: HelperContext = { now: new Date(2026, 10, 15, 4, 21), savedMeals: [], openTasks: [{ id: "t1", title: "Fix the fence" }], openProjects: [], routines: [] };
const marks = { dayId: "d1", dayStartedAt: iso(14, 16, 30), workDay: true, started: { eventId: "s1", at: iso(14, 18, 2) }, ended: { eventId: "e1", at: iso(15, 4, 20) } };
const ctx: HelperContext = { ...base, workMarks: marks };
const reopen = (until?: string) => ({ kind: "shift_fix", action: "reopen", day_id: "d1", mark_event_id: "e1", from_at: iso(15, 4, 20), ...(until ? { until } : {}) });

describe("parseClock", () => {
  it("reads clear clock times and refuses a bare hour", () => {
    expect(parseClock("0600")).toBe("06:00");
    expect(parseClock("06:00")).toBe("06:00");
    expect(parseClock("6am")).toBe("06:00");
    expect(parseClock("6:00 pm")).toBe("18:00");
    expect(parseClock("6")).toBeNull();
    expect(parseClock("2500")).toBeNull();
  });
});

describe("still working", () => {
  it("the screenshot phrase and its cousins reopen the recorded end", () => {
    expect(interpret("Im still working till 0600. Fix my log", ctx)).toEqual({ cards: [reopen("06:00")], unknown: [] });
    expect(interpret("still working", ctx).cards).toEqual([reopen()]);
    expect(interpret("I haven't clocked out yet", ctx).cards).toEqual([reopen()]);
    expect(interpret("I’m not off yet, working until 6am", ctx).cards).toEqual([reopen("06:00")]);
    expect(interpret("reopen my shift", ctx).cards).toEqual([reopen()]);
    expect(interpret("my shift isn't over", ctx).cards).toEqual([reopen()]);
  });
  it("never a guess: no recorded end, a day off, or 'still working on' something else", () => {
    expect(interpret("still working till 0600", { ...ctx, workMarks: { dayId: "d1", dayStartedAt: marks.dayStartedAt, workDay: true, started: marks.started } }).cards).toEqual([]);
    expect(interpret("still working till 0600", { ...ctx, workMarks: { ...marks, workDay: false } }).cards).toEqual([]);
    expect(interpret("still working on the fence", ctx).cards).toEqual([]);
    expect(interpret("still working till 0600", base).cards).toEqual([]);
  });
});

describe("moving a time", () => {
  it("got off / clocked in at a time moves that mark", () => {
    expect(interpret("I got off at 03:50", ctx).cards).toEqual([{ kind: "shift_fix", action: "move_end", day_id: "d1", mark_event_id: "e1", from_at: iso(15, 4, 20), to_at: iso(15, 3, 50) }]);
    expect(interpret("shift end was 0400", ctx).cards[0]).toMatchObject({ action: "move_end", to_at: iso(15, 4) });
    expect(interpret("clocked in at 17:45", ctx).cards).toEqual([{ kind: "shift_fix", action: "move_start", day_id: "d1", mark_event_id: "s1", from_at: iso(14, 18, 2), to_at: iso(14, 17, 45) }]);
  });
  it("an end not reached yet is a reopen; unclear times go to Alfred whole", () => {
    expect(interpret("clocked out at 0600", ctx).cards).toEqual([reopen("06:00")]);
    expect(interpret("got off at 6", ctx)).toEqual({ cards: [], unknown: ["got off at 6"] });
    expect(interpret("clocked in at 05:00", ctx)).toEqual({ cards: [], unknown: ["clocked in at 05:00"] });
    expect(interpret("got off at 04:20", ctx).cards).toEqual([]);
  });
  it("the existing work phrases are unchanged", () => {
    expect(interpret("off work", ctx).cards).toEqual([{ kind: "work_ended" }]);
    expect(interpret("at work", ctx).cards).toEqual([{ kind: "work_started" }]);
  });
});
