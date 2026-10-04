import { describe, expect, it } from "vitest";
import {
  MAX_PHASE_ROWS,
  TOOLS_ORDER,
  deriveShiftClockPhase,
  deriveShiftClockView,
  describeCountdown,
  describeFuel,
  describePhaseHeading,
  describePlannedWorkout,
  describeToolsSummary,
  formatCountdown,
  mainSleepEndsPostShift,
  type ShiftClockInput,
} from "../../src/ui/screens/today/shiftClock";
import { DEFAULT_SCHEDULE_PATTERN, livedDayShiftWindow } from "../../src/engine/scheduledContext";

/**
 * Drop 2 — Shift Clock layout policy. The owner's schedule (18:00–06:00,
 * Week A works Mon/Tue/Fri/Sat/Sun): Mon Oct 12 2026 is a Week A work day,
 * Wed Oct 14 a day off. The work lived day starts at Mon 16:30.
 */
const at = (d: number, h: number, min = 0, s = 0) => new Date(2026, 9, d, h, min, s, 0);
const WORK_DAY_START = at(12, 16, 30);
const WINDOW = livedDayShiftWindow(WORK_DAY_START, DEFAULT_SCHEDULE_PATTERN)!;

function input(now: Date, partial: Partial<ShiftClockInput> = {}): ShiftClockInput {
  return { now, workContext: "WORK", shiftWindow: WINDOW, workEnded: false, mainSleepLogged: false, ...partial };
}

