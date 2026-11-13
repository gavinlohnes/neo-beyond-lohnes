import { describe, expect, it } from "vitest";
import { deriveLifeState, lifeStateInput, type LifeStateInput } from "../src/application/lifeState";
import { DEFAULT_SCHEDULE_PATTERN } from "../src/engine/scheduledContext";
import type { SchedulePattern } from "../src/domain/common/types";

/** LIFE-STATE-001: the four states from recorded and scheduled work/off only. */
const side = (recorded: "WORK" | "OFF" | null, scheduled: "WORK" | "OFF" | null) => ({ recorded, scheduled });
const input = (today: ReturnType<typeof side>, yesterday: ReturnType<typeof side>, tomorrow: "WORK" | "OFF" | null): LifeStateInput =>
  ({ today, yesterday, tomorrow: { scheduled: tomorrow, date: new Date(2026, 10, 14, 16, 30) }, run: null });

describe("deriveLifeState", () => {
  it("names each state", () => {
    expect(deriveLifeState(input(side(null, "WORK"), side(null, "OFF"), "WORK"))?.state).toBe("WORK_RUN");
    expect(deriveLifeState(input(side(null, "OFF"), side(null, "WORK"), "OFF"))?.state).toBe("RECOVERY");
    expect(deriveLifeState(input(side(null, "OFF"), side(null, "OFF"), "WORK"))?.state).toBe("FLIP");
    expect(deriveLifeState(input(side(null, "OFF"), side(null, "OFF"), "OFF"))?.state).toBe("FREE");
  });
  it("a single day off between runs is recovery: the first sleep after a run comes first", () => {
    const r = deriveLifeState(input(side(null, "OFF"), side(null, "WORK"), "WORK"))!;
    expect(r.state).toBe("RECOVERY");
    expect(r.line).toMatch(/Back on tomorrow\.$/);
  });
  it("what you recorded wins over the schedule, for today and yesterday", () => {
    // Scheduled to work, but recorded as a day off after a recorded shift.
    expect(deriveLifeState(input(side("OFF", "WORK"), side("WORK", "OFF"), "OFF"))?.state).toBe("RECOVERY");
    // Picked up a shift on a scheduled day off.
    expect(deriveLifeState(input(side("WORK", "OFF"), side(null, "OFF"), "OFF"))?.state).toBe("WORK_RUN");
    // Yesterday was scheduled off but recorded as work.
    const r = deriveLifeState(input(side(null, "OFF"), side("WORK", "OFF"), "OFF"))!;
    expect(r.state).toBe("RECOVERY");
    expect(r.why[1]).toBe("Yesterday: recorded as a work day.");
  });
  it("says nothing when today can't be known, and degrades without a schedule", () => {
    expect(deriveLifeState(input(side(null, null), side(null, null), null))).toBeNull();
    // Recorded off, nothing else known: free.
    expect(deriveLifeState(input(side("OFF", null), side(null, null), null))?.state).toBe("FREE");
  });
  it("describes the day and never prescribes, and says where it came from", () => {
    for (const r of [input(side(null, "WORK"), side(null, "OFF"), "WORK"), input(side(null, "OFF"), side(null, "WORK"), "OFF"), input(side(null, "OFF"), side(null, "OFF"), "WORK"), input(side(null, "OFF"), side(null, "OFF"), "OFF")].map(deriveLifeState)) {
      expect(r!.line).not.toMatch(/\b(should|must|need to|failed|behind|streak|score)\b/i);
      expect(r!.why.at(-1)).toBe("This describes the day. BEYOND's advice still comes from your check-in.");
    }
  });
});

describe("lifeStateInput on Gavin's 2-2-3 rotation", () => {
  // DEFAULT_SCHEDULE_PATTERN, anchor Mon 2026-08-17: week A works Mon, Tue, Fri, Sat, Sun; week B works Wed, Thu.
  const pattern: SchedulePattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-10-05T00:00:00.000Z" }; // saved by the operator
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h);
  const state = (now: Date) => deriveLifeState(lifeStateInput(now, pattern, null, null))?.state;
  it("walks a run and the days off after it", () => {
    const days = Array.from({ length: 14 }, (_, i) => at(2026, 7, 18 + i, 18)); // from 18:00, inside each lived day
    const states = days.map(state);
    const kinds = days.map((d) => lifeStateInput(d, pattern, null, null).today.scheduled);
    // Every work day is a run day; every day off is recovery, flip or free by its neighbours.
    states.forEach((s, i) => {
      if (kinds[i] === "WORK") expect(s).toBe("WORK_RUN");
      else if (kinds[i - 1] === "WORK" || (i === 0 && lifeStateInput(days[0]!, pattern, null, null).yesterday.scheduled === "WORK")) expect(s).toBe("RECOVERY");
      else if (kinds[i + 1] === "WORK") expect(s).toBe("FLIP");
      else expect(s).toBe("FREE");
    });
    // The rotation has a three-day stretch off, so all four states occur in two weeks.
    expect(new Set(states)).toEqual(new Set(["WORK_RUN", "RECOVERY", "FLIP", "FREE"]));
  });
  it("before 16:30 it is still the previous lived day", () => {
    const morning = lifeStateInput(at(2026, 7, 19, 9), pattern, null, null), evening = lifeStateInput(at(2026, 7, 18, 18), pattern, null, null);
    expect(morning.today).toEqual(evening.today);
  });
});
