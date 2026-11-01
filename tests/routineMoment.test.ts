import { expect, it } from "vitest";
import { DEFAULT_SCHEDULE_PATTERN, livedDayShiftWindow } from "../src/engine/scheduledContext";
import { predictedWorkPhase } from "../src/ui/screens/today/shiftClock";
import { routineMomentFor } from "../src/application/routineCommands";

/** UX-POLISH-001, review of #361 (B1/B2): the undeclared-day fallback follows the lived day's own shift, live. */
const moment = (livedDayStart: Date, now: Date) => {
  const shiftWindow = livedDayShiftWindow(livedDayStart, DEFAULT_SCHEDULE_PATTERN);
  const input = { now, workContext: "UNKNOWN" as const, shiftWindow, workEnded: false, mainSleepLogged: false, shiftDownDone: false };
  return routineMomentFor({ phase: null, predictedPhase: predictedWorkPhase(input), workContext: "UNKNOWN", workStarted: false, workEnded: false });
};

it("shows nothing on a scheduled day off, even on the morning of a calendar work day", () => {
  // Default pattern: the week of Nov 2 2026 is week B (Wed and Thu). Tue Nov 3's lived day is a day off.
  const tuesdayOff = new Date(2026, 10, 3, 16, 30);
  expect(moment(tuesdayOff, new Date(2026, 10, 4, 9, 0))).toBeNull();
  expect(moment(tuesdayOff, new Date(2026, 10, 4, 15, 0))).toBeNull();
});

it("on a scheduled work day, follows the live clock through the shift", () => {
  const wednesday = new Date(2026, 10, 4, 16, 30);
  expect(moment(wednesday, new Date(2026, 10, 4, 16, 45))).toBe("BEFORE_SHIFT");
  expect(moment(wednesday, new Date(2026, 10, 4, 19, 0))).toBe("ON_SHIFT");
  expect(moment(wednesday, new Date(2026, 10, 5, 7, 0))).toBe("AFTER_SHIFT");
});
