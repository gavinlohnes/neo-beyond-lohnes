import { describe, expect, it } from "vitest";
import { deltaQuestion, deriveDelta, newLearnings } from "../../src/application/delta";
import type { DaySummary } from "../../src/engine/dayLedger";
import type { ExternalSleep } from "../../src/domain/health/sleepImport";
import type { StateCheckIn } from "../../src/domain/common/types";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { describeLearning } from "../../src/ui/components/DeltaViews";

/** DELTA-GROWS-001. Invented records only. */
const NOW = new Date(2026, 10, 9, 20, 0);
const startOf = (i: number) => new Date(2026, 9, i, 18, 0);
const summary = (i: number, kind: "WORK" | "OFF", sleep?: number) => ({
  beyondDayId: `d${i}`, startedAt: startOf(i).toISOString(), livedDayStart: mostRecentBoundaryAtOrBefore(startOf(i)).toISOString(),
  work: { declared: kind }, sleep: sleep === undefined ? {} : { primaryMinutes: sleep }, workouts: [],
}) as unknown as DaySummary;
const night = (i: number, hourLocal: number, hours: number): ExternalSleep => {
  const start = new Date(2026, 9, i, hourLocal, 0);
  return { id: `s${i}`, dataOriginPackage: "garmin", lastModifiedTime: start.toISOString(), startTime: start.toISOString(), endTime: new Date(start.getTime() + hours * 3_600_000).toISOString(), startZoneOffsetSeconds: null, endZoneOffsetSeconds: null, stages: [] };
};

