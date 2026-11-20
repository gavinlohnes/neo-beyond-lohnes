import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE_PATTERN, earlyDayStartBoundary, livedDayShiftWindow } from "../../src/engine/scheduledContext";

/**
 * EARLY-DAY-START-001 (Gavin, 2026-11-20): a START DAY tap between the post-shift tail and 16:30 opens the 16:30
 * day early. Local Date constructors keep these independent of the runner's timezone.
 */
const at = (h: number, m = 0, day = 14) => new Date(2026, 10, day, h, m);
const boundary = (day = 14) => new Date(2026, 10, day, 16, 30);

describe("earlyDayStartBoundary", () => {
  it("opens at shift end plus the post-work tail (06:00 + 6 h = 12:00) and closes at 16:30", () => {
    expect(earlyDayStartBoundary(at(11, 59), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
    expect(earlyDayStartBoundary(at(12, 0), DEFAULT_SCHEDULE_PATTERN)).toEqual(boundary());
    expect(earlyDayStartBoundary(at(15, 5), DEFAULT_SCHEDULE_PATTERN)).toEqual(boundary());
    expect(earlyDayStartBoundary(at(16, 29), DEFAULT_SCHEDULE_PATTERN)).toEqual(boundary());
    expect(earlyDayStartBoundary(at(16, 30), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
    expect(earlyDayStartBoundary(at(22, 0), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
    expect(earlyDayStartBoundary(at(2, 0), DEFAULT_SCHEDULE_PATTERN)).toBeNull();
  });

  it("follows the saved schedule rather than a fixed clock time", () => {
    const later = { ...DEFAULT_SCHEDULE_PATTERN, shiftEndHour: 7, postWorkTailHours: 7 }; // opens 14:00
    expect(earlyDayStartBoundary(at(13, 59), later)).toBeNull();
    expect(earlyDayStartBoundary(at(14, 0), later)).toEqual(boundary());
  });

  it("has no window when the tail runs to 16:30 or later (a day shift), so START DAY is unchanged", () => {
    const dayShift = { ...DEFAULT_SCHEDULE_PATTERN, shiftStartHour: 6, shiftEndHour: 18, postWorkTailHours: 6 };
    expect(earlyDayStartBoundary(at(15, 0), dayShift)).toBeNull();
    const tailToBoundary = { ...DEFAULT_SCHEDULE_PATTERN, shiftEndHour: 10, postWorkTailHours: 6.5 };
    expect(earlyDayStartBoundary(at(16, 0), tailToBoundary)).toBeNull();
  });

  it("the day it opens owns that evening's shift (Week A Saturday, 18:00)", () => {
    const opened = earlyDayStartBoundary(at(15, 5), DEFAULT_SCHEDULE_PATTERN)!;
    expect(livedDayShiftWindow(opened, DEFAULT_SCHEDULE_PATTERN)).toEqual({ start: at(18, 0), end: new Date(2026, 10, 15, 6, 0) });
  });

  it("is pure: the same inputs give the same answer", () => {
    expect(earlyDayStartBoundary(at(15, 5), DEFAULT_SCHEDULE_PATTERN)).toEqual(earlyDayStartBoundary(at(15, 5), DEFAULT_SCHEDULE_PATTERN));
  });
});
