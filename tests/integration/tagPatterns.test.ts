import { describe, expect, it } from "vitest";
import { compareTags, dayFacts, MIN_TAGGED_DAYS } from "../../src/application/tagPatterns";
import type { DaySummary } from "../../src/engine/dayLedger";
import type { StateCheckIn } from "../../src/domain/common/types";
import { describeComparison } from "../../src/ui/screens/more/TagPatternsSection";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";

/** JOURNAL-LEARN-001 part 2. Invented days only. */
const startOf = (i: number) => new Date(2026, 9, i, 18, 0).toISOString(); // local 18:00, inside lived day i
const summary = (i: number, sleep?: number, workouts = 0) => ({
  beyondDayId: `d${i}`, startedAt: startOf(i), livedDayStart: mostRecentBoundaryAtOrBefore(new Date(startOf(i))).toISOString(),
  sleep: sleep === undefined ? {} : { primaryMinutes: sleep }, workouts: Array.from({ length: workouts }, () => ({})),
}) as unknown as DaySummary;
const checkIn = (i: number, energy: number, mood: number) => ({ id: `c${i}`, beyondDayId: `d${i}`, recordedAt: new Date(2026, 9, i, 20, 0).toISOString(), energy, mood }) as unknown as StateCheckIn;

describe("tag patterns", () => {
  // Days 1–10 each have a note; #latecoffee on 1, 3, 5, 7. The NEXT day's sleep and check-in follow each.
  const notes = Array.from({ length: 10 }, (_, k) => ({ dayId: `d${k + 1}`, text: [1, 3, 5, 7].includes(k + 1) ? "rough #latecoffee" : k + 1 === 2 ? "#sauna" : "fine" }));
  const summaries = Array.from({ length: 11 }, (_, k) => {
    const i = k + 1, afterCoffee = [2, 4, 6, 8].includes(i);
    return summary(i, afterCoffee ? 330 : 420, i === 1 ? 1 : 0);
  });
  const checkIns = Array.from({ length: 11 }, (_, k) => { const i = k + 1; const afterCoffee = [2, 4, 6, 8].includes(i); return checkIn(i, afterCoffee ? 2 : 4, afterCoffee ? 3 : 4); });

  it("compares tagged with other noted days on the next day's sleep, energy, mood, and training, with day counts", () => {
    const { ready, learning } = compareTags(dayFacts(notes, summaries, checkIns));
    const coffee = ready.find((p) => p.tag === "latecoffee")!;
    expect(coffee.taggedDays).toBe(4);
    const by = Object.fromEntries(coffee.comparisons.map((c) => [c.id, c]));
    expect(by.NEXT_SLEEP).toEqual({ id: "NEXT_SLEEP", withTag: { value: 330, days: 4 }, without: { value: 420, days: 6 } });
    expect(by.NEXT_ENERGY!.withTag.value).toBe(2);
    expect(describeComparison(by.NEXT_SLEEP!)).toBe("Sleep logged the next day: 5h 30m on average (4 days), against 7h 0m (6).");
    expect(describeComparison(by.TRAINED!)).toBe("Trained that day: 1 of 4 days, against 0 of 6.");
    expect(learning).toEqual([{ tag: "sauna", taggedDays: 1 }]);
  });

  it("uses only the lived day right after, never the next recorded day after a gap", () => {
    // Day 1 tagged; day 2 missing; day 5 recorded. Day 1 must get no next-day measures.
    const facts = dayFacts([{ dayId: "d1", text: "#nap" }], [summary(1), summary(5, 300)], [checkIn(5, 1, 1)]);
    expect(facts).toEqual([{ dayId: "d1", tags: ["nap"], trained: false }]);
    const adjacent = dayFacts([{ dayId: "d1", text: "#nap" }], [summary(1), summary(2, 300)], [checkIn(2, 1, 2)]);
    expect(adjacent[0]).toMatchObject({ nextSleep: 300, nextEnergy: 1, nextMood: 2 });
  });

  it(`says nothing for a tag on fewer than ${MIN_TAGGED_DAYS} days, or a measure missing on either side`, () => {
    const few = compareTags(dayFacts(notes.slice(0, 4), summaries.slice(0, 5), []));
    const coffee = few.ready.find((p) => p.tag === "latecoffee");
    expect(coffee).toBeUndefined(); // only 2 tagged days in the first 4
    const noCheckIns = compareTags(dayFacts(notes, summaries, []));
    expect(noCheckIns.ready[0]!.comparisons.map((c) => c.id)).toEqual(["NEXT_SLEEP", "TRAINED"]);
  });
});
