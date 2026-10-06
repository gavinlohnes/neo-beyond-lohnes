import { describe, expect, it } from "vitest";
import {
  composeAdvisoryNoteFromJournal,
  composeAdvisoryNoteFromProgression,
  composeAdvisoryNoteFromShiftProtection,
  composeAdvisoryNotesFromObligations,
  composeAdvisoryNoteFromPatternProposal,
  composeAdvisoryNoteFromDayRolloverAmbiguity,
} from "../../src/engine/advisory";
import type { AdvisoryNote } from "../../src/domain/intelligence/types";
import type { ExercisePrescription } from "../../src/domain/workout/types";
import { describeAdvisorySummary, groupAdvisoryNotes, MAX_ADVISORY_ROWS } from "../../src/ui/screens/today/advisoryCopy";

/** ADVISORY-002: grouping, the three-row cap, and obligations left to COMMITMENT. */

function lift(name: string): ExercisePrescription {
  return { exerciseId: name.toLowerCase(), name, sets: 3, repRangeLow: 8, repRangeHigh: 12 } as ExercisePrescription;
}

function easeBackIn(name: string): AdvisoryNote {
  return composeAdvisoryNoteFromProgression(lift(name), {
    recommendation: "RE_ENTRY",
    reason: `21 days since your last ${name} — suggests 90lb (about 90% of 100lb) to start back.`,
    lastWeight: 100,
    suggestedNextWeight: 90,
  } as never)!;
}

describe("ADVISORY-002 grouping", () => {
  it("four EASE BACK IN notes become one row, 'Easing back in · 4 lifts', each lift keeping its WHY", () => {
    const rows = groupAdvisoryNotes(["Bench Press", "Row", "Squat", "Curl"].map(easeBackIn));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.label).toBe("Easing back in · 4 lifts");
    expect(rows[0]!.items.map((i) => i.name)).toEqual(["Bench Press", "Row", "Squat", "Curl"]);
    expect(rows[0]!.items[0]!.why).toBe("21 days since your last Bench Press — suggests 90lb (about 90% of 100lb) to start back.");
    expect(describeAdvisorySummary(rows)).toBe("Easing back in · 4 lifts");
  });

  it("progression reasons use TRAIN's plain words", () => {
    const note = composeAdvisoryNoteFromProgression(lift("Row"), {
      recommendation: "INCREASE",
      reason: "Mixed weights across sets last time — not clean evidence either way.",
      lastWeight: 100,
      suggestedNextWeight: 105,
    } as never)!;
    const [row] = groupAdvisoryNotes([note]);
    expect(row!.label).toBe("Ready to add weight · 1 lift");
    expect(row!.items[0]!.why).toBe("Last time the weight changed between sets, so keep it the same.");
  });

  it("obligation notes never appear in ADVISORY (they live in COMMITMENT)", () => {
    const notes = composeAdvisoryNotesFromObligations(
      [{ id: "o1", title: "Blood work", dueAt: "2026-09-01", status: "OPEN", createdAt: "2026-08-01T00:00:00Z", seq: 1 } as never],
      "2026-10-06",
    );
    expect(notes).toHaveLength(1);
    expect(groupAdvisoryNotes(notes)).toEqual([]);
  });

  it("never more than three rows; the rest fold into 'More · n notes'; PROTECT sorts first", () => {
    const notes = [
      easeBackIn("Row"),
      composeAdvisoryNoteFromJournal({ id: "j1", title: "Late caffeine", decision: "x", lesson: "Stop by 0200", status: "REVIEWED" } as never)!,
      composeAdvisoryNoteFromPatternProposal({ kind: "RECOVER", rating: "WORSE", count: 3 } as never),
      composeAdvisoryNoteFromDayRolloverAmbiguity({ kind: "PRIMARY_SLEEP_ON_ROLLOVER_DAY" } as never),
      composeAdvisoryNoteFromShiftProtection({ unmetItems: ["HYDRATE"] }),
    ];
    const rows = groupAdvisoryNotes(notes);
    expect(rows).toHaveLength(MAX_ADVISORY_ROWS);
    expect(rows[0]!.key).toBe("shiftProtection");
    expect(rows[0]!.lead).not.toBeNull();
    expect(rows[2]!.label).toBe("More · 3 notes");
    expect(rows.flatMap((r) => r.items)).toHaveLength(5);
  });
});

describe("ADVISORY-002 review fixes", () => {
  it("OBLIGATION_DUE names only a commitment that fires the rule; otherwise it reads 'A commitment was due'", async () => {
    const { describeRecommendationTitle } = await import("../../src/ui/screens/today/recommendationCopy");
    const rec = { kind: "OBLIGATION_DUE", title: "An obligation needs attention" } as never;
    const obligation = { id: "o", title: "Dentist" } as never;
    expect(describeRecommendationTitle(rec, { obligation, tier: "OVERDUE" })).toBe("Dentist · Overdue");
    expect(describeRecommendationTitle(rec, { obligation, tier: "DUE_TODAY" })).toBe("Dentist · Due today");
    // After the due one is satisfied, the next headline may not be due at all.
    expect(describeRecommendationTitle(rec, { obligation, tier: "WAITING" })).toBe("A commitment was due");
    expect(describeRecommendationTitle(rec, { obligation, tier: "DUE_SOON" })).toBe("A commitment was due");
    expect(describeRecommendationTitle(rec, null)).toBe("A commitment was due");
    const other = { kind: "RECOVER", title: "Recover" } as never;
    expect(describeRecommendationTitle(other, null)).toBe("Recover");
  });

  it("a 'still relevant' note about an OBLIGATION_DUE never quotes the Engine title", async () => {
    const { composeAdvisoryNoteFromContinuity } = await import("../../src/engine/advisory");
    const note = composeAdvisoryNoteFromContinuity("OBLIGATION_DUE", "An obligation needs attention", "REINTRODUCE")!;
    const [row] = groupAdvisoryNotes([note]);
    expect(row!.items[0]!.name).toBe('"A commitment was due" from last time is still relevant today.');
    const recover = composeAdvisoryNoteFromContinuity("RECOVER", "Recover", "REINTRODUCE")!;
    expect(groupAdvisoryNotes([recover])[0]!.items[0]!.name).toBe(recover.message);
  });

  it("the outcome prompt rewords a past OBLIGATION_DUE", async () => {
    const { describePlainRecommendationTitle } = await import("../../src/ui/screens/today/recommendationCopy");
    expect(describePlainRecommendationTitle("OBLIGATION_DUE", "An obligation needs attention")).toBe("A commitment was due");
    expect(describePlainRecommendationTitle("RECOVER", "Recover")).toBe("Recover");
  });
});
