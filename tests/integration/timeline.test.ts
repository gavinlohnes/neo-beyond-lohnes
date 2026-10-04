import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { buildTimeline, getTimeline } from "../../src/application/timelineQueries";
import { describeMilestone, trendDirection, type WeighIn } from "../../src/application/bodyTrendQueries";
import type { RecordCard } from "../../src/application/personalRecordQueries";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";

/**
 * BODY-TIMELINE-001: the transformation timeline. Read only; every label is
 * the wording its source already uses.
 */

const NOW = new Date("2026-10-04T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const weigh = (n: number, weightLbs: number): WeighIn => ({ recordedAt: daysAgo(n), weightLbs });

const history = [weigh(80, 200), weigh(60, 197), weigh(40, 194), weigh(30, 191), weigh(20, 189), weigh(14, 188), weigh(10, 187.5), weigh(7, 187), weigh(1, 186)];
const record: RecordCard = {
  setId: "s1",
  exerciseName: "Machine Chest Press",
  record: { kind: "HEAVIEST", weight: 145, reps: 6 },
  recordedAt: daysAgo(10),
};

describe("buildTimeline (pure)", () => {
  it("pins PRs, clean-day milestones, weight milestones and the goal, in date order", () => {
    const cleanDayStarts = Array.from({ length: 30 }, (_, i) => daysAgo(40 - i));
    const t = buildTimeline({ history, goalWeightLbs: 175, records: [record], cleanDayStarts, now: NOW });
    const kinds = new Set(t.events.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["PR", "CLEAN_DAY_MILESTONE", "WEIGHT_MILESTONE", "GOAL"]));
    expect(t.events.map((e) => e.date)).toEqual([...t.events.map((e) => e.date)].sort());
    expect(t.events.find((e) => e.kind === "PR")!.label).toBe("Machine Chest Press: heaviest yet (145 lb)");
    expect(t.events.filter((e) => e.kind === "CLEAN_DAY_MILESTONE").map((e) => [e.label, e.date])).toEqual([
      ["7 clean days", daysAgo(34)],
      ["30 clean days", daysAgo(11)],
    ]);
    expect(t.events.find((e) => e.kind === "GOAL")!.label).toMatch(/^Goal 175 lb — at this pace, about /);
  });

  it("weight milestones use the weight trend's own wording, once per new 5-lb step", () => {
    const t = buildTimeline({ history, goalWeightLbs: 175, records: [], cleanDayStarts: [], now: NOW });
    const labels = t.events.filter((e) => e.kind === "WEIGHT_MILESTONE").map((e) => e.label);
    expect(labels).toEqual(["Down 5 lb since Jul 16", "Down 10 lb since Jul 16"]);
    expect(labels.at(-1)).toBe(describeMilestone(history.slice(0, 5), trendDirection(history, 175)));
  });

  it("leaves out events and weigh-ins older than 90 days", () => {
    const old: RecordCard = { ...record, recordedAt: daysAgo(120) };
    const t = buildTimeline({ history: [weigh(120, 210), ...history], goalWeightLbs: undefined, records: [old], cleanDayStarts: [], now: NOW });
    expect(t.weighIns[0]!.recordedAt).toBe(daysAgo(80));
    expect(t.events.some((e) => e.kind === "PR")).toBe(false);
  });

  it("no goal pin without a projected date", () => {
    const flat = [weigh(20, 190), weigh(10, 190), weigh(1, 190)];
    const t = buildTimeline({ history: flat, goalWeightLbs: 175, records: [], cleanDayStarts: [], now: NOW });
    expect(t.events.some((e) => e.kind === "GOAL")).toBe(false);
  });
});

describe("getTimeline (real Dexie)", () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(() => {
    db.close();
  });

  it("is empty without weigh-ins and writes nothing", async () => {
    const before = await db.events.count();
    const t = await getTimeline(NOW);
    expect(t.weighIns).toEqual([]);
    expect(await db.events.count()).toBe(before);
  });

  it("shows the same PRs as TRAIN → RECORDS", async () => {
    const day = await startDay();
    for (const [weight, reps] of [[135, 10], [145, 6]] as const) {
      const s = await startWorkout(day.id, "A", "STANDARD");
      await logSet(day.id, s.id, "machine-chest-press", 1, weight, reps);
      await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED");
    }
    const t = await getTimeline(new Date(Date.now() + 1000));
    expect(t.events.filter((e) => e.kind === "PR").map((e) => e.label)).toEqual(["Machine Chest Press: heaviest yet (145 lb)"]);
  });
});
