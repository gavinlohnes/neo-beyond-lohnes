import { describe, expect, it } from "vitest";
import { deriveOrientation, moodTrend, type OrientationInput } from "../src/application/orientation";

/**
 * GRAYSON C1.2 · Orientation slice 2 (Gavin, 2026-11-20): day-off, recovery and hard-day grammar, and the mood trend
 * he approved as a factual line. Week A ends Sun Nov 15 2026; Mon Nov 16 (Week B) is the first day off after the run;
 * back on Wed Nov 18 at 18:00. Local Date constructors keep these independent of the runner's timezone.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const OPEN_PREP = { FOOD: { id: null, value: "UNCONFIRMED" as const, recordedAt: null }, BOTTLE: { id: null, value: "UNCONFIRMED" as const, recordedAt: null } };
const life = (state: "WORK_RUN" | "RECOVERY" | "FLIP" | "FREE", line: string) => ({ now: { state, label: state.replace("_", " "), line, why: [] }, next: null });
const off = (over: Partial<OrientationInput> = {}): OrientationInput => ({
  now: at(16, 14, 10), day: { id: "mon", startedAt: at(16, 16, 30).toISOString(), workContext: "OFF" }, contextBySchedule: true, scheduled: "OFF",
  picture: life("RECOVERY", "The first day off after the run. Sleep usually comes first. Back on Wed."),
  shift: null, run: null, plan: null,
  sleep: { minutes: 350, fromGarmin: true, band: { low: 415, high: 470, kind: "WORK" } },
  checkIn: null, recommendation: null, draft: null, prep: OPEN_PREP, obligations: [],
  minimumDay: false, recoveryPlan: ["Sleep first", "Keep the day light"], recentMoods: [], backOn: at(18, 18), ...over,
});

describe("C1.2 · recovery day", () => {
  it("leads with the run being over, shows his recovery plan, says when he's back, and never shows work prep", () => {
    const o = deriveOrientation(off());
    expect(o.purpose).toBe("RECOVERY");
    expect(o.situation).toEqual({ kind: "OFF", headline: "Back on Wed", sub: "18:00 · saved schedule", line: "The first day off after the run. Sleep usually comes first.", source: "SAVED SCHEDULE" });
    expect(o.delta).toBe("The first day off after the run; sleep usually comes first. Last night was under your usual for a work day. Your check-in sets today's advice.");
    expect(o.recoveryPlan).toEqual(["Sleep first", "Keep the day light"]);
    expect(o.actions).toEqual([]);
    expect(o.runway.map((r) => r.kind)).toEqual(["NOW"]);
    expect(o.release).toBe("Nothing is recorded as due today.");
  });
});

describe("C1.2 · free day off", () => {
  const free = (over: Partial<OrientationInput> = {}) => off({ now: at(21, 9, 30), day: { id: "sat", startedAt: at(20, 16, 30).toISOString(), workContext: "OFF" },
    picture: life("FREE", "A day off with no shift on either side. Your time for plans, people and training. Back on Mon."),
    sleep: { minutes: 475, fromGarmin: true, band: { low: 450, high: 520, kind: "OFF" } }, recoveryPlan: [], backOn: at(23, 18), ...over });

  it("names open time as open when nothing is due", () => {
    const o = deriveOrientation(free());
    expect(o.purpose).toBe("OFF");
    expect(o.delta).toBe("Nothing is due today. The day is open. Your check-in sets today's advice.");
    expect(o.recommendation).toBeNull();
    expect(o.actions).toEqual([]);
    expect(o.release).toBe("Nothing is recorded as due today.");
  });

  it("shows only what's actually due, and never invents a recommendation", () => {
    const o = deriveOrientation(free({ obligations: [
      { id: "vet", title: "Home: vet checkup", dueAt: "2026-11-21", status: "OPEN" },
      { id: "ref", title: "Home: refill dog food", dueAt: "2026-11-25", status: "OPEN" },
    ] }));
    expect(o.delta).toBe("One thing is due today; the rest of the day is open. Your check-in sets today's advice.");
    expect(o.actions).toEqual([{ kind: "COMMITMENT", obligationId: "vet", line: "Home: vet checkup", detail: "Due today." }]);
    expect(o.recommendation).toBeNull();
  });

  it("the last day off before the run says he's back tomorrow", () => {
    const o = deriveOrientation(free({ now: at(22, 10), day: { id: "sun", startedAt: at(21, 16, 30).toISOString(), workContext: "OFF" },
      picture: life("FLIP", "The last day off before the run. Today is the switch back to shift hours. Back on tomorrow."), backOn: at(23, 18) }));
    expect(o.purpose).toBe("FLIP");
    expect(o.situation).toMatchObject({ kind: "OFF", headline: "Back on tomorrow" });
    expect(o.delta).toBe("Your last day off before the run; you're back on shift tomorrow. Your check-in sets today's advice.");
  });
});

describe("C1.2 · hard day and the mood trend", () => {
  const STABILIZE = { kind: "STABILIZE" as const, title: "Stabilize first", rationale: "Capacity is low. Protect the basics before anything else.", suggestedCommand: null };
  const work = (over: Partial<OrientationInput> = {}): OrientationInput => off({
    now: at(14, 15, 5), day: { id: "sat", startedAt: at(14, 16, 30).toISOString(), workContext: "WORK" }, scheduled: "WORK",
    picture: life("WORK_RUN", "Shift 2 of 3. Fuel, water and sleep between shifts carry the run."), shift: { start: at(14, 18), end: at(15, 6) },
    run: { position: 2, length: 3 }, backOn: null, recoveryPlan: [],
    obligations: [{ id: "a", title: "Renew registration", dueAt: "2026-11-10", status: "OPEN" }], ...over,
  });

  it("the Engine's STABILIZE after his check-in makes it a hard day: one action at most, gentler words", () => {
    const o = deriveOrientation(work({ checkIn: { energy: 1, stress: 4, mood: 2 }, recommendation: STABILIZE }));
    expect(o.hard).toBe(true);
    expect(o.actions).toHaveLength(1);
    expect(o.actions[0]!.kind).toBe("PREP");
    expect(o.delta).toBe("Your check-in says today is heavy. The advice is to protect the basics and nothing more. Last night was under your usual for a work day.");
  });

  it("names a sustained drop as a fact, and only on a hard day does Delta add that it has gone on for days", () => {
    const hard = deriveOrientation(work({ checkIn: { energy: 1, stress: 4, mood: 2 }, recommendation: STABILIZE, recentMoods: [4, 3, 2] }));
    expect(hard.trend).toBe("Mood has dropped across your last three check-ins (4 → 3 → 2).");
    expect(hard.delta).toMatch(/This has gone on for a few days, so it's worth deliberate attention, not just one bad morning\.$/);
    const fine = deriveOrientation(work({ recentMoods: [4, 3, 2] }));
    expect(fine.trend).toBe("Mood has dropped across your last three check-ins (4 → 3 → 2).");
    expect(fine.delta).not.toMatch(/gone on for a few days/);
  });

  it("Minimum Day (his own switch) is a hard day whatever the check-in", () => {
    const o = deriveOrientation(off({ minimumDay: true, obligations: [
      { id: "a", title: "A", dueAt: "2026-11-16", status: "OPEN" }, { id: "b", title: "B", dueAt: "2026-11-16", status: "OPEN" },
    ] }));
    expect(o.hard).toBe(true);
    expect(o.delta).toBe("Minimum Day is on. Today is about the basics; nothing else is asked of you.");
    expect(o.actions).toHaveLength(1);
  });

  it("an unread check-in history is reported, not treated as no trend", () => {
    const o = deriveOrientation(off({ recentMoods: "ERROR" }));
    expect(o.trend).toBeNull();
    expect(o.unread).toContain("check-in history");
  });
});

describe("moodTrend", () => {
  it("is a strict drop across the last three submitted check-ins, nothing looser", () => {
    expect(moodTrend([4, 3, 2])).toEqual([4, 3, 2]);
    expect(moodTrend([5, 4, 3, 2])).toEqual([4, 3, 2]);
    expect(moodTrend([3, 3, 2])).toBeNull();
    expect(moodTrend([2, 3, 1])).toBeNull();
    expect(moodTrend([4, 2])).toBeNull();
    expect(moodTrend([])).toBeNull();
  });
});
