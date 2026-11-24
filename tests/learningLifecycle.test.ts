import { describe, expect, it } from "vitest";
import type { DomainEvent } from "../src/domain/common/types";
import type { Learning } from "../src/application/delta";
import { deriveLifecycle, evidenceOf, OUTDATED_DAYS, projectResponses, reversed, verdictOf, weeklyLearnings, type LearningResponse } from "../src/application/learningLifecycle";
import type { LearningResponsePayload } from "../src/domain/learningLifecycle";

/** GRAYSON C6.1: each state and each transition of the learning lifecycle, pure. */
const NOW = new Date("2026-11-24T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const tag = (t: string, withSleep: number, without: number, learnedDaysAgo = 3): Learning => ({
  id: `tag-${t}`, kind: "TAG", learnedOn: ago(learnedDaysAgo), tag: t, taggedDays: 5,
  comparison: { id: "NEXT_SLEEP", withTag: { value: withSleep, days: 5 }, without: { value: without, days: 9 } },
  evidence: { days: [{ id: "d1", at: ago(learnedDaysAgo) }] },
});
const window = (midpoint: number, daysAgo = 2): Learning => ({ id: "sleep-WORK", kind: "SLEEP_WINDOW", learnedOn: ago(daysAgo), group: { kind: "WORK", nights: 6, start: midpoint - 200, end: midpoint + 200, midpoint, spread: 30 }, evidence: { days: [{ id: "d2", at: ago(daysAgo) }] } });
const unusual: Learning = { id: "unusual-resting-x", kind: "UNUSUAL", learnedOn: ago(1), metric: "resting", reading: { direction: "ABOVE", days: [{ from: ago(2), value: 70, low: 50, high: 60 }, { from: ago(1), value: 72, low: 50, high: 60 }] } as never };
const experiment: Learning = { id: "exp-1", kind: "EXPERIMENT", learnedOn: ago(4), what: "Skip #caffeine", days: 14, outcome: "Slept better" };

let n = 0;
const answer = (l: Learning, action: LearningResponsePayload["action"], prev: string | null, extra: Partial<LearningResponsePayload> = {}, at = ago(0)): DomainEvent => ({
  id: `r${++n}`, type: "LEARNING_RESPONDED", occurredAt: at, recordedAt: at, source: "USER", correlationId: l.id, seq: n,
  payload: { learningId: l.id, action, statement: "words", evidence: evidenceOf(l), supersedes: prev, ...(action === "NARROW" ? { context: { preset: "WORK_DAYS" } } : {}), ...extra },
} as DomainEvent);
const life = (learnings: Learning[], events: DomainEvent[] = [], running: string[] = []) => deriveLifecycle({ learnings, responses: projectResponses(events), runningTags: new Set(running), now: NOW });
const stateOf = (items: ReturnType<typeof life>, id: string) => items.find((i) => i.learningId === id)!;

describe("C6.1 states from records alone", () => {
  it("an unusual streak is OBSERVED, a pattern is HYPOTHESIZED, a tested tag is PROVISIONAL, his own experiment is CONFIRMED", () => {
    const items = life([unusual, tag("caffeine", 360, 420), tag("gym", 430, 420), experiment], [], ["caffeine"]);
    expect([stateOf(items, unusual.id).state, stateOf(items, "tag-caffeine").state, stateOf(items, "tag-gym").state, stateOf(items, "exp-1").state])
      .toEqual(["OBSERVED", "PROVISIONAL", "HYPOTHESIZED", "CONFIRMED"]);
    expect(stateOf(items, "tag-gym").by).toBe("RECORDS");
  });
});

