import { describe, expect, it } from "vitest";
import { deltaFacts } from "../../src/application/deltaFacts";
import type { DeltaKnowledge } from "../../src/application/delta";

/** SUPERCHARGE-001 item 2: DELTA's learnings for Alfred — counted facts; note/journal facts only with the personal opt-in. */
const knowledge = {
  topics: [], suggestion: null, needle: { ready: false, judgedWeeks: 2, need: 9 },
  learnings: [
    { id: "sleep-WORK", kind: "SLEEP_WINDOW", learnedOn: "2026-10-22T21:30:00.000Z", group: { kind: "WORK", nights: 16, start: 490, end: 920, midpoint: 705, spread: 15 } },
    { id: "tag-latecoffee", kind: "TAG", learnedOn: "2026-10-30T21:30:00.000Z", tag: "latecoffee", taggedDays: 5, comparison: { id: "NEXT_SLEEP", withTag: { value: 330, days: 4 }, without: { value: 420, days: 9 } } },
  ],
} as unknown as DeltaKnowledge;

describe("DELTA facts for Alfred", () => {
  it("states measured facts with counts and keeps note-based ones behind the personal opt-in", () => {
    const shared = deltaFacts(knowledge, false);
    expect(shared.map((f) => f.id)).toEqual(["sleep-WORK"]);
    expect(shared[0]!.text).toBe("DELTA LEARNED (sleep timing, work days, 16 Garmin-measured nights, last 4 weeks): usually asleep 08:10, up 15:20; half of nights within 15 min of the typical midpoint.");
    const personal = deltaFacts(knowledge, true);
    expect(personal.map((f) => f.id)).toEqual(["sleep-WORK", "tag-latecoffee"]);
    expect(personal[1]!.text).toBe("DELTA LEARNED (#latecoffee, 5 tagged days): sleep logged the next day was 5h30 on tagged days (4) against 7h00 on other noted days (9). A pattern, not a cause.");
  });
});