describe("the lived day's shift window", () => {
  it("is Mon 18:00 → Tue 06:00 for the day that starts Mon 16:30", () => {
    expect(WINDOW).toEqual({ start: at(12, 18), end: at(13, 6) });
  });

  it("is null on a scheduled day off", () => {
    expect(livedDayShiftWindow(at(14, 16, 30), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
  });
});

describe("deriveShiftClockPhase — boundaries", () => {
  it("16:30 → 18:00 is PRE_WORK", () => {
    expect(deriveShiftClockPhase(input(at(12, 16, 30)))).toBe("PRE_WORK");
    expect(deriveShiftClockPhase(input(at(12, 17, 59, 59)))).toBe("PRE_WORK");
  });

  it("18:00 → 06:00 is SCHEDULED_SHIFT, across midnight", () => {
    expect(deriveShiftClockPhase(input(at(12, 18, 0)))).toBe("SCHEDULED_SHIFT");
    expect(deriveShiftClockPhase(input(at(13, 0, 30)))).toBe("SCHEDULED_SHIFT");
    expect(deriveShiftClockPhase(input(at(13, 5, 59, 59)))).toBe("SCHEDULED_SHIFT");
  });

  it("from 06:00 it is EXPECTED_POST_WORK until main sleep is logged — past the old 6-hour tail too", () => {
    expect(deriveShiftClockPhase(input(at(13, 6, 0)))).toBe("EXPECTED_POST_WORK");
    expect(deriveShiftClockPhase(input(at(13, 14, 0)))).toBe("EXPECTED_POST_WORK");
    expect(deriveShiftClockPhase(input(at(13, 14, 0), { mainSleepLogged: true }))).toBe("OFF");
  });

  it("MARK WORK ENDED starts post-shift early", () => {
    expect(deriveShiftClockPhase(input(at(13, 4, 0), { workEnded: true }))).toBe("EXPECTED_POST_WORK");
  });

  it("a declared day off is OFF whatever the clock says", () => {
    expect(deriveShiftClockPhase(input(at(12, 19), { workContext: "OFF" }))).toBe("OFF");
  });

  it("a WORK day the schedule doesn't cover shows the on-shift rows, with no countdown", () => {
    const view = deriveShiftClockView(input(at(14, 20), { shiftWindow: null }));
    expect(view.phase).toBe("SCHEDULED_SHIFT");
    expect(view.countdown).toBeNull();
  });

  it("an unanswered day takes no phase from the schedule's prediction", () => {
    expect(deriveShiftClockPhase(input(at(12, 19), { workContext: "UNKNOWN" }))).toBeNull();
  });
});

describe("deriveShiftClockView — rows and TOOLS", () => {
  it("lays out each phase exactly as briefed", () => {
    expect(deriveShiftClockView(input(at(12, 17))).rows).toEqual(["TONIGHT", "FUEL"]);
    expect(deriveShiftClockView(input(at(12, 22))).rows).toEqual(["QUICK_LOG", "FUEL"]);
    expect(deriveShiftClockView(input(at(13, 7))).rows).toEqual(["SHIFT_DOWN", "CHECK_IN", "WORKOUT", "MAIN_SLEEP"]);
    expect(deriveShiftClockView(input(at(14, 17), { workContext: "OFF", shiftWindow: null })).rows).toEqual(["CHECK_IN", "WORKOUT"]);
    expect(deriveShiftClockView(input(at(12, 17), { workContext: "UNKNOWN" })).rows).toEqual(["WORK_QUESTION", "CHECK_IN", "WORKOUT"]);
  });

  it(`never shows more than ${MAX_PHASE_ROWS} rows, in any phase or state`, () => {
    for (const workContext of ["WORK", "OFF", "UNKNOWN"] as const) {
      for (const workEnded of [false, true]) {
        for (const mainSleepLogged of [false, true]) {
          for (let hour = 0; hour < 48; hour++) {
            const view = deriveShiftClockView(input(new Date(WORK_DAY_START.getTime() + hour * 30 * 60_000), { workContext, workEnded, mainSleepLogged }));
            expect(view.rows.length).toBeLessThanOrEqual(MAX_PHASE_ROWS);
          }
        }
      }
    }
  });

  it("puts every other tool behind TOOLS — nothing dropped, nothing shown twice", () => {
    for (const now of [at(12, 17), at(12, 22), at(13, 7)]) {
      const view = deriveShiftClockView(input(now));
      const shown = new Set<string>([...view.rows, ...view.tools]);
      for (const tool of TOOLS_ORDER) expect(shown.has(tool)).toBe(true);
      expect(view.tools.some((t) => (view.rows as string[]).includes(t))).toBe(false);
    }
    // Fuel lives in TOOLS on a day off; check-in lives there before and during the shift.
    expect(deriveShiftClockView(input(at(14, 17), { workContext: "OFF", shiftWindow: null })).tools).toContain("FUEL");
    expect(deriveShiftClockView(input(at(12, 17))).tools).toContain("CHECK_IN");
    expect(deriveShiftClockView(input(at(13, 7))).tools).not.toContain("SHIFT_DOWN");
  });
});

describe("countdown", () => {
  it("counts to the shift start, then flips to the shift end exactly at 18:00", () => {
    const before = deriveShiftClockView(input(at(12, 16, 40)));
    expect(describeCountdown(before.countdown!, at(12, 16, 40))).toBe("Shift in 1h 20m");
    const lastMinute = deriveShiftClockView(input(at(12, 17, 59, 30)));
    expect(describeCountdown(lastMinute.countdown!, at(12, 17, 59, 30))).toBe("Shift in 1m");
    const atStart = deriveShiftClockView(input(at(12, 18, 0)));
    expect(describeCountdown(atStart.countdown!, at(12, 18, 0))).toBe("Shift ends in 12h");
    const late = deriveShiftClockView(input(at(13, 5, 15)));
    expect(describeCountdown(late.countdown!, at(13, 5, 15))).toBe("Shift ends in 45m");
  });

  it("has nothing to count after the shift or on a day off", () => {
    expect(deriveShiftClockView(input(at(13, 7))).countdown).toBeNull();
    expect(deriveShiftClockView(input(at(14, 17), { workContext: "OFF", shiftWindow: null })).countdown).toBeNull();
  });

  it("formats hours and minutes, rounding up so it never reads 0m", () => {
    expect(formatCountdown(80 * 60_000)).toBe("1h 20m");
    expect(formatCountdown(2 * 60 * 60_000)).toBe("2h");
    expect(formatCountdown(10_000)).toBe("1m");
    expect(formatCountdown(0)).toBe("1m");
  });
});

describe("mainSleepEndsPostShift", () => {
  it("only counts a main sleep recorded after the shift was over", () => {
    expect(mainSleepEndsPostShift([at(13, 14).toISOString()], null, WINDOW)).toBe(true);
    // Woke after 16:30: the morning's sleep landed on the NEW work day, before its shift — it must not end anything.
    const nextWindow = livedDayShiftWindow(at(13, 16, 30), DEFAULT_SCHEDULE_PATTERN)!;
    expect(mainSleepEndsPostShift([at(13, 16, 45).toISOString()], null, nextWindow)).toBe(false);
  });

  it("uses MARK WORK ENDED when recorded, and needs one of the two", () => {
    expect(mainSleepEndsPostShift([at(13, 5).toISOString()], at(13, 4).toISOString(), WINDOW)).toBe(true);
    expect(mainSleepEndsPostShift([at(13, 5).toISOString()], null, null)).toBe(false);
  });
});

describe("copy", () => {
  it("shows a Time-Fit duration only when there is one", () => {
    expect(describePlannedWorkout("B", "STANDARD", 48)).toBe("B · STANDARD · ~48 min");
    expect(describePlannedWorkout("B", "STANDARD", undefined)).toBe("B · STANDARD");
  });

  it("shows protein against its target, and water as a plain total (no water target exists)", () => {
    expect(describeFuel(62, 180, 30)).toBe("Protein 62 / 180 g · Water 30 oz");
    expect(describeFuel(62, undefined, 30)).toBe("Protein 62 g · Water 30 oz");
  });

  it("names each phase's rows", () => {
    expect(describePhaseHeading("PRE_WORK", "WORK")).toBe("Before shift");
    expect(describePhaseHeading("SCHEDULED_SHIFT", "WORK")).toBe("On shift");
    expect(describePhaseHeading("EXPECTED_POST_WORK", "WORK")).toBe("After shift");
    expect(describePhaseHeading("OFF", "OFF")).toBe("Day off");
    expect(describePhaseHeading("OFF", "WORK")).toBe("After sleep");
    expect(describePhaseHeading(null, "UNKNOWN")).toBe("Today");
  });

  it("summarizes what TOOLS holds", () => {
    expect(describeToolsSummary(["CHECK_IN", "RESET", "CAPTURE"])).toBe("Check-in, reset, capture");
  });
});

describe("Soak fix 2026-10-04: a completed SHIFT DOWN steps aside", () => {
  it("after the shift, a done SHIFT DOWN leaves the rows and is still in TOOLS", () => {
    const before = deriveShiftClockView(input(at(13, 7)));
    expect(before.rows[0]).toBe("SHIFT_DOWN");
    const after = deriveShiftClockView({ ...input(at(13, 7)), shiftDownDone: true });
    expect(after.rows).not.toContain("SHIFT_DOWN");
    expect(after.tools).toContain("SHIFT_DOWN");
  });
});
