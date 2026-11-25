import { describe, expect, it } from "vitest";
import { deriveHabitLadder, deriveLadderLine, type LadderAnswer, type LadderDay, type LadderHabit } from "../src/domain/habitLadder";

/** GRAYSON-CHALLENGE-LADDER-001 (C6.6): the stages and their floors, pure. */
const TODAY = "2026-11-25";
const date = (back: number) => { const d = new Date(Date.UTC(2026, 10, 25 - back)); return d.toISOString().slice(0, 10); };
/** 28 days, all due, Done unless listed as a miss (days back from today). */
function habit(misses: number[], opts: { id?: string; name?: string; low?: number[]; work?: number[]; unanswered?: number[] } = {}): LadderHabit {
  const history: LadderDay[] = Array.from({ length: 28 }, (_, i) => {
    const back = 27 - i;
    return { date: date(back), applies: true, answer: misses.includes(back) ? "NOT_DONE" : opts.unanswered?.includes(back) ? "UNRECORDED" : "DONE",
      work: opts.work?.includes(back) ? "WORK" : "OFF", lowCapacity: !!opts.low?.includes(back) };
  });
  return { id: opts.id ?? "h1", name: opts.name ?? "Stretch", history };
}
const ask = (back: number, answer: LadderAnswer["answer"], on = back): LadderAnswer => ({ habitId: "h1", stage: "ASK", answer, date: date(on), missDate: date(back) });
const reply = (stage: LadderAnswer["stage"], answer: LadderAnswer["answer"], back: number): LadderAnswer => ({ habitId: "h1", stage, answer, date: date(back) });

