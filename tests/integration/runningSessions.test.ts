import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDay, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getCurrentProgressionSuggestions, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getTrainingHistory } from "../../src/application/trainHistoryQueries";
import { getTrainProgress } from "../../src/application/trainProgressQueries";
import {
  advanceRunningPlan,
  endRunningSession,
  pauseRunningSession,
  resumeRunningSession,
  startRunningSession,
} from "../../src/application/runningCommands";
import { getActiveRunningSession, getRunningHome, nextRun, runningElapsedSeconds } from "../../src/application/runningQueries";
import { currentSegment } from "../../src/domain/workout/runningCues";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-TRAIN-RUN-001: running sessions. Runs in TZ=UTC and TZ=America/Chicago; every time here is local, so a
 * lived day (16:30 to 16:30) and the Monday–Sunday week mean the same thing in both.
 */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const set = (d: Date) => vi.setSystemTime(d);
const advance = (seconds: number) => vi.setSystemTime(Date.now() + seconds * 1000);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  set(at(16, 17));
  localStorage.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

/** Runs a whole plan run to its end and returns the ended session. */
async function finishRun(dayId: string) {
  const session = await startRunningSession(dayId);
  advance(session.segments.reduce((t, s) => t + s.seconds, 0) + 5);
  return endRunningSession(session.id, "FINISHED");
}

