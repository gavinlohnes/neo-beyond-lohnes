import { describe, expect, it } from "vitest";
import { deriveScheduledContext } from "../../src/engine/scheduledContext";

// All dates constructed with the local Date constructor (year, monthIndex,
// day, hour, minute) deliberately — see scheduledContext.ts's own note on
// why this keeps results consistent regardless of the runner's timezone.
function at(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

describe("deriveScheduledContext — week alternation", () => {
  it("the anchor week (Mon Aug 17 - Sun Aug 23 2026) is Week A", () => {
    for (const day of [17, 18, 19, 20, 21, 22, 23]) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).week).toBe("A");
    }
  });

  it("the following week (Mon Aug 24 - Sun Aug 30 2026) is Week B", () => {
    for (const day of [24, 25, 26, 27, 28, 29, 30]) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).week).toBe("B");
    }
  });

  it("alternation continues correctly two weeks out (Mon Aug 31 2026 is Week A again)", () => {
    expect(deriveScheduledContext(at(2026, 8, 31, 10)).week).toBe("A");
  });

  it("alternation is correct going backward from the anchor too (Mon Aug 10 2026 is Week B)", () => {
    expect(deriveScheduledContext(at(2026, 8, 10, 10)).week).toBe("B");
  });
});

describe("deriveScheduledContext — work day sets per week", () => {
  it("Week A work days are Mon/Tue/Fri/Sat/Sun; Wed/Thu are not", () => {
    const workDays = [17, 18, 21, 22, 23]; // Mon Tue Fri Sat Sun
    const offDays = [19, 20]; // Wed Thu
    for (const day of workDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).todayIsScheduledWorkDay).toBe(true);
    }
    for (const day of offDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).todayIsScheduledWorkDay).toBe(false);
    }
  });

  it("Week B work days are Wed/Thu only", () => {
    const workDays = [26, 27]; // Wed Thu (week of Aug 24)
    const offDays = [24, 25, 28, 29, 30]; // Mon Tue Fri Sat Sun
    for (const day of workDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).todayIsScheduledWorkDay).toBe(true);
    }
    for (const day of offDays) {
      expect(deriveScheduledContext(at(2026, 8, day, 10)).todayIsScheduledWorkDay).toBe(false);
    }
  });
});

describe("deriveScheduledContext — overnight shift boundary (18:00-06:00)", () => {
  it("before 18:00 on a work day is PRE_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 17, 59)).phase).toBe("PRE_WORK"); // Friday
  });

  it("exactly 18:00 on a work day starts SCHEDULED_SHIFT", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 18, 0)).phase).toBe("SCHEDULED_SHIFT");
  });

  it("late evening on a work day is still SCHEDULED_SHIFT", () => {
    expect(deriveScheduledContext(at(2026, 8, 21, 23, 0)).phase).toBe("SCHEDULED_SHIFT");
  });

  it("crosses midnight into the next calendar day and stays SCHEDULED_SHIFT", () => {
    // Friday's shift continues into Saturday's early morning.
    expect(deriveScheduledContext(at(2026, 8, 22, 0, 0)).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 8, 22, 5, 59)).phase).toBe("SCHEDULED_SHIFT");
  });

  it("exactly 06:00 the next morning ends SCHEDULED_SHIFT and starts EXPECTED_POST_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 22, 6, 0)).phase).toBe("EXPECTED_POST_WORK");
  });

  it("mid-morning after a night shift is EXPECTED_POST_WORK", () => {
    expect(deriveScheduledContext(at(2026, 8, 22, 8, 0)).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 11, 59)).phase).toBe("EXPECTED_POST_WORK");
  });

  it("consecutive work days (Fri->Sat in Week A): noon transitions from EXPECTED_POST_WORK to PRE_WORK for the next shift", () => {
    // Saturday is also a scheduled work day in Week A.
    expect(deriveScheduledContext(at(2026, 8, 22, 12, 0)).phase).toBe("PRE_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 17, 59)).phase).toBe("PRE_WORK");
    expect(deriveScheduledContext(at(2026, 8, 22, 18, 0)).phase).toBe("SCHEDULED_SHIFT");
  });

  it("transition into a non-work day (Tue->Wed in Week A): afternoon is plain OFF, not PRE_WORK", () => {
    // Tuesday Aug 18 is a work day; Wednesday Aug 19 is not, in Week A.
    expect(deriveScheduledContext(at(2026, 8, 19, 8, 0)).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 19, 15, 0)).phase).toBe("OFF");
  });

  it("a non-work day with no adjacent shift on either side is plain OFF all day", () => {
    // Wednesday Aug 19 -> Thursday Aug 20: both off in Week A, no shift touches Thursday at all.
    expect(deriveScheduledContext(at(2026, 8, 20, 9, 0)).phase).toBe("OFF");
    expect(deriveScheduledContext(at(2026, 8, 20, 20, 0)).phase).toBe("OFF");
  });

  it("Week B's consecutive Wed/Thu work days show the same back-to-back pattern", () => {
    // Week of Aug 24: Wed Aug 26, Thu Aug 27 are both work days in Week B.
    expect(deriveScheduledContext(at(2026, 8, 26, 19, 0)).phase).toBe("SCHEDULED_SHIFT");
    expect(deriveScheduledContext(at(2026, 8, 27, 3, 0)).phase).toBe("SCHEDULED_SHIFT"); // Wed's shift tail
    expect(deriveScheduledContext(at(2026, 8, 27, 9, 0)).phase).toBe("EXPECTED_POST_WORK");
    expect(deriveScheduledContext(at(2026, 8, 27, 14, 0)).phase).toBe("PRE_WORK"); // gearing up for Thu's own shift
    expect(deriveScheduledContext(at(2026, 8, 27, 19, 0)).phase).toBe("SCHEDULED_SHIFT"); // Thu's own shift
    expect(deriveScheduledContext(at(2026, 8, 28, 9, 0)).phase).toBe("EXPECTED_POST_WORK"); // Fri morning, Thu's tail
    expect(deriveScheduledContext(at(2026, 8, 28, 15, 0)).phase).toBe("OFF"); // Fri is not a Week B work day
  });
});

describe("deriveScheduledContext — purity", () => {
  it("the same input always produces the same output (no hidden state, no side effects)", () => {
    const input = at(2026, 8, 21, 19, 30);
    const first = deriveScheduledContext(input);
    const second = deriveScheduledContext(input);
    expect(second).toEqual(first);
  });
});
