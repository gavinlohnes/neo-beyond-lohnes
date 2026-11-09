import { describe, expect, it } from "vitest";
import { whatMovesTheNeedle, MIN_JUDGED_WEEKS } from "../../src/application/needle";
import type { DaySummary } from "../../src/engine/dayLedger";
import type { StateCheckIn } from "../../src/domain/common/types";
import { describeNeedle } from "../../src/ui/components/DeltaViews";

/** DELTA-NEXT 6. Invented weeks only. Week w (0-based) = 7 days starting Monday 2026-06-01 + 7w. */
const dayOf = (w: number, d: number) => new Date(2026, 5, 1 + w * 7 + d, 18, 0);
function build(weeks: number, energyOf: (w: number) => number, saunaDays: (w: number) => number, notedDays: (w: number) => number = () => 7) {
  const summaries: DaySummary[] = [], checkIns: StateCheckIn[] = [], notes: { dayId: string; text: string }[] = [];
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
    const id = `w${w}d${d}`, at = dayOf(w, d);
    summaries.push({ beyondDayId: id, startedAt: at.toISOString(), livedDayStart: new Date(at.getFullYear(), at.getMonth(), at.getDate(), 16, 30).toISOString(), workouts: d === 0 ? [{}] : [], sleep: {} } as unknown as DaySummary);
    if (d < 3) checkIns.push({ id: `c${id}`, beyondDayId: id, recordedAt: at.toISOString(), energy: energyOf(w), mood: 3 } as unknown as StateCheckIn);
    if (d < notedDays(w)) notes.push({ dayId: id, text: d < saunaDays(w) ? "#sauna" : "fine" });
  }
  return { summaries, checkIns, notes };
}

describe("what moves the needle", () => {
  it(`says nothing until ${MIN_JUDGED_WEEKS} weeks have 3+ check-ins, and says how many it has`, () => {
    const { summaries, checkIns, notes } = build(4, () => 3, () => 1);
    expect(whatMovesTheNeedle(summaries, checkIns, notes)).toEqual({ ready: false, judgedWeeks: 4, need: MIN_JUDGED_WEEKS });
  });

  it("compares days per week in your top-third energy weeks with the rest, with week counts, biggest gap first", () => {
    // 9 weeks; weeks 0–2 high energy with sauna on 4 days; the rest low energy with sauna on 1 day. Training same every week.
    const { summaries, checkIns, notes } = build(9, (w) => (w < 3 ? 5 : 2), (w) => (w < 3 ? 4 : 1));
    const needle = whatMovesTheNeedle(summaries, checkIns, notes);
    expect(needle.ready).toBe(true);
    if (!needle.ready) return;
    expect(needle.goodWeeks).toBe(3);
    expect(needle.habits).toEqual([{ habit: "#sauna", unit: "SHARE_OF_NOTED_DAYS", good: 4 / 7, other: 1 / 7, goodWeeks: 3, otherWeeks: 6 }]); // training: no gap, left out
    expect(describeNeedle(needle.habits[0]!)).toBe("#sauna: on 57% of your noted days in good weeks (3 weeks with notes), against 14% in your other weeks (6).");
  });

  it("a tag isn't credited for simply writing more notes in good weeks", () => {
    // Same habit share (half of noted days) everywhere; good weeks just have more notes (6 vs 2 days).
    const { summaries, checkIns, notes } = build(9, (w) => (w < 3 ? 5 : 2), (w) => (w < 3 ? 3 : 1), (w) => (w < 3 ? 6 : 2));
    const needle = whatMovesTheNeedle(summaries, checkIns, notes);
    expect(needle.ready && needle.habits.filter((h) => h.habit === "#sauna")).toEqual([]);
  });
});