describe("floors", () => {
  it("one miss, or unanswered days, never start anything", () => {
    expect(deriveHabitLadder(habit([2]), [], TODAY)).toBeNull();
    expect(deriveHabitLadder(habit([], { unanswered: [1, 2, 3, 4, 5, 6] }), [], TODAY)).toBeNull();
  });
  it("ASK: two misses in 14 days, about the latest unexplained recent one", () => {
    const line = deriveHabitLadder(habit([5, 2]), [], TODAY)!;
    expect(line).toMatchObject({ stage: "ASK", missDate: date(2) });
    expect(line.text).toMatch(/^Stretch didn't happen .+\. What got in the way\?$/);
  });
  it("ASK leaves old misses alone and doesn't re-ask an answered or skipped one", () => {
    expect(deriveHabitLadder(habit([12, 10]), [], TODAY)).toBeNull(); // nothing in the last 7 days
    expect(deriveHabitLadder(habit([5, 2]), [ask(2, "LATER"), ask(5, "FORGOT")], TODAY)).toBeNull();
  });
  it("NAME needs three misses and two answers, and names what he said", () => {
    expect(deriveHabitLadder(habit([9, 5, 2]), [ask(9, "SHIFT")], TODAY)!.stage).toBe("ASK");
    const line = deriveHabitLadder(habit([9, 5, 2], { work: [9, 5, 2] }), [ask(9, "SHIFT"), ask(5, "SHIFT")], TODAY)!;
    expect(line.stage).toBe("NAME");
    expect(line.text).toContain("All 3 were work days.");
    expect(line.text).toContain("Your answers point to: work days leave no room for it.");
    expect(line.why.facts.map((f) => f.value)).toContain("Shift or work ran over");
  });
  it("NAME is asked once: RIGHT keeps it quiet unless the evidence earns a challenge", () => {
    const answers = [ask(9, "SHIFT"), ask(5, "SHIFT"), reply("NAME", "RIGHT", 4)];
    expect(deriveHabitLadder(habit([9, 5, 2]), answers, TODAY)?.stage ?? null).not.toBe("NAME");
  });
});

describe("CHALLENGE only when the evidence earns it", () => {
  const avoid = [ask(9, "FORGOT"), ask(7, "DIDNT_FEEL"), ask(5, "FORGOT"), reply("NAME", "RIGHT", 5)];
  it("after he agreed with the pattern, with three forgot / didn't-feel misses on normal days", () => {
    const line = deriveHabitLadder(habit([9, 7, 5]), avoid, TODAY)!;
    expect(line.stage).toBe("CHALLENGE");
    expect(line.text).toContain("Two minutes counts. Start smaller today?");
    for (const word of ["lazy", "discipline", "willpower", "commitment", "failure", "streak"]) expect(line.text.toLowerCase()).not.toContain(word);
  });
  it("never without his RIGHT on the named pattern", () => {
    expect(deriveHabitLadder(habit([9, 7, 5]), avoid.slice(0, 3), TODAY)?.stage).not.toBe("CHALLENGE");
  });
  it("never when the misses were low-capacity days", () => {
    expect(deriveHabitLadder(habit([9, 7, 5], { low: [9, 7] }), avoid, TODAY)?.stage).not.toBe("CHALLENGE");
  });
  it("never when the answers were shift, tiredness or the plan", () => {
    const constrained = [ask(9, "SHIFT"), ask(7, "TIRED"), ask(5, "PLAN"), reply("NAME", "RIGHT", 5)];
    expect(deriveHabitLadder(habit([9, 7, 5]), constrained, TODAY)).toBeNull();
  });
});

describe("EXAMINE and quiet", () => {
  it("six misses in 28 days examines the plan", () => {
    const line = deriveHabitLadder(habit([20, 16, 12, 9, 5, 2]), [], TODAY)!;
    expect(line.stage).toBe("EXAMINE");
    expect(line.text).toContain("Delta won't ask about it for two weeks either way.");
  });
  it("a challenge answered twice, with a new miss in between, examines the plan", () => {
    const answers = [ask(9, "FORGOT"), ask(7, "DIDNT_FEEL"), ask(5, "FORGOT"), reply("NAME", "RIGHT", 5), reply("CHALLENGE", "START_SMALLER", 4), ask(3, "FORGOT"), reply("CHALLENGE", "START_SMALLER", 2)];
    expect(deriveHabitLadder(habit([9, 7, 5, 3]), answers, TODAY)!.stage).toBe("EXAMINE");
  });
  it("#708 review: after START SMALLER the challenge waits for a new forgot / didn't-feel miss, and never escalates on the same evidence", () => {
    const base = [ask(9, "FORGOT"), ask(7, "DIDNT_FEEL"), ask(5, "FORGOT"), reply("NAME", "RIGHT", 5), reply("CHALLENGE", "START_SMALLER", 4)];
    expect(deriveHabitLadder(habit([9, 7, 5]), base, TODAY)).toBeNull();
    expect(deriveHabitLadder(habit([9, 7, 5, 2]), [...base, ask(2, "SHIFT")], TODAY)).toBeNull(); // a shift miss isn't one
    expect(deriveHabitLadder(habit([9, 7, 5, 2]), [...base, ask(2, "FORGOT")], TODAY)!.stage).toBe("CHALLENGE");
  });
  it("after EXAMINE, NOT RIGHT or CHANGE THE PLAN: quiet 14 days, then counting starts fresh", () => {
    const many = habit([20, 18, 16, 15, 13, 2]);
    expect(deriveHabitLadder(many, [reply("EXAMINE", "KEEP", 10)], TODAY)).toBeNull();
    expect(deriveHabitLadder(habit([5, 2]), [reply("NAME", "NOT_RIGHT", 3)], TODAY)).toBeNull();
    expect(deriveHabitLadder(habit([5, 2]), [reply("NAME", "CHANGE_PLAN", 3)], TODAY)).toBeNull();
    // #708 review: CHANGE THE PLAN restarts the counting too, so old-plan misses never carry over into EXAMINE.
    expect(deriveHabitLadder(habit([25, 23, 21, 19, 17, 5, 2]), [reply("NAME", "CHANGE_PLAN", 16)], TODAY)!.stage).toBe("ASK");
    // 15 days after EXAMINE, only misses since then count: two recent misses means ASK, not EXAMINE again.
    expect(deriveHabitLadder(habit([25, 23, 21, 19, 17, 5, 2]), [reply("EXAMINE", "KEEP", 16)], TODAY)!.stage).toBe("ASK");
  });
});

describe("one line a day", () => {
  const two = [habit([5, 2], { id: "h1", name: "Stretch" }), habit([9, 5, 2], { id: "h2", name: "Read" })];
  it("picks the habit with the most misses; none on a low-capacity day or after an answer today; respects off", () => {
    expect(deriveLadderLine({ habits: two, answers: [], today: TODAY, todayLowCapacity: false, off: new Set() })!.habitId).toBe("h2");
    expect(deriveLadderLine({ habits: two, answers: [], today: TODAY, todayLowCapacity: true, off: new Set() })).toBeNull();
    expect(deriveLadderLine({ habits: two, answers: [{ ...ask(2, "FORGOT", 0), habitId: "h2" }], today: TODAY, todayLowCapacity: false, off: new Set() })).toBeNull();
    expect(deriveLadderLine({ habits: two, answers: [], today: TODAY, todayLowCapacity: false, off: new Set(["h2"]) })!.habitId).toBe("h1");
  });
  it("is deterministic", () => {
    const input = { habits: two, answers: [], today: TODAY, todayLowCapacity: false, off: new Set<string>() };
    expect(deriveLadderLine(input)).toEqual(deriveLadderLine(input));
  });
});

describe("#708 review: lines never say more than the evidence", () => {
  it("NAME counts only the days he answered, and says so", () => {
    const unanswered = Array.from({ length: 28 }, (_, i) => i).filter((b) => ![9, 7, 5, 3].includes(b));
    const line = deriveHabitLadder(habit([9, 7, 5], { unanswered }), [ask(9, "PLAN"), ask(7, "PLAN")], TODAY)!;
    expect(line.stage).toBe("NAME");
    expect(line.text).toContain("didn't happen 3 of the 4 days you answered it.");
  });
  it("CHALLENGE never calls them 'the last' misses when another miss sits between", () => {
    const answers = [ask(10, "FORGOT"), ask(8, "FORGOT"), ask(6, "SHIFT"), ask(4, "FORGOT"), reply("NAME", "RIGHT", 4)];
    const line = deriveHabitLadder(habit([10, 8, 6, 4]), answers, TODAY)!;
    expect(line.stage).toBe("CHALLENGE");
    expect(line.text).toContain("3 of the misses (");
    expect(line.text).not.toMatch(/the last \d+ misses/);
  });
});
