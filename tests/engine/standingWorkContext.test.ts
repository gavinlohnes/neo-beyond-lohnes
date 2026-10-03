import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCHEDULE_PATTERN,
  deriveStandingWorkContext,
  isOperatorSavedSchedule,
  scheduledWorkContextForLivedDay,
} from "../../src/engine/scheduledContext";
import { nextRolloverBoundaryAfter } from "../../src/engine/dayRollover";
import type { SchedulePattern } from "../../src/domain/common/types";

/**
 * DROP 0 — standing schedule (owner ruling 2026-10-03). The owner's real
 * schedule: Week A works Mon/Tue/Fri/Sat/Sun, Week B works Wed/Thu,
 * 18:00–06:00. DEFAULT_SCHEDULE_PATTERN anchors Week A at Mon Aug 17 2026,
 * so Oct 5–11 2026 is Week B and Oct 12–18 is Week A.
 */
const SAVED: SchedulePattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-02T19:00:00.000Z" };

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);

describe("scheduledWorkContextForLivedDay", () => {
  it("a 16:30 day on a Week A work day owns that evening's 18:00 shift", () => {
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 12, 16, 30), SAVED)).toBe("WORK"); // Mon, Week A
  });

  it("a 16:30 day on a Week A day off is OFF", () => {
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 14, 16, 30), SAVED)).toBe("OFF"); // Wed, Week A
  });

  it("Week B flips the pattern: Wednesday works, Monday is off", () => {
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 7, 16, 30), SAVED)).toBe("WORK"); // Wed, Week B
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 5, 16, 30), SAVED)).toBe("OFF"); // Mon, Week B
  });

  it("a day started at 03:00 owns the shift it began inside (the previous evening's)", () => {
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 13, 3, 0), SAVED)).toBe("WORK"); // Mon 18:00 shift, Week A
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 15, 3, 0), SAVED)).toBe("OFF"); // Wed is off in Week A
  });

  it("a day started after the shift ended and before 16:30 holds no shift, so it is OFF", () => {
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 13, 10, 0), SAVED)).toBe("OFF");
  });

  it("the Sunday shift crosses into a Week B Monday and still counts", () => {
    // Sun Oct 18 (Week A, works) 18:00 → Mon Oct 19 06:00.
    expect(scheduledWorkContextForLivedDay(at(2026, 10, 19, 2, 0), SAVED)).toBe("WORK");
  });
});

describe("isOperatorSavedSchedule", () => {
  it("is false for the seeded default and true once the operator has saved it", () => {
    expect(isOperatorSavedSchedule(DEFAULT_SCHEDULE_PATTERN)).toBe(false);
    expect(isOperatorSavedSchedule(SAVED)).toBe(true);
  });
});

describe("deriveStandingWorkContext", () => {
  it("is CLEAR from a saved schedule with no correction this lived day", () => {
    expect(
      deriveStandingWorkContext({ dayStartedAt: at(2026, 10, 12, 16, 30), pattern: SAVED, manualCorrectionEarlierThisLivedDay: false }),
    ).toEqual({ clear: true, workContext: "WORK" });
    expect(
      deriveStandingWorkContext({ dayStartedAt: at(2026, 10, 14, 16, 30), pattern: SAVED, manualCorrectionEarlierThisLivedDay: false }),
    ).toEqual({ clear: true, workContext: "OFF" });
  });

  it("is UNCLEAR when only the seeded default exists", () => {
    expect(
      deriveStandingWorkContext({
        dayStartedAt: at(2026, 10, 12, 16, 30),
        pattern: DEFAULT_SCHEDULE_PATTERN,
        manualCorrectionEarlierThisLivedDay: false,
      }),
    ).toEqual({ clear: false, reason: "SCHEDULE_NOT_SAVED" });
  });

  it("is UNCLEAR when the operator already corrected the work context earlier this lived day", () => {
    expect(
      deriveStandingWorkContext({ dayStartedAt: at(2026, 10, 12, 22, 0), pattern: SAVED, manualCorrectionEarlierThisLivedDay: true }),
    ).toEqual({ clear: false, reason: "CORRECTED_THIS_LIVED_DAY" });
  });
});

describe("nextRolloverBoundaryAfter", () => {
  it("is today's 16:30 before it, and tomorrow's at or after it", () => {
    expect(nextRolloverBoundaryAfter(at(2026, 10, 3, 9, 0))).toEqual(at(2026, 10, 3, 16, 30));
    expect(nextRolloverBoundaryAfter(at(2026, 10, 3, 16, 30))).toEqual(at(2026, 10, 4, 16, 30));
    expect(nextRolloverBoundaryAfter(at(2026, 10, 3, 23, 59))).toEqual(at(2026, 10, 4, 16, 30));
  });

  it("stays at 16:30 local across the end of daylight saving", () => {
    // US DST ends Sun Nov 1 2026; the boundary is built from calendar parts, never a fixed offset.
    const next = nextRolloverBoundaryAfter(at(2026, 10, 31, 17, 0));
    expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([1, 16, 30]);
  });
});
