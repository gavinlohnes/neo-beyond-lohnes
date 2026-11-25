import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { reflectOnDecline } from "../../src/application/reflect";
import { createDecisionJournalEntry } from "../../src/application/journalCommands";
import { getDeltaKnowledge, getMissedDeclines, overrideLearnings, OVERRIDE_DAYS, type MissedDecline } from "../../src/application/delta";
import { deltaFacts } from "../../src/application/deltaFacts";
import { deriveLifecycle, projectResponses, weeklyLearnings } from "../../src/application/learningLifecycle";
import type { Recommendation } from "../../src/domain/common/types";

/**
 * GRAYSON C6.5 (Gavin, 2026-11-25: "1."): "What did I miss?" on a decline is saved with the journal entry, and the same
 * reason three times in 30 days for one kind of advice becomes a learning Delta asks about. Never an Engine input.
 */
beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const NOW = new Date(2026, 10, 25, 12);
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const decline = (d: number, extra: Partial<MissedDecline> = {}): MissedDecline => ({ journalId: `j${d}-${extra.missed ?? ""}`, at: ago(d), recommendationKind: "EXECUTE_PLANNED_WORK", missed: "Shift or work ran over", ...extra });

describe("C6.5 the threshold", () => {
  it("two is nothing; the third within 30 days is a learning, dated the day the third landed", () => {
    expect(overrideLearnings([decline(10), decline(5)], NOW)).toEqual([]);
    const [l] = overrideLearnings([decline(10), decline(5), decline(2)], NOW);
    expect(l).toMatchObject({ id: "override-EXECUTE_PLANNED_WORK-shift-or-work-ran-over", kind: "OVERRIDE", count: 3, since: ago(10), learnedOn: ago(2) });
  });
  it(`only the last ${OVERRIDE_DAYS} days count, and each kind of advice and each reason is its own`, () => {
    expect(overrideLearnings([decline(40), decline(5), decline(2)], NOW)).toEqual([]);
    expect(overrideLearnings([decline(9), decline(5, { recommendationKind: "RECOVER" }), decline(2)], NOW)).toEqual([]);
    expect(overrideLearnings([decline(9), decline(5, { missed: "Family or home" }), decline(2)], NOW)).toEqual([]);
  });
  it("is observed until he answers, is asked in the weekly check, and reaches Alfred only with the personal opt-in", () => {
    const learnings = overrideLearnings([decline(10), decline(5), decline(2)], NOW);
    const items = deriveLifecycle({ learnings, responses: projectResponses([]), runningTags: new Set(), now: NOW });
    expect(items[0]).toMatchObject({ state: "OBSERVED", by: "RECORDS" });
    expect(weeklyLearnings(items, NOW).map((i) => i.learningId)).toEqual([learnings[0]!.id]);
    const k = { topics: [], learnings, suggestion: null, needle: { ready: false as const, judgedWeeks: 0, need: 4 } };
    expect(deltaFacts(k, false)).toEqual([]);
    expect(deltaFacts(k, true)[0]!.text).toBe('DELTA NOTICED (his own decline reasons, 3 in the last 30 days): when BEYOND suggested the planned work, he declined saying "Shift or work ran over". Context BEYOND\'s data missed, not a rule.');
  });
});

describe("C6.5 from the records", () => {
  const rec = (id: string, kind: Recommendation["kind"]): Recommendation => ({ id, beyondDayId: "d", issuedAt: ago(1), kind, priority: 1, title: "Do the planned work", rationale: "x", suggestedCommand: null } as Recommendation);
  it("saves the tap with the decline, joins it to the kind of advice, and three make a learning", async () => {
    await db.recommendations.bulkAdd([rec("r1", "EXECUTE_PLANNED_WORK"), rec("r2", "EXECUTE_PLANNED_WORK"), rec("r3", "EXECUTE_PLANNED_WORK"), rec("r4", "RECOVER")]);
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const [i, id] of ["r1", "r2", "r3"].entries()) {
      vi.setSystemTime(new Date(NOW.getTime() - (6 - i * 2) * 86_400_000));
      const entry = await reflectOnDecline({ id, title: "Do the planned work", why: "x" }, "Not today", "", "Shift or work ran over");
      expect(entry.missed).toBe("Shift or work ran over");
    }
    await reflectOnDecline({ id: "r4", title: "Recover", why: "x" }, "Wrong for me"); // no tap: never counted
    vi.setSystemTime(NOW);
    expect((await getMissedDeclines()).map((d) => [d.recommendationKind, d.missed])).toEqual(Array(3).fill(["EXECUTE_PLANNED_WORK", "Shift or work ran over"]));
    const k = await getDeltaKnowledge(NOW);
    expect(k.learnings.filter((l) => l.kind === "OVERRIDE").map((l) => l.id)).toEqual(["override-EXECUTE_PLANNED_WORK-shift-or-work-ran-over"]);
  });
  it("a missed reason without a declined recommendation is refused", async () => {
    await expect(createDecisionJournalEntry({ title: "x", decision: "y", missed: "Family or home" } as never)).rejects.toThrow(/declined recommendation/);
  });
});