describe("GRAYSON-TRAIN-RUN-001 running sessions", () => {
  it("starts, pauses, resumes and ends COMPLETED, with every step an event", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    expect((await nextRun())!.position).toEqual({ week: 1, run: 1 });
    const session = await startRunningSession(day.id);
    expect(session).toMatchObject({ week: 1, run: 1, status: "ACTIVE", pausedMs: 0, kind: "PLAN_RUN", phase: "FOUNDATION" });
    advance(400);
    await pauseRunningSession(session.id);
    advance(120); // paused: doesn't count
    const resumed = await resumeRunningSession(session.id);
    expect(resumed.pausedMs).toBe(120_000);
    expect(runningElapsedSeconds(resumed)).toBe(400);
    advance(1710 - 400);
    const ended = await endRunningSession(session.id, "FINISHED");
    expect(ended).toMatchObject({ status: "COMPLETED", completedSeconds: 1710, endReason: "FINISHED" });
    const types = (await db.events.toArray()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map((e) => e.type).filter((t) => t.startsWith("RUNNING_"));
    expect(types).toEqual(["RUNNING_SESSION_STARTED", "RUNNING_SESSION_PAUSED", "RUNNING_SESSION_RESUMED", "RUNNING_SESSION_ENDED"]);
    // Ending never moves the plan on by itself.
    expect((await nextRun())!.position).toEqual({ week: 1, run: 1 });
  });

  it("recovers the right interval after a reload, from timestamps alone", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const session = await startRunningSession(day.id);
    advance(3 * 60 + 2 * 60 + 10); // 5:10 in: 10 s into the first 1-minute run
    const reloaded = (await getActiveRunningSession())!;
    const position = currentSegment(reloaded.segments, runningElapsedSeconds(reloaded))!;
    expect(position).toMatchObject({ index: 1, segment: { kind: "RUN", seconds: 60 }, remaining: 50 });
    expect(reloaded.id).toBe(session.id);
  });

  it("PARTIAL and PAIN never advance; advance happens only through the command; repeat keeps the position", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const early = await startRunningSession(day.id);
    advance(600);
    expect(await endRunningSession(early.id, "STOPPED")).toMatchObject({ status: "PARTIAL", endReason: "STOPPED", completedSeconds: 600 });
    await expect(advanceRunningPlan(early.id)).rejects.toThrow("Only a finished run moves the plan on.");

    const hurt = await startRunningSession(day.id);
    advance(1800); // even past the end, the pain control is PARTIAL
    expect(await endRunningSession(hurt.id, "PAIN")).toMatchObject({ status: "PARTIAL", endReason: "PAIN" });
    await expect(advanceRunningPlan(hurt.id)).rejects.toThrow();

    const blip = await startRunningSession(day.id);
    advance(20);
    expect(await endRunningSession(blip.id, "STOPPED")).toMatchObject({ status: "ABANDONED" });
    await expect(advanceRunningPlan(blip.id)).rejects.toThrow();

    const done = await finishRun(day.id);
    expect(done.status).toBe("COMPLETED");
    // Repeat: no command, nothing moves.
    expect((await nextRun())!.position).toEqual({ week: 1, run: 1 });
    expect(await advanceRunningPlan(done.id)).toMatchObject({ to: { week: 1, run: 2 }, done: false });
    expect((await nextRun())!.position).toEqual({ week: 1, run: 2 });
    expect(await db.events.where("type").equals("RUNNING_PLAN_ADVANCED").count()).toBe(1);
  });

  it("allows one ACTIVE running session and refuses to start one during a lift workout", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const first = await startRunningSession(day.id);
    expect((await startRunningSession(day.id)).id).toBe(first.id);
    expect(await db.runningSessions.where("status").equals("ACTIVE").count()).toBe(1);
    await endRunningSession(first.id, "STOPPED");
    const lift = await startWorkout(day.id, "A", "STANDARD");
    await expect(startRunningSession(day.id)).rejects.toThrow("Finish or stop your workout before starting a run.");
    await completeWorkout(day.id, lift.id, "STANDARD", "PARTIAL");
    await expect(startRunningSession(day.id)).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("counts the week Monday–Sunday by lived day, across a lived day that crosses midnight", async () => {
    // Sunday Nov 15 lived day (16:30 Sun to 16:30 Mon): a run at 01:00 Monday counts on Sunday, last week.
    set(at(15, 16, 30));
    const sunday = await startDay(at(15, 16, 30).toISOString());
    set(at(16, 1));
    await finishRun(sunday.id);
    set(at(16, 16, 31));
    await endDay(sunday.id);
    const monday = await startDay(at(16, 16, 31).toISOString());
    set(at(17, 2)); // Tuesday 02:00, still Monday's lived day
    expect((await getRunningHome()).week).toMatchObject({ done: 0, expected: 2, from: "2026-11-16", to: "2026-11-22" });
    await finishRun(monday.id);
    const week = (await getRunningHome()).week;
    expect(week).toMatchObject({ done: 1, expected: 2, showOptional: true, from: "2026-11-16" });
    expect((await getRunningHome()).history.map((h) => h.dayDate)).toEqual(["2026-11-16", "2026-11-15"]);
  });

  it("survives a native backup round trip, and an older backup restores with no running history", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const done = await finishRun(day.id);
    await advanceRunningPlan(done.id);
    const before = await getRunningHome();
    const blob = await exportNativeBackup(false);
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    await applyRestore(new File([blob], "beyond.json"));
    const after = await getRunningHome();
    expect(after.history).toEqual(before.history);
    expect(after.next!.position).toEqual({ week: 1, run: 2 });

    // An older backup: the same file with the runningSessions table and every running event taken out.
    const raw = JSON.parse(await blob.text()) as { data: { tables: { name: string }[]; data: { tableName: string; rows: { type?: string }[] }[] } };
    raw.data.tables = raw.data.tables.filter((t) => t.name !== "runningSessions");
    raw.data.data = raw.data.data.filter((t) => t.tableName !== "runningSessions").map((t) => t.tableName === "events" ? { ...t, rows: t.rows.filter((r) => !r.type?.startsWith("RUNNING_")) } : t);
    await applyRestore(new File([JSON.stringify(raw)], "older.json"));
    const older = await getRunningHome();
    expect(older.history).toEqual([]);
    expect(older.next!.position).toEqual({ week: 1, run: 1 });
  });

  it("skips a malformed row instead of breaking TRAIN", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    await finishRun(day.id);
    await db.runningSessions.put({ id: "broken", beyondDayId: day.id, status: "COMPLETED" } as never);
    await db.runningSessions.put({ id: "bad-active", status: "ACTIVE", segments: "nope" } as never);
    const home = await getRunningHome();
    expect(home.history).toHaveLength(1);
    expect(home.active).toBeNull();
    expect(await getActiveRunningSession()).toBeNull();
  });

  it("leaves lift progression, PRs, history and the A/B/C sequence unchanged", async () => {
    const day = await startDay(at(16, 16, 30).toISOString());
    const lift = await startWorkout(day.id, "A", "STANDARD");
    for (const n of [1, 2, 3]) await logSet(day.id, lift.id, "machine-chest-press", n, 135, 12);
    await completeWorkout(day.id, lift.id, "STANDARD", "COMPLETED");
    const snapshot = async () => ({
      next: await suggestTemplateForNextWorkout(),
      progression: await getCurrentProgressionSuggestions(),
      history: await getTrainingHistory(),
      progress: await getTrainProgress(at(16, 20)),
    });
    const before = await snapshot();
    const done = await finishRun(day.id);
    await advanceRunningPlan(done.id);
    const partial = await startRunningSession(day.id);
    advance(300);
    await endRunningSession(partial.id, "PAIN");
    expect(await snapshot()).toEqual(before);
  });
});