describe("DELTA", () => {
  it("starts knowing nothing, and says exactly what would teach it", () => {
    const k = deriveDelta({ sleeps: [], summaries: [], notes: [], checkIns: [], now: NOW });
    expect(k.learnings).toEqual([]);
    expect(k.topics.map((t) => [t.id, t.state])).toEqual([["sleep-WORK", "NOT_STARTED"], ["sleep-OFF", "NOT_STARTED"], ["tags", "NOT_STARTED"], ["check-ins", "NOT_STARTED"], ["training", "NOT_STARTED"], ["experiments", "NOT_STARTED"]]);
    expect(k.suggestion).toBeNull();
    expect(deltaQuestion(k, "OFF").text).toBe("What did you do for yourself today?");
    expect(deltaQuestion(k, "WORK").text).toBe("What's one thing that shaped today? Tag it below.");
  });

  it("learns a sleep window on the day the 3rd measured night existed, and dates the notebook from history", () => {
    // Work days 20–23 Oct: asleep 19:00 local (in lived day starting 16:30) for 7 h.
    const summaries = [20, 21, 22, 23].map((i) => summary(i, "WORK"));
    const sleeps = [20, 21, 22, 23].map((i) => night(i, 19, 7));
    const k = deriveDelta({ sleeps, summaries, notes: [], checkIns: [], now: NOW });
    expect(k.topics.find((t) => t.id === "sleep-WORK")).toMatchObject({ state: "KNOWN", have: 4 });
    expect(k.topics.find((t) => t.id === "sleep-OFF")?.state).toBe("NOT_STARTED");
    const learned = k.learnings.find((l) => l.id === "sleep-WORK")!;
    expect(learned.learnedOn).toBe(summaries[2]!.livedDayStart);
    expect(describeLearning(learned)).toMatch(/^Learned when you sleep\. Work days: asleep around 7:00 pm, up around 2:00 am/);
    expect(newLearnings(k, summaries[2]!.livedDayStart)).toEqual([]);
    expect(newLearnings(k, summaries[1]!.livedDayStart)).toHaveLength(1);
  });

  it("dates a tag on the day both sides first had enough evidence, not the 3rd tagged day", () => {
    // #sauna on Oct 1–3; untagged notes only on Oct 10–12. Next-day sleep is logged every day through Oct 13.
    const summaries = Array.from({ length: 13 }, (_, k) => summary(k + 1, "OFF", 420));
    const notes = [1, 2, 3].map((i) => ({ dayId: `d${i}`, text: "#sauna" })).concat([10, 11, 12].map((i) => ({ dayId: `d${i}`, text: "fine" })));
    const k = deriveDelta({ sleeps: [], summaries, notes, checkIns: [], now: NOW });
    const learned = k.learnings.find((l) => l.id === "tag-sauna")!;
    // Oct 12: the 3rd untagged day exists, so "trained that day" (same-day) first compares; next-day sleep follows Oct 13.
    expect(learned.learnedOn).toBe(summaries[11]!.startedAt);
    expect(newLearnings(k, summaries[3]!.startedAt)).toContain(learned); // still "new" after Oct 3
  });

  it("offers to test a tag that lines up with shorter next-day sleep, notes finished experiments, and stays quiet while one runs", () => {
    // #latecoffee on Oct 1, 3, 5, 7: the next day's sleep is 5h; other noted days, 7h.
    const summaries = Array.from({ length: 12 }, (_, k) => summary(k + 1, "OFF", [2, 4, 6, 8].includes(k + 1) ? 300 : 420));
    const notes = Array.from({ length: 11 }, (_, k) => ({ dayId: `d${k + 1}`, text: [1, 3, 5, 7].includes(k + 1) ? "#latecoffee" : "fine" }));
    const offer = deriveDelta({ sleeps: [], summaries, notes, checkIns: [], now: NOW });
    expect(offer.suggestion).toEqual({ tag: "latecoffee", what: "Skip #latecoffee", days: 14, minutesLess: 120, taggedDays: 4 });
    const exp = (status: "OPEN" | "REVIEWED", fromDay: number) => ({
      entry: { id: `e${fromDay}`, title: "Try: Skip #latecoffee", status, outcome: status === "REVIEWED" ? "It helped" : undefined, reviewedAt: status === "REVIEWED" ? new Date(2026, 10, 1).toISOString() : undefined },
      what: "Skip #latecoffee", from: new Date(2026, 9, fromDay, 16, 30), to: new Date(2026, 9, fromDay + 14, 16, 30), scope: "ALL", days: 14,
    }) as never;
    const done = deriveDelta({ sleeps: [], summaries, notes, checkIns: [], experiments: [exp("REVIEWED", 10)], now: NOW });
    expect(done.suggestion).toBeNull(); // already tested
    expect(done.topics.find((t) => t.id === "experiments")).toMatchObject({ state: "KNOWN", have: 1 });
    expect(describeLearning(done.learnings.find((l) => l.kind === "EXPERIMENT")!)).toBe('Learned from your experiment "Skip #latecoffee" (14 days): It helped.');
    const running = deriveDelta({ sleeps: [], summaries, notes: notes.map((n) => ({ ...n, text: n.text.replace("latecoffee", "nap") })), checkIns: [], experiments: [{ ...(exp("OPEN", 2) as object), what: "Something else", from: new Date(2026, 10, 2, 16, 30), to: new Date(2026, 10, 16, 16, 30) } as never], now: NOW });
    expect(running.suggestion).toBeNull();
    expect(running.topics.find((t) => t.id === "experiments")?.state).toBe("LEARNING");
  });

  it("tracks tags and check-ins as still learning until they have enough days", () => {
    const summaries = [1, 2].map((i) => summary(i, "OFF"));
    const k = deriveDelta({ sleeps: [], summaries, notes: [{ dayId: "d1", text: "#sauna" }], checkIns: [{ id: "c", beyondDayId: "d1", recordedAt: startOf(1).toISOString(), energy: 3, mood: 3 } as unknown as StateCheckIn], now: NOW });
    expect(k.topics.find((t) => t.id === "tag-sauna")).toMatchObject({ state: "LEARNING", have: 1, need: 3 });
    expect(k.topics.find((t) => t.id === "check-ins")).toMatchObject({ state: "LEARNING", have: 1, need: 7 });
    expect(deltaQuestion(k, "WORK").text).toBe("How is your energy right now, and why?");
  });
});
