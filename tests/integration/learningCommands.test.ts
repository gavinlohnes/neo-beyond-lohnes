import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { respondToLearning } from "../../src/application/learningCommands";

/** GRAYSON C6.1: his answers are appended, global, causally chained and safe against double taps and stale screens. */
const base = { learningId: "tag-caffeine", statement: "Learned what #caffeine lines up with, over 5 tagged days.", evidence: { kind: "TAG" as const, days: 5, measure: "NEXT_SLEEP", direction: "LESS" as const } };
beforeEach(async () => { await db.events.clear(); });

describe("respondToLearning", () => {
  it("appends a global USER event chained to the previous answer, never touching anything else", async () => {
    const keep = await respondToLearning({ ...base, action: "KEEP", expectedHeadId: null });
    const drop = await respondToLearning({ ...base, action: "DROP", expectedHeadId: keep.id });
    const events = (await db.events.toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(events.map((e) => [e.type, e.source, e.beyondDayId, e.causationId])).toEqual([["LEARNING_RESPONDED", "USER", undefined, undefined], ["LEARNING_RESPONDED", "USER", undefined, keep.id]]);
    expect(drop.supersedes).toBe(keep.id);
  });
  it("the same tap twice writes once; a stale screen is refused and writes nothing", async () => {
    const keep = await respondToLearning({ ...base, action: "KEEP", expectedHeadId: null });
    expect((await respondToLearning({ ...base, action: "KEEP", expectedHeadId: null })).id).toBe(keep.id);
    await expect(respondToLearning({ ...base, action: "DROP", expectedHeadId: null })).rejects.toThrow(/changed elsewhere/);
    expect(await db.events.count()).toBe(1);
  });
  it("Narrow needs a preset or words; Undo needs an answer in force", async () => {
    await expect(respondToLearning({ ...base, action: "NARROW", expectedHeadId: null })).rejects.toThrow(/Pick when it applies/);
    await expect(respondToLearning({ ...base, action: "NARROW", context: { words: "   " }, expectedHeadId: null })).rejects.toThrow(/Pick when it applies/);
    await expect(respondToLearning({ ...base, action: "UNDO", expectedHeadId: null })).rejects.toThrow(/no answer to undo/);
    const narrow = await respondToLearning({ ...base, action: "NARROW", context: { preset: "AFTER_NIGHTS", words: " after the 3rd night " }, expectedHeadId: null });
    expect(narrow.context).toEqual({ preset: "AFTER_NIGHTS", words: "after the 3rd night" });
    const undo = await respondToLearning({ ...base, action: "UNDO", expectedHeadId: narrow.id });
    await expect(respondToLearning({ ...base, action: "UNDO", expectedHeadId: undo.id })).rejects.toThrow(/no answer to undo/);
    expect(await db.events.count()).toBe(2);
  });
});
