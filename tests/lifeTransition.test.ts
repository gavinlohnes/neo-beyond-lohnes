import { describe, expect, it } from "vitest";
import { deriveLifeState, lifeStateInput, type DayKind } from "../src/application/lifeState";
import { deriveLifeMoment, lifeMomentInput, livedDayDates, whenFrom, yesterdaysState, type LifeMomentInput } from "../src/application/lifeTransition";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { SchedulePattern } from "../src/domain/common/types";

/** LIFE-STATE-002: the moments between slice 1's states, named only when both sides are known. */
const side = (scheduled: DayKind | null, recorded: DayKind | null = null) => ({ recorded, scheduled });
// Fri Nov 20 2026 at 17:00, inside a lived day whose shift (if any) runs 18:00 → 06:00; the next lived day's too.
const NOW = new Date(2026, 10, 20, 17);
const shift = (d: number) => ({ start: new Date(2026, 10, d, 18), end: new Date(2026, 10, d + 1, 6) });
const moment = (dayBefore: DayKind | null, yesterday: DayKind | null, today: DayKind | null, tomorrow: DayKind | null, now = NOW) => {
  const input: LifeMomentInput = {
    state: { today: side(today), yesterday: side(yesterday), tomorrow: { scheduled: tomorrow, date: new Date(2026, 10, 21, 16, 30) }, run: null },
    dayBefore: side(dayBefore), now, todayShift: today === "WORK" ? shift(20) : null, nextShift: tomorrow === "WORK" ? shift(21) : null,
  };
  return deriveLifeMoment(input, deriveLifeState(input.state));
};

describe("deriveLifeMoment", () => {
  it("names each moment", () => {
    expect(moment("OFF", "OFF", "WORK", "WORK")?.moment).toBe("RUN_STARTS");
    expect(moment("OFF", "WORK", "WORK", "OFF")?.moment).toBe("LAST_SHIFT");
    expect(moment("WORK", "WORK", "OFF", "OFF")?.moment).toBe("RUN_OVER");
    expect(moment("OFF", "OFF", "OFF", "WORK")?.line).toBe("Back on shift tomorrow at 18:00.");
    expect(moment("OFF", "OFF", "WORK", "WORK")?.line).toBe("The run starts tonight at 18:00.");
    expect(moment("OFF", "WORK", "WORK", "OFF")?.line).toBe("The last shift of the run. Recovery starts after it ends at 06:00.");
    expect(moment("WORK", "WORK", "OFF", "OFF")?.line).toBe("The run is over. This is the first day off.");
    expect(moment("WORK", "OFF", "OFF", "OFF")?.moment).toBe("FREE_AGAIN");
  });
  it("says nothing in the middle of a state", () => {
    expect(moment("WORK", "WORK", "WORK", "WORK")).toBeNull(); // mid-run
    expect(moment("OFF", "OFF", "OFF", "OFF")).toBeNull(); // mid free days
  });
  it("a one-shift run starts and ends the same day", () => {
    expect(moment("OFF", "OFF", "WORK", "OFF")).toMatchObject({ moment: "RUN_STARTS", line: "A one-shift run. The run starts tonight at 18:00. Recovery starts after it ends at 06:00." });
  });
  it("only run-over offers a follow-up, a light day; the rest are words only", () => {
    expect(moment("WORK", "WORK", "OFF", "OFF")?.followUp).toEqual({ title: "Keep today light", description: "From the end of your run: the first day off after it." });
    for (const m of [moment("OFF", "OFF", "WORK", "WORK"), moment("OFF", "WORK", "WORK", "OFF"), moment("OFF", "OFF", "OFF", "WORK"), moment("WORK", "OFF", "OFF", "OFF")]) expect(m?.followUp).toBeNull();
  });
  it("with yesterday unknown, it won't claim a run started", () => {
    expect(moment(null, null, "WORK", "WORK")).toBeNull();
  });
  it("yesterday's state uses slice 1's own rule", () => {
    const input: LifeMomentInput = { state: { today: side("OFF"), yesterday: side("OFF", "WORK"), tomorrow: { scheduled: "OFF", date: new Date() }, run: null }, dayBefore: side("OFF"), now: NOW, todayShift: null, nextShift: null };
    expect(yesterdaysState(input)).toBe("WORK_RUN"); // recorded work wins over a scheduled day off
  });
  it("calm words only", () => {
    for (const m of [moment("OFF", "OFF", "WORK", "WORK"), moment("OFF", "WORK", "WORK", "OFF"), moment("WORK", "WORK", "OFF", "OFF"), moment("OFF", "OFF", "OFF", "WORK"), moment("WORK", "OFF", "OFF", "OFF")]) {
      expect(m!.line).not.toMatch(/\b(should|must|need to|failed|behind|streak|score|recovered)\b/i);
    }
  });
});

