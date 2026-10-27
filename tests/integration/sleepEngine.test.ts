import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logSleep, setPlannedWork, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { traceShortSleepStreak } from "../../src/engine/evaluate";

/**
 * SLEEP-ENGINE-001 (owner approval 2026-10-27): two short main sleeps against your own usual range turn
 * GREEN's planned work into the reduced session — nothing else about the recommendation changes.
 */
beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(async () => { vi.useRealTimers(); await db.delete(); });

const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 0, alcoholUrge: 0 } as const;
const start = new Date(2026, 7, 20); // a usual range needs 10 work days in the 56 before the last 7
const at = (index: number, hour: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, hour);

/** Work days, one per lived day, with the given main sleep (minutes); the last stays active. */
async function seed(sleeps: (number | null)[]) {
  let id = "";
  for (const [index, minutes] of sleeps.entries()) {
    vi.setSystemTime(at(index, 18));
    const day = await startDay(); id = day.id;
    await setWorkContext(day.id, "WORK", "MANUAL");
    if (minutes !== null) await logSleep(day.id, minutes, "PRIMARY");
    if (index < sleeps.length - 1) { vi.setSystemTime(at(index + 1, 16)); await endDay(day.id); }
  }
  await setPlannedWork(id, true);
  return id;
}
const usual = Array<number>(40).fill(420);

describe("SLEEP-ENGINE-001 — the Engine's one sleep fact", () => {
  it("suggests the reduced session after two short main sleeps, with the nights in the trace", async () => {
    const id = await seed([...usual, 300, 290]);
    const { recommendation } = await submitCheckIn(id, GREEN);
    expect(recommendation.kind).toBe("EXECUTE_PLANNED_WORK");
    expect(recommendation.title).toBe("Proceed with planned work — reduced session");
    expect(traceShortSleepStreak(recommendation.trace)).toBe(true);
    const evidence = JSON.parse(String(recommendation.trace.inputs.find((i) => i.key === "shortSleepEvidence")!.value));
    expect(evidence.map((n: { minutes: number; kind: string; low: number; high: number }) => [n.minutes, n.kind, n.low, n.high])).toEqual([[290, "WORK", 405, 435], [300, "WORK", 405, 435]]);
  });

  it("waits for today's main sleep: before it is logged, the two nights before decide", async () => {
    const id = await seed([...usual, 300, 290, null]);
    expect(traceShortSleepStreak((await submitCheckIn(id, GREEN)).recommendation.trace)).toBe(true);
    await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); });
    const other = await seed([...usual, 420, 290, null]);
    expect(traceShortSleepStreak((await submitCheckIn(other, GREEN)).recommendation.trace)).toBe(false);
  });

  it("changes nothing after one short night, while the usual is still being learned, or under YELLOW", async () => {
    const one = await seed([...usual, 420, 290]);
    expect((await submitCheckIn(one, GREEN)).recommendation.title).toBe("Proceed with planned work");
    await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); });
    const learning = await seed([420, 420, 420, 300, 290]);
    const early = (await submitCheckIn(learning, GREEN)).recommendation;
    expect(early.title).toBe("Proceed with planned work");
    expect(early.trace.inputs).toContainEqual({ key: "shortSleepStreak", value: false });
    const yellow = (await submitCheckIn(learning, { ...GREEN, energy: 2 })).recommendation;
    expect(yellow.kind).toBe("RECOVER");
  });
});
