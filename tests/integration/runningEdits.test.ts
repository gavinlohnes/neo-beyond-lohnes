import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDay, startDay } from "../../src/application/commands";
import {
  addRunningPlanEntry,
  advanceRunningPlan,
  correctRunningSession,
  editRunningPlanEntry,
  endRunningSession,
  resetRunningPlan,
  resetRunningPlanEntry,
  setRunningCuePreference,
  setRunningPosition,
  setRunningWeekSettings,
  startRunningSession,
  undoRunningAdvance,
  undoRunningPlanEdit,
  voidRunningSession,
} from "../../src/application/runningCommands";
import { getRunningHome, readRunningCuePreferences } from "../../src/application/runningQueries";
import { RUNNING_PLAN_FOUNDATION, type RunningSegment } from "../../src/domain/workout/runningPlan";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

/** GRAYSON-TRAIN-RUN-001: everything running is his to change, as append-only events. Both zones. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const advance = (seconds: number) => vi.setSystemTime(Date.now() + seconds * 1000);
const EDITED: RunningSegment[] = [
  { kind: "WARMUP", seconds: 300 },
  { kind: "RUN", seconds: 120 },
  { kind: "WALK", seconds: 90 },
  { kind: "RUN", seconds: 60 },
  { kind: "COOLDOWN", seconds: 300 },
];

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(16, 17));
  localStorage.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

async function finish(dayId: string, position?: { week: number; run: number }) {
  const s = await startRunningSession(dayId, position);
  advance(s.segments.reduce((t, x) => t + x.seconds, 0) + 1);
  return endRunningSession(s.id, "FINISHED");
}

describe("GRAYSON-TRAIN-RUN-001 his plan and corrections", () => {
  it("runs an edited run, and past sessions keep their snapshot", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const before = await finish(day.id, { week: 1, run: 2 });
    await editRunningPlanEntry({ week: 1, run: 2 }, EDITED);
    const home = await getRunningHome();
    expect(home.plan.edited).toBe(true);
    expect(home.list[0]![1]!.segments).toEqual(EDITED);
    const after = await startRunningSession(day.id, { week: 1, run: 2 });
    expect(after.segments).toEqual(EDITED);
    expect((await db.runningSessions.get(before.id))!.segments).toEqual(RUNNING_PLAN_FOUNDATION.weeks[0]![1]);
  });

  it("resets one run and the whole plan, and undoes a reset", async () => {
    await editRunningPlanEntry({ week: 1, run: 1 }, EDITED);
    await editRunningPlanEntry({ week: 2, run: 1 }, EDITED);
    await addRunningPlanEntry(3);
    expect((await getRunningHome()).list[2]).toHaveLength(4);

    await resetRunningPlanEntry({ week: 1, run: 1 });
    let home = await getRunningHome();
    expect(home.list[0]![0]!.segments).toEqual(RUNNING_PLAN_FOUNDATION.weeks[0]![0]);
    expect(home.list[1]![0]!.segments).toEqual(EDITED);
    await expect(resetRunningPlanEntry({ week: 3, run: 4 })).rejects.toThrow("You added this run");

    const reset = await resetRunningPlan();
    home = await getRunningHome();
    expect(home.plan.edited).toBe(false);
    expect(home.list[2]).toHaveLength(3);
    await undoRunningPlanEdit(reset.eventId);
    home = await getRunningHome();
    expect(home.list[1]![0]!.segments).toEqual(EDITED);
    expect(home.list[2]).toHaveLength(4);
    // Only the newest edit can be undone.
    await expect(undoRunningPlanEdit(reset.eventId)).rejects.toThrow("The plan has changed since.");
  });

  it("moves the weekly count with runs-per-week and the week's start day", async () => {
    vi.setSystemTime(at(17, 17)); // Tuesday's run
    const tuesday = await startDay(at(17, 16, 30).toISOString());
    await finish(tuesday.id);
    vi.setSystemTime(at(18, 17)); // now Wednesday
    await endDay(tuesday.id);
    await startDay(at(18, 16, 30).toISOString());
    expect((await getRunningHome()).week).toMatchObject({ done: 1, expected: 2, from: "2026-11-16" });
    await setRunningWeekSettings({ runsPerWeek: 3, showOptional: false, weekStartsOn: 3 }); // Wednesday
    expect((await getRunningHome()).week).toMatchObject({ done: 0, expected: 3, showOptional: false, from: "2026-11-18", to: "2026-11-24" });
    await expect(setRunningWeekSettings({ runsPerWeek: 5, showOptional: true, weekStartsOn: 1 })).rejects.toThrow("Runs a week can be 1 to 4.");
  });

  it("jumps the position forward and back, and undoes a Move on", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    await setRunningPosition({ week: 4, run: 2 });
    expect((await getRunningHome()).next!.position).toEqual({ week: 4, run: 2 });
    await setRunningPosition({ week: 2, run: 1 });
    expect((await getRunningHome()).next!.position).toEqual({ week: 2, run: 1 });
    await expect(setRunningPosition({ week: 10, run: 1 })).rejects.toThrow("That run isn't in your plan.");

    const done = await finish(day.id);
    const moved = await advanceRunningPlan(done.id);
    expect((await getRunningHome()).next!.position).toEqual({ week: 2, run: 2 });
    expect(await undoRunningAdvance(moved.eventId)).toEqual({ week: 2, run: 1 });
    expect((await getRunningHome()).next!.position).toEqual({ week: 2, run: 1 });
    await expect(undoRunningAdvance(moved.eventId)).rejects.toThrow("Your place in the plan has changed since.");
  });

  it("marks the foundation done after week 9 run 3", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    await setRunningPosition({ week: 9, run: 3 });
    const last = await finish(day.id);
    expect(await advanceRunningPlan(last.id)).toMatchObject({ done: true });
    const home = await getRunningHome();
    expect(home.done).toBe(true);
    expect(home.next).toBeNull();
    await expect(startRunningSession(day.id)).rejects.toThrow("The foundation is done.");
  });

  it("corrects status, minutes and day of a past run, and a void drops it from the week and the position", async () => {
    vi.setSystemTime(at(18, 17));
    const day = await startDay(at(18, 16, 30).toISOString());
    const s = await startRunningSession(day.id);
    advance(600);
    await endRunningSession(s.id, "STOPPED");
    await correctRunningSession(s.id, { status: "COMPLETED", completedSeconds: 1710 });
    let entry = (await getRunningHome()).history[0]!;
    expect(entry).toMatchObject({ status: "COMPLETED", completedSeconds: 1710, corrected: true, recorded: { status: "PARTIAL", completedSeconds: 600 } });
    expect((await getRunningHome()).week.done).toBe(1);
    await correctRunningSession(s.id, { dayDate: "2026-11-14" }); // last week
    entry = (await getRunningHome()).history[0]!;
    expect(entry.dayDate).toBe("2026-11-14");
    expect((await getRunningHome()).week.done).toBe(0);
    await expect(correctRunningSession(s.id, { dayDate: "2026-02-30" })).rejects.toThrow("Choose a real date.");
    await expect(correctRunningSession(s.id, { status: "COMPLETED" })).rejects.toThrow("Nothing changed.");
    const chain = (await db.events.where("type").equals("RUNNING_SESSION_CORRECTED").toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect((chain[1]!.payload as { supersedesEventId?: string }).supersedesEventId).toBe(chain[0]!.id);
    // The recorded row is never edited.
    expect((await db.runningSessions.get(s.id))!).toMatchObject({ status: "PARTIAL", completedSeconds: 600 });

    // A corrected-to-COMPLETED run can move him on; voiding it takes that back too.
    await correctRunningSession(s.id, { dayDate: "2026-11-18" });
    await advanceRunningPlan(s.id);
    expect((await getRunningHome()).next!.position).toEqual({ week: 1, run: 2 });
    await voidRunningSession(s.id);
    const home = await getRunningHome();
    expect(home.history).toEqual([]);
    expect(home.week.done).toBe(0);
    expect(home.next!.position).toEqual({ week: 1, run: 1 });
    await expect(voidRunningSession(s.id)).rejects.toThrow("already removed");
  });

  it("refuses edits that can't run, with a plain message", async () => {
    await expect(editRunningPlanEntry({ week: 1, run: 1 }, [{ kind: "WARMUP", seconds: 300 }, { kind: "WALK", seconds: 60 }])).rejects.toThrow("A run needs at least one running interval.");
    await expect(editRunningPlanEntry({ week: 1, run: 1 }, [{ kind: "RUN", seconds: 4 }])).rejects.toThrow("Each interval needs at least 5 seconds.");
    await expect(editRunningPlanEntry({ week: 1, run: 1 }, [{ kind: "RUN", seconds: 5405 }])).rejects.toThrow("An interval can be at most 90 minutes.");
    expect(await db.events.count()).toBe(0);
  });

  it("carries corrections, plan edits and the three cue preferences through a native backup", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const done = await finish(day.id);
    await correctRunningSession(done.id, { completedSeconds: 1500 });
    await editRunningPlanEntry({ week: 1, run: 2 }, EDITED);
    await setRunningWeekSettings({ runsPerWeek: 3, showOptional: true, weekStartsOn: 0 });
    setRunningCuePreference("buzz", false);
    setRunningCuePreference("halfway", false);
    setRunningCuePreference("keepAwake", false);
    const before = await getRunningHome();
    const blob = await exportNativeBackup(false);
    const parsed = JSON.parse(await blob.text()) as { beyondSettings?: { values: Record<string, string> } };
    expect(parsed.beyondSettings?.values).toMatchObject({ "beyond:runningBuzz": "off", "beyond:runningHalfwayCue": "off", "beyond:runningKeepAwake": "off" });
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    localStorage.clear();
    expect(readRunningCuePreferences()).toEqual({ buzz: true, halfway: true, keepAwake: true });
    await applyRestore(new File([blob], "beyond.json"));
    const after = await getRunningHome();
    expect(after.history).toEqual(before.history);
    expect(after.list).toEqual(before.list);
    expect(after.plan.plan.runsPerWeek).toBe(3);
    expect(readRunningCuePreferences()).toEqual({ buzz: false, halfway: false, keepAwake: false });
  });
});