describe("review of #495: the words follow the clock, not the calendar day", () => {
  it("after midnight a lived day's shift is tonight, done, or tomorrow, as it really is", () => {
    // Still Fri's lived day at Sat 02:00: the shift is under way.
    expect(moment("OFF", "OFF", "WORK", "WORK", new Date(2026, 10, 21, 2))?.line).toBe("This is the first shift of the run.");
    // Sat 08:00: the first shift is done.
    expect(moment("OFF", "OFF", "WORK", "WORK", new Date(2026, 10, 21, 8))?.line).toBe("The first shift of the run is done.");
    expect(moment("OFF", "WORK", "WORK", "OFF", new Date(2026, 10, 21, 8))?.line).toBe("The run's last shift is done. Recovery starts this evening.");
    // A flip day's lived day at Sat 08:00: the next shift (Sat 18:00) is tonight, not tomorrow.
    expect(moment("OFF", "OFF", "OFF", "WORK", new Date(2026, 10, 21, 8))?.line).toBe("Back on shift tonight at 18:00.");
  });
  it("whenFrom", () => {
    expect(whenFrom(new Date(2026, 10, 21, 8), new Date(2026, 10, 21, 18))).toBe("tonight at 18:00");
    expect(whenFrom(new Date(2026, 10, 21, 8), new Date(2026, 10, 21, 9, 30))).toBe("today at 09:30");
    expect(whenFrom(new Date(2026, 10, 20, 17), new Date(2026, 10, 21, 18))).toBe("tomorrow at 18:00");
    expect(whenFrom(new Date(2026, 10, 20, 17), new Date(2026, 10, 23, 18))).toBe("Mon at 18:00");
  });
  it("a lived day covers two calendar dates", () => {
    expect(livedDayDates(new Date(2026, 10, 20, 20))).toEqual(["2026-11-20", "2026-11-21"]);
    expect(livedDayDates(new Date(2026, 10, 21, 9))).toEqual(["2026-11-20", "2026-11-21"]);
  });
});

describe("on Gavin's 2-2-3 rotation", () => {
  const pattern: SchedulePattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-05T00:00:00.000Z" };
  const at = (d: number) => new Date(2026, 10, d, 18);
  const momentOn = (d: number) => { const s = lifeStateInput(at(d), pattern, null, null); return deriveLifeMoment(lifeMomentInput(at(d), pattern, s, null), deriveLifeState(s))?.moment ?? null; };
  it("walks week B: run starts, last shift, run over, free days, flip day", () => {
    expect([18, 19, 20, 21, 22, 23].map(momentOn)).toEqual(["RUN_STARTS", "LAST_SHIFT", "RUN_OVER", "FREE_AGAIN", "FLIP_BEGINS", "RUN_STARTS"]);
  });
  it("the next morning still reads its own lived day, in clock words (review of #495)", () => {
    const lineAt = (d: Date) => { const st = lifeStateInput(d, pattern, null, null); return deriveLifeMoment(lifeMomentInput(d, pattern, st, null), deriveLifeState(st))?.line; };
    expect(lineAt(new Date(2026, 10, 23, 8))).toBe("Back on shift tonight at 18:00."); // Sun's flip day, Mon morning
    expect(lineAt(new Date(2026, 10, 20, 8))).toBe("The run's last shift is done. Recovery starts this evening."); // Thu's last shift, Fri morning
    expect(lineAt(new Date(2026, 10, 19, 8))).toBe("The first shift of the run is done."); // Wed's first shift, Thu morning
  });
});
