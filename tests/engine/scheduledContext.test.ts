import { describe, expect, it } from "vitest";
import { deriveScheduledContext, DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { SchedulePattern } from "../../src/domain/common/types";

// All dates constructed with the local Date constructor (year, monthIndex,
// day, hour, minute) deliberately — see scheduledContext.ts's own note on
// why this keeps results consistent regardless of the runner's timezone.
function at(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

const DEFAULT = DEFAULT_SCHEDULE_PATTERN;

describe("deriveScheduledContext — week alternation (DEFAULT_SCHEDULE_PATTERN)", () => {
  it("the anchor week (Mon Aug 17 - Sun Aug 23 2026) is Week A", () => {
    for (const day of [17, 18, 19, 20, 21, 22, 23]) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).week).toBe("A");
    }
  });

  it("the following week (Mon Aug 24 - Sun Aug 30 2026) is Week B", () => {
    for (const day of [24, 25, 26, 27, 28, 29, 30]) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).week).toBe("B");
    }
  });

  it("alternation continues correctly two weeks out (Mon Aug 31 2026 is Week A again)", () => {
    expect(deriveScheduledContext(at(2026, 8, 31, 10), DEFAULT).week).toBe("A");
  });

  it("alternation is correct going backward from the anchor too (Mon Aug 10 2026 is Week B)", () => {
    expect(deriveScheduledContext(at(2026, 8, 10, 10), DEFAULT).week).toBe("B");
  });

  it("Sunday->Monday rotation boundary: Sun Aug 23 (end of Week A) into Mon Aug 24 (start of Week B)", () => {
    expect(deriveScheduledContext(at(2026, 8, 23, 10), DEFAULT).week).toBe("A");
    expect(deriveScheduledContext(at(2026, 8, 23, 23, 59), DEFAULT).week).toBe("A");
    expect(deriveScheduledContext(at(2026, 8, 24, 0, 0), DEFAULT).week).toBe("B");
  });

  it("Sunday->Monday rotation boundary the following cycle: Sun Aug 30 (end of Week B) into Mon Aug 31 (start of Week A)", () => {
    expect(deriveScheduledContext(at(2026, 8, 30, 10), DEFAULT).week).toBe("B");
    expect(deriveScheduledContext(at(2026, 8, 31, 0, 0), DEFAULT).week).toBe("A");
  });
});

describe("deriveScheduledContext — work day sets per week", () => {
  it("Week A work days are Mon/Tue/Fri/Sat/Sun; Wed/Thu are not", () => {
    const workDays = [17, 18, 21, 22, 23]; // Mon Tue Fri Sat Sun
    const offDays = [19, 20]; // Wed Thu
    for (const day of workDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).todayIsScheduledWorkDay).toBe(true);
    }
    for (const day of offDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).todayIsScheduledWorkDay).toBe(false);
    }
  });

  it("Week B work days are Wed/Thu only", () => {
    const workDays = [26, 27]; // Wed Thu (week of Aug 24)
    const offDays = [24, 25, 28, 29, 30]; // Mon Tue Fri Sat Sun
    for (const day of workDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).todayIsScheduledWorkDay).toBe(true);
    }
    for (const day of offDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10), DEFAULT).todayIsScheduledWorkDay).toBe(false);
    }
  });
});

describe("deriveScheduledContext — overnight shift boundary (18:00-06:00)", () => {
  it("before 18:00 on a work day is PRE_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 17, 59), DEFAULT).phase).toBe("PRE_WORK"); // Friday
  });

  it("exactly 18:00 on a work day starts SCHEDULED_SHIFT", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 18, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
  });

  it("late evening on a work day is still SCHEDULED_SHIFT", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 23, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
  });

  it("crosses midnight into the next calendar day and stays SCHEDULED_SHIFT", () => {
    // Friday's shift continues into Saturday's early morning.
    expect(deriveScheduledContext(at(2026, 8, 22, 0, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 8, 22, 5, 59), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
  });

  it("exactly 06:00 the next morning ends SCHEDULED_SHIFT and starts EXPECTED_POST_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 22, 6, 0), DEFAULT).phase).toBe("EXPECTED_POST_WORK");
  });

  it("mid-morning after a night shift is EXPECTED_POST_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 22, 8, 0), DEFAULT).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 11, 59), DEFAULT).phase).toBe("EXPECTED_POST_WORK");
  });

  it("consecutive work days (Fri->Sat in Week A): noon transitions from EXPECTED_POST_WORK to PRE_WORK for the next shift", () => {
    // Saturday is also a scheduled work day in Week A.
    expect(deriveScheduledContext(at(2026, 8, 22, 12, 0), DEFAULT).phase).toBe("PRE_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 17, 59), DEFAULT).phase).toBe("PRE_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 18, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
  });

  it("transition into a non-work day (Tue->Wed in Week A): afternoon is plain OFF, not PRE_WORK", () => {
    // Tuesday Aug 18 is a work day; Wednesday Aug 19 is not, in Week A.
    expect(deriveScheduledContext(at(2026, 8, 19, 8, 0), DEFAULT).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 19, 15, 0), DEFAULT).phase).toBe("OFF");
  });

  it("a non-work day with no adjacent shift on either side is plain OFF all day", () => {
    // Wednesday Aug 19 -> Thursday Aug 20: both off in Week A, no shift touches Thursday at all.
    expect(deriveScheduledContext(at(2026, 8, 20, 9, 0), DEFAULT).phase).toBe("OFF");
    expect(deriveScheduledContext(at(2026, 8, 20, 20, 0), DEFAULT).phase).toBe("OFF");
  });

  it("Week B's consecutive Wed/Thu work days show the same back-to-back pattern", () => {
    // Week of Aug 24: Wed Aug 26, Thu Aug 27 are both work days in Week B.
    expect(deriveScheduledContext(at(2026, 8, 26, 19, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 8, 27, 3, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT"); // Wed's shift tail
    expect(deriveScheduledContext(at(2026, 8, 27, 9, 0), DEFAULT).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 27, 14, 0), DEFAULT).phase).toBe("PRE_WORK"); // gearing up for Thu's own shift
    expect(deriveScheduledContext(at(2026, 8, 27, 19, 0), DEFAULT).phase).toBe("SCHEDULED_SHIFT"); // Thu's own shift
    expect(deriveScheduledContext(at(2026, 8, 28, 9, 0), DEFAULT).phase).toBe("EXPECTED_POST_WORK"); // Fri morning, Thu's tail
    expect(deriveScheduledContext(at(2026, 8, 28, 15, 0), DEFAULT).phase).toBe("OFF"); // Fri is not a Week B work day
  });
});