describe("C6.1 his answers", () => {
  const l = tag("caffeine", 360, 420);
  it("Keep → CONFIRMED, Narrow → CONTEXT_SPECIFIC, Not true → CONTESTED, Drop → RETIRED, each by YOU", () => {
    for (const [action, state] of [["KEEP", "CONFIRMED"], ["NARROW", "CONTEXT_SPECIFIC"], ["NOT_TRUE", "CONTESTED"], ["DROP", "RETIRED"]] as const) {
      const item = stateOf(life([l], [answer(l, action, null)]), l.id);
      expect([item.state, item.by], action).toEqual([state, "YOU"]);
    }
  });
  it("Undo returns to the answer before it, and to the records' state when none is left", () => {
    const a = answer(l, "KEEP", null), b = answer(l, "DROP", a.id), c = answer(l, "UNDO", b.id);
    expect(stateOf(life([l], [a, b]), l.id).state).toBe("RETIRED");
    expect(stateOf(life([l], [a, b, c]), l.id).state).toBe("CONFIRMED");
    const d = answer(l, "UNDO", c.id);
    expect(stateOf(life([l], [a, b, c, d]), l.id).state).toBe("HYPOTHESIZED");
    expect(stateOf(life([l], [a, b, c, d]), l.id).headId).toBe(d.id);
  });
  it("a kept pattern that reverses is CONTESTED by EVIDENCE; a small wobble is not", () => {
    const kept = answer(l, "KEEP", null); // kept when tagged days slept an hour less
    expect(stateOf(life([tag("caffeine", 470, 420)], [kept]), l.id)).toMatchObject({ state: "CONTESTED", by: "EVIDENCE" });
    expect(stateOf(life([tag("caffeine", 410, 420)], [kept]), l.id)).toMatchObject({ state: "CONFIRMED", by: "YOU" });
  });
  it("a kept sleep window that moves two hours or more is CONTESTED by EVIDENCE, across midnight too", () => {
    const w = window(700), kept = answer(w, "KEEP", null);
    expect(stateOf(life([window(760)], [kept]), w.id).state).toBe("CONFIRMED");
    expect(stateOf(life([window(820)], [kept]), w.id).state).toBe("CONTESTED");
    expect(reversed({ kind: "SLEEP_WINDOW", days: 6, midpoint: 1380 }, { kind: "SLEEP_WINDOW", days: 6, midpoint: 60 })).toBe(true);
    expect(reversed({ kind: "SLEEP_WINDOW", days: 6, midpoint: 1400 }, { kind: "SLEEP_WINDOW", days: 6, midpoint: 20 })).toBe(false);
  });
  it(`a kept learning with no evidence for ${OUTDATED_DAYS} days is OUTDATED; one the records no longer support is too`, () => {
    const old = tag("caffeine", 360, 420, OUTDATED_DAYS + 1), kept = answer(old, "KEEP", null);
    expect(stateOf(life([old], [kept]), old.id)).toMatchObject({ state: "OUTDATED", by: "EVIDENCE" });
    expect(stateOf(life([], [kept]), old.id)).toMatchObject({ state: "OUTDATED", learning: null, statement: "words" });
    expect(stateOf(life([], [answer(old, "DROP", null)]), old.id).state).toBe("RETIRED");
  });
  it("a broken or foreign chain is reported, never silently read", () => {
    const a = answer(l, "KEEP", null);
    expect(() => projectResponses([a, answer(l, "DROP", null)])).toThrow(/incomplete or conflicting/);
    expect(() => projectResponses([{ ...a, source: "SYSTEM" } as DomainEvent])).toThrow();
    expect(() => projectResponses([answer(l, "NARROW", null, { context: undefined })])).toThrow();
    expect(verdictOf([])).toBeNull();
  });
});

describe("C6.2 the weekly pick", () => {
  it("asks at most three: reversed first, then the newest unanswered patterns; never observations, experiments or answered ones", () => {
    const a = tag("a", 360, 420, 1), b = tag("b", 360, 420, 2), c = tag("c", 360, 420, 3), d = tag("d", 360, 420, 4), flipped = tag("e", 480, 420, 9);
    const keptE = answer({ ...flipped, comparison: { ...(flipped as Extract<Learning, { kind: "TAG" }>).comparison, withTag: { value: 360, days: 5 } } } as Learning, "KEEP", null);
    const keptA = answer(a, "KEEP", null);
    const pick = weeklyLearnings(life([a, b, c, d, flipped, unusual, experiment], [keptE, keptA]));
    expect(pick.map((i) => i.learningId)).toEqual(["tag-e", "tag-b", "tag-c"]);
  });
  it("is empty when there's nothing at its floor to ask", () => {
    expect(weeklyLearnings(life([unusual, experiment]))).toEqual([]);
  });
});

describe("C6.1 Alfred's context", () => {
  it("never includes a dropped learning, and says when he confirmed, narrowed or disputed one", async () => {
    const { deltaFacts } = await import("../src/application/deltaFacts");
    const a = tag("kept", 360, 420), b = tag("dropped", 360, 420), c = tag("narrow", 360, 420), d = tag("disputed", 360, 420), e = tag("open", 360, 420);
    const events = [answer(a, "KEEP", null), answer(b, "DROP", null), answer(c, "NARROW", null, { context: { preset: "AFTER_NIGHTS", words: "after the 3rd" } }), answer(d, "NOT_TRUE", null)];
    const items = life([a, b, c, d, e], events);
    const k = { topics: [], learnings: [a, b, c, d, e], suggestion: null, needle: { ready: false as const, judgedWeeks: 0, need: 4 } };
    const facts = deltaFacts(k, true, new Map(items.map((i) => [i.learningId, i] as const)));
    expect(facts.map((f) => f.id)).toEqual(["tag-kept", "tag-narrow", "tag-disputed", "tag-open"]);
    expect(facts[0]!.text).toMatch(/HE CONFIRMED THIS\.$/);
    expect(facts[1]!.text).toMatch(/HE SAYS IT APPLIES ONLY: after night shifts; after the 3rd\.$/);
    expect(facts[2]!.text).toMatch(/HE SAYS THIS IS NOT TRUE; do not rely on it\.$/);
    expect(facts[3]!.text).toMatch(/A pattern, not a cause\.$/);
  });
});
