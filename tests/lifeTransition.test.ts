import { describe, expect, it } from "vitest";
import { deriveLifeState, lifeStateInput, type DayKind } from "../src/application/lifeState";
import { deriveLifeMoment, lifeMomentInput, yesterdaysState, type LifeMomentInput } from "../src/application/lifeTransition";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { SchedulePattern } from "../src/domain/common/types";

/** LIFE-STATE-002: the moments between slice 1's states, named only when both sides are known. */
const side = (scheduled: DayKind | null, recorded: DayKind | null = null) => ({ recorded, scheduled });
const moment = (dayBefore: DayKind | null, yesterday: DayKind | null, today: DayKind | null, tomorrow: DayKind | null) => {
  const input: LifeMomentInput = {
    state: { today: side(today), yesterday: side(yesterday), tomorrow: { scheduled: tomorrow, date: new Date(2026, 10, 20, 16, 30) }, run: null },
    dayBefore: side(dayBefore), shiftStartHour: 18,
  };
  return deriveLifeMoment(input, deriveLifeState(input.state));
};

describe("deriveLifeMoment", () => {
  it("names each moment", () => {
    expect(moment("OFF", "OFF", "WORK", "WORK")?.moment).toBe("RUN_STARTS");
    expect(moment("OFF", "WORK", "WORK", "OFF")?.moment).toBe("LAST_SHIFT");
    expect(moment("WORK", "WORK", "OFF", "OFF")?.moment).toBe("RUN_OVER");
    expect(moment("OFF", "OFF", "OFF", "WORK")?.line).toBe("Back on shift tomorrow at 18:00.");
    expect(moment("WORK", "OFF", "OFF", "OFF")?.moment).toBe("FREE_AGAIN");
  });
  it("says nothing in the middle of a state", () => {
    expect(moment("WORK", "WORK", "WORK", "WORK")).toBeNull(); // mid-run
    expect(moment("OFF", "OFF", "OFF", "OFF")).toBeNull(); // mid free days
  });
  it("a one-shift run starts and ends the same day", () => {
    expect(moment("OFF", "OFF", "WORK", "OFF")).toMatchObject({ moment: "RUN_STARTS", line: "A one-shift run: it starts and ends today. Recovery starts tomorrow." });
  });
  it("only run-over offers a follow-up, a light day; the rest are words only", () => {
    expect(moment("WORK", "WORK", "OFF", "OFF")?.followUp).toEqual({ title: "Keep today light", description: "From the end of your run: the first day off after it." });
    for (const m of [moment("OFF", "OFF", "WORK", "WORK"), moment("OFF", "WORK", "WORK", "OFF"), moment("OFF", "OFF", "OFF", "WORK"), moment("WORK", "OFF", "OFF", "OFF")]) expect(m?.followUp).toBeNull();
  });
  it("with yesterday unknown, it won't claim a run started", () => {
    expect(moment(null, null, "WORK", "WORK")).toBeNull();
  });
  it("yesterday's state uses slice 1's own rule", () => {
    const input: LifeMomentInput = { state: { today: side("OFF"), yesterday: side("OFF", "WORK"), tomorrow: { scheduled: "OFF", date: new Date() }, run: null }, dayBefore: side("OFF"), shiftStartHour: 18 };
    expect(yesterdaysState(input)).toBe("WORK_RUN"); // recorded work wins over a scheduled day off
  });
  it("calm words only", () => {
    for (const m of [moment("OFF", "OFF", "WORK", "WORK"), moment("OFF", "WORK", "WORK", "OFF"), moment("WORK", "WORK", "OFF", "OFF"), moment("OFF", "OFF", "OFF", "WORK"), moment("WORK", "OFF", "OFF", "OFF")]) {
      expect(m!.line).not.toMatch(/\b(should|must|need to|failed|behind|streak|score|recovered)\b/i);
    }
  });
});

describe("on Gavin's 2-2-3 rotation", () => {
  const pattern: SchedulePattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-05T00:00:00.000Z" };
  const at = (d: number) => new Date(2026, 10, d, 18);
  const momentOn = (d: number) => { const s = lifeStateInput(at(d), pattern, null, null); return deriveLifeMoment(lifeMomentInput(at(d), pattern, s, null), deriveLifeState(s))?.moment ?? null; };
  it("walks week B: run starts, last shift, run over, free days, flip day", () => {
    expect([18, 19, 20, 21, 22, 23].map(momentOn)).toEqual(["RUN_STARTS", "LAST_SHIFT", "RUN_OVER", "FREE_AGAIN", "FLIP_BEGINS", "RUN_STARTS"]);
  });
});