describe("deriveScheduledContext — purity", () => {
  it("the same (now, pattern) always produces the same output (no hidden state, no side effects)", () => {
    const input = at(2026, 8, 21, 19, 30);
    const first = deriveScheduledContext(input, DEFAULT);
    const second = deriveScheduledContext(input, DEFAULT);
    expect(second).toEqual(first);
  });
});

describe("deriveScheduledContext — genuinely data-driven, not a disguised hardcode (Drop 02a)", () => {
  // A deliberately different pattern from DEFAULT_SCHEDULE_PATTERN: swapped
  // workday sets, a same-day (non-overnight) shift, and a later anchor. If
  // the deriver secretly still consulted the old hardcoded constants
  // anywhere, these assertions would fail against DEFAULT's expectations
  // instead of this pattern's.
  const CUSTOM: SchedulePattern = {
    id: "current",
    anchorMonday: "2026-09-07", // a different Monday than DEFAULT's anchor
    weeks: [
      { workdays: [3, 4] }, // this pattern's Week A: Wed, Thu
      { workdays: [1, 2, 5, 6, 0] }, // this pattern's Week B: Mon, Tue, Fri, Sat, Sun
    ],
    shiftStartHour: 9,
    shiftEndHour: 17, // same-day shift, does not cross midnight
    postWorkTailHours: 2,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  it("uses the custom pattern's own workday sets, not DEFAULT's", () => {
    // Wed Sep 9 2026 is CUSTOM Week A's workday, and would be OFF under DEFAULT.
    expect(deriveScheduledContext(at(2026, 9, 9, 10), CUSTOM).todayIsScheduledWorkDay).toBe(true);
    // Mon Sep 7 2026 is CUSTOM Week A's non-workday (Week A here is Wed/Thu only).
    expect(deriveScheduledContext(at(2026, 9, 7, 10), CUSTOM).todayIsScheduledWorkDay).toBe(false);
  });

  it("uses the custom pattern's own anchor for week alternation", () => {
    expect(deriveScheduledContext(at(2026, 9, 7, 10), CUSTOM).week).toBe("A");
    expect(deriveScheduledContext(at(2026, 9, 14, 10), CUSTOM).week).toBe("B");
  });

  it("a same-day (non-overnight) shift is entered and exited on the same calendar day", () => {
    // Wed Sep 9 is a CUSTOM work day, shift 09:00-17:00.
    expect(deriveScheduledContext(at(2026, 9, 9, 8, 59), CUSTOM).phase).toBe("PRE_WORK");
    expect(deriveScheduledContext(at(2026, 9, 9, 9, 0), CUSTOM).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 9, 9, 16, 59), CUSTOM).phase).toBe("SCHEDULED_SHIFT");
    // 17:00 same day: shift has ended; no overnight tail to still be "in" (unlike the overnight default).
    expect(deriveScheduledContext(at(2026, 9, 9, 17, 0), CUSTOM).phase).toBe("OFF");
  });

  it("editing shift times changes the derived phase for the same instant", () => {
    const laterShift: SchedulePattern = { ...CUSTOM, shiftStartHour: 10, shiftEndHour: 18 };
    expect(deriveScheduledContext(at(2026, 9, 9, 9, 30), CUSTOM).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 9, 9, 9, 30), laterShift).phase).toBe("PRE_WORK");
  });

  it("editing which weekdays are worked changes the derived todayIsScheduledWorkDay for the same instant", () => {
    const withoutWednesday: SchedulePattern = { ...CUSTOM, weeks: [{ workdays: [4] }, CUSTOM.weeks[1]!] };
    expect(deriveScheduledContext(at(2026, 9, 9, 10), CUSTOM).todayIsScheduledWorkDay).toBe(true);
    expect(deriveScheduledContext(at(2026, 9, 9, 10), withoutWednesday).todayIsScheduledWorkDay).toBe(false);
  });

  it("changing the current rotation alignment (anchor) flips which week today falls in", () => {
    const shiftedByOneWeek: SchedulePattern = { ...CUSTOM, anchorMonday: "2026-09-14" };
    expect(deriveScheduledContext(at(2026, 9, 7, 10), CUSTOM).week).toBe("A");
    expect(deriveScheduledContext(at(2026, 9, 7, 10), shiftedByOneWeek).week).toBe("B");
  });
});
