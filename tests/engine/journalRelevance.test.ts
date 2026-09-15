import { describe, expect, it } from "vitest";
import { findRelevantReviewedEntries } from "../../src/engine/journalRelevance";
import type { DecisionJournalEntry } from "../../src/domain/journal/types";

/**
 * JOURNAL-001 (2026-09-15). Pure unit tests for the keyword-relevance
 * match — no Dexie, no fake-indexeddb, matching every other engine/*
 * test file's zero-I/O contract.
 */

let idCounter = 0;
function entry(overrides: Partial<DecisionJournalEntry> = {}): DecisionJournalEntry {
  idCounter += 1;
  return {
    id: `entry-${idCounter}`,
    title: `Entry ${idCounter}`,
    decision: "Some decision",
    status: "REVIEWED",
    source: "USER",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findRelevantReviewedEntries", () => {
  it("no entries -> abstains with []", () => {
    expect(findRelevantReviewedEntries([], ["passport"])).toEqual([]);
  });

  it("no query terms -> abstains with [] (never returns entries with nothing to justify them)", () => {
    const entries = [entry({ title: "Renew passport early" })];
    expect(findRelevantReviewedEntries(entries, [])).toEqual([]);
    expect(findRelevantReviewedEntries(entries, ["", "   "])).toEqual([]);
  });

  it("no overlap between query terms and any entry text -> abstains with []", () => {
    const entries = [entry({ title: "Renew passport early", decision: "Renewed six months ahead" })];
    expect(findRelevantReviewedEntries(entries, ["quarterly tax filing"])).toEqual([]);
  });

  it("a genuine keyword overlap on title surfaces the entry", () => {
    const target = entry({ title: "Renew passport early", decision: "Renewed six months ahead of expiry" });
    const unrelated = entry({ title: "Pick a gym", decision: "Joined the one closer to home" });
    const result = findRelevantReviewedEntries([target, unrelated], ["Renew passport"]);
    expect(result.map((e) => e.id)).toEqual([target.id]);
  });

  it("also matches on context/decision/lesson text, not just title", () => {
    const target = entry({
      title: "Unrelated title",
      context: "Considering whether to renew the passport now or wait.",
      decision: "Wait until closer to the trip.",
      lesson: "Waiting caused a scramble — renew passports early next time.",
    });
    const result = findRelevantReviewedEntries([target], ["passport renewal"]);
    expect(result.map((e) => e.id)).toEqual([target.id]);
  });

  it("respects the limit parameter", () => {
    const entries = [
      entry({ title: "Gym membership decision" }),
      entry({ title: "Gym schedule decision" }),
      entry({ title: "Gym equipment decision" }),
    ];
    const result = findRelevantReviewedEntries(entries, ["gym decision"], 2);
    expect(result).toHaveLength(2);
  });

  it("deterministic: same input -> same output", () => {
    const entries = [
      entry({ title: "Renew passport early" }),
      entry({ title: "Renew driver's license" }),
    ];
    const first = findRelevantReviewedEntries(entries, ["renew"]).map((e) => e.id);
    const second = findRelevantReviewedEntries(entries, ["renew"]).map((e) => e.id);
    expect(first).toEqual(second);
  });
});
