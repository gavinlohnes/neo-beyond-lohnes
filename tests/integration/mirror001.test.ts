import { afterEach, describe, expect, it, vi } from "vitest";
import { logBodyweight, logSleep, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { logCleanDay, saveQuitHabit } from "../../src/application/quitCommands";
import { getMirror } from "../../src/application/mirrorQueries";

/** MIRROR-001: now vs 30 and 90 days ago, honest when there's nothing behind a value. */

afterEach(() => {
  vi.useRealTimers();
});

async function dayAt(at: Date, f: (dayId: string) => Promise<void>) {
  vi.setSystemTime(at);
  const day = await startDay();
  await f(day.id);
}

async function chest(dayId: string, weight: number) {
  const s = await startWorkout(dayId, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(dayId, s.id, "machine-chest-press", 1, weight, 10);
  await logSet(dayId, s.id, "machine-chest-press", 2, weight + 50, 10, "Dumbbell Press"); // a substitute: not this lift
  await completeWorkout(dayId, s.id, "STANDARD", "COMPLETED", 45);
}

describe("getMirror", () => {
  it("reads weight, the top lift, sleep and clean days as of now, 30 and 90 days ago", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = new Date(2026, 9, 14, 12);
    const back = (days: number, h = 10) => new Date(now.getTime() - days * 86_400_000 + (h - 12) * 3_600_000);

    await dayAt(back(95), async () => {
      await saveQuitHabit({ name: "Drinking" });
    });
    await dayAt(back(91), async (id) => {
      await logBodyweight(id, 214);
      await logSleep(id, 360, "PRIMARY");
      await chest(id, 100);
      await logCleanDay(id);
    });
    await dayAt(back(31), async (id) => {
      await logBodyweight(id, 209);
      await logBodyweight(id, 211);
      await logSleep(id, 420, "PRIMARY");
      await chest(id, 120);
    });
    await dayAt(back(1), async (id) => {
      await logBodyweight(id, 205.1);
      await logSleep(id, 450, "PRIMARY");
      await chest(id, 140);
      await logCleanDay(id);
    });
    vi.setSystemTime(now);

    const mirror = await getMirror(now);
    expect(mirror.lifts).toEqual([{ exerciseId: "machine-chest-press", name: "Machine Chest Press" }]);
    const [nowCol, d30, d90] = mirror.columns;
    expect(nowCol).toEqual({ daysAgo: 0, weightLbs: 205.1, avgSleepMinutes: 450, cleanDays: 1, liftLbs: [140] });
    expect(d30).toEqual({ daysAgo: 30, weightLbs: 210, avgSleepMinutes: 420, cleanDays: 0, liftLbs: [120] });
    expect(d90).toEqual({ daysAgo: 90, weightLbs: 214, avgSleepMinutes: 360, cleanDays: 1, liftLbs: [100] });
  });

  it("before the first day, or without a quit tracker, says nothing rather than guessing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = new Date(2026, 9, 14, 12);
    vi.setSystemTime(new Date(2026, 9, 10, 10));
    const day = await startDay();
    await logBodyweight(day.id, 200);
    vi.setSystemTime(now);
    const [nowCol, d30, d90] = (await getMirror(now)).columns;
    expect(nowCol).toMatchObject({ weightLbs: 200, avgSleepMinutes: null, cleanDays: null, liftLbs: [] });
    expect(d30).toEqual({ daysAgo: 30, weightLbs: null, avgSleepMinutes: null, cleanDays: null, liftLbs: [] });
    expect(d90!.weightLbs).toBeNull();
  });
});

describe("getMirror 0 lb sets", () => {
  it("a lift logged only at 0 lb (bodyweight) isn't a top lift", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = new Date(2026, 9, 14, 12);
    for (const d of [10, 11, 12]) {
      await dayAt(new Date(2026, 9, d, 10), async (id) => {
        const s = await startWorkout(id, "A", "STANDARD", { overrideConfirmed: true });
        await logSet(id, s.id, "pec-deck", 1, 0, 10);
        if (d === 12) await logSet(id, s.id, "machine-chest-press", 1, 100, 10);
        await completeWorkout(id, s.id, "STANDARD", "COMPLETED", 45);
      });
    }
    vi.setSystemTime(now);
    expect((await getMirror(now)).lifts.map((l) => l.exerciseId)).toEqual(["machine-chest-press"]);
  });
});
