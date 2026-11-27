import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { completeRecoverySession, startWorkout } from "../../src/application/trainCommands";
import { deriveRecoverySessionStatus } from "../../src/engine/trainSuggestion";
import { getMinimumDayStatus } from "../../src/application/queries";
import { suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import {
  deleteStretchRoutine, getStretchRoutines, getStretchSuggestion, pickStretchSuggestion, resetStarterRoutine, saveStretchRoutine,
  writeStretchSuggestSettings, DEFAULT_STRETCH_SUGGEST,
} from "../../src/application/stretchRoutines";
import { finishStretchSession, readStretchPlay, startStretchSession, stretchCuePayload, stretchMinutes } from "../../src/application/stretchSession";
import { DEFAULT_RUN_CUE_PREFS } from "../../src/application/runCuePrefs";
import { STARTER_ROUTINES } from "../../src/domain/workout/stretchLibrary";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** GRAYSON-HOME-STRETCH-001 slice B through the application layer. Run under TZ=UTC and TZ=America/Chicago. */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
beforeEach(async () => {
  await db.open(); localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(1, 12));
});
afterEach(() => { vi.useRealTimers(); db.close(); });

describe("stretch routines ride on one event", () => {
  it("with none saved, the three starters; edit, delete and RESET each write the whole list; a stale save is refused", async () => {
    const first = await getStretchRoutines();
    expect(first.id).toBeNull();
    expect(first.routines.map((r) => r.name)).toEqual(["After shift", "Before sleep", "After lifting"]);
    const edited = { ...first.routines[0]!, steps: first.routines[0]!.steps.map((s) => ({ ...s, holdSeconds: 45 })) };
    const saved = await saveStretchRoutine(edited, null);
    expect((await getStretchRoutines()).routines[0]!.steps.every((s) => s.holdSeconds === 45)).toBe(true);
    await expect(saveStretchRoutine(edited, null)).rejects.toThrow(/changed/); // the list moved on
    const reset = await resetStarterRoutine("AFTER_SHIFT", saved.id);
    expect((await getStretchRoutines()).routines[0]).toEqual(STARTER_ROUTINES.AFTER_SHIFT);
    const gone = await deleteStretchRoutine("starter-before-sleep", reset.id);
    expect((await getStretchRoutines()).routines.map((r) => r.name)).toEqual(["After shift", "After lifting"]);
    await resetStarterRoutine("BEFORE_SLEEP", gone.id);
    expect((await getStretchRoutines()).routines.map((r) => r.name)).toEqual(["After shift", "After lifting", "Before sleep"]);
    expect(await db.events.where("type").equals("STRETCH_ROUTINES_SET").count()).toBe(4);
    // Global configuration, like TRAIN_PROGRAM_SET: no lived day.
    expect((await db.events.where("type").equals("STRETCH_ROUTINES_SET").first())!.beyondDayId).toBeUndefined();
  });

  it("an invalid routine is refused before anything is written", async () => {
    const r = { ...STARTER_ROUTINES.AFTER_SHIFT, id: "own-1", name: "Mine", steps: [{ stretchId: "stretch-childs-pose", holdSeconds: 2, bothSides: false, rounds: 1 }] };
    await expect(saveStretchRoutine(r, null)).rejects.toThrow(/Holds are/);
    expect(await db.events.where("type").equals("STRETCH_ROUTINES_SET").count()).toBe(0);
  });
});

describe("logged as recovery", () => {
  it("played to the end it's COMPLETED whatever its length; stopped early the minutes rule stands; it never moves the rotation", async () => {
    const day = await startDay();
    const nextBefore = await suggestTemplateForNextWorkout();
    const routine = STARTER_ROUTINES.BEFORE_SLEEP; // 8 minutes
    const t0 = Date.now();
    const session = await startStretchSession(routine, t0);
    expect(session.sessionType).toBe("RECOVERY");
    const play = readStretchPlay(session.id)!;
    expect(stretchMinutes(play, true, t0 + 480_000)).toBe(8);
    await finishStretchSession(session, play, true, t0 + 480_000);
    const done = (await db.workoutSessions.get(session.id))!;
    expect(done).toMatchObject({ status: "COMPLETED", stretchRoutine: { id: routine.id, name: "Before sleep", completed: true } });
    const event = (await db.events.where("type").equals("WORKOUT_COMPLETED").toArray()).find((e) => (e.payload as { sessionId: string }).sessionId === session.id)!;
    expect(event.payload).toMatchObject({ sessionType: "RECOVERY", status: "COMPLETED", durationMinutes: 8, stretchRoutine: { name: "Before sleep", completed: true } });
    expect(readStretchPlay(session.id)).toBeNull();
    expect(await suggestTemplateForNextWorkout()).toBe(nextBefore);

    // Stopped after 4 minutes: PARTIAL, as today's rule says for 1–9 minutes.
    const t1 = Date.now();
    const early = await startStretchSession(routine, t1);
    await finishStretchSession(early, readStretchPlay(early.id)!, false, t1 + 4 * 60_000 + 20_000);
    expect((await db.workoutSessions.get(early.id))!).toMatchObject({ status: "PARTIAL", stretchRoutine: { completed: false } });
    void day;
  });

  it("every other recovery session reads exactly as before, and Minimum Day still reads minutes", async () => {
    expect(deriveRecoverySessionStatus(15)).toBe("COMPLETED");
    expect(deriveRecoverySessionStatus(5)).toBe("PARTIAL");
    expect(deriveRecoverySessionStatus(0)).toBe("ABANDONED");
    expect(deriveRecoverySessionStatus(5, true)).toBe("COMPLETED");
    const day = await startDay();
    const plain = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, plain.id, 5);
    const row = (await db.workoutSessions.get(plain.id))!;
    expect(row.status).toBe("PARTIAL");
    expect(row.stretchRoutine).toBeUndefined();
    // Minimum Day reads a recovery session's minutes, never its status: 5 minutes meets MOVE (5) as before.
    expect((await getMinimumDayStatus(day.id)).move).toBe(true);
  });
});

describe("fits the hour", () => {
  const settings = DEFAULT_STRETCH_SUGGEST;
  it("picks from shift, sleep and lifting times, the nearest when more than one fits, and says why", () => {
    // 6:30 after a shift that ended at 6:00, usual sleep at 9:00 (2.5 h away): After shift.
    expect(pickStretchSuggestion({ now: at(16, 6, 30), settings, shiftEndedAt: at(16, 6), sleepStartsAt: at(16, 9), liftedAt: null }))
      .toEqual({ starter: "AFTER_SHIFT", why: "Your shift ended at 6:00." });
    // An hour before his usual sleep at 23:00: Before sleep.
    expect(pickStretchSuggestion({ now: at(16, 22), settings, shiftEndedAt: null, sleepStartsAt: at(16, 23), liftedAt: null }))
      .toEqual({ starter: "BEFORE_SLEEP", why: "You usually sleep at 23:00." });
    // Half an hour after a workout: After lifting.
    expect(pickStretchSuggestion({ now: at(16, 15, 30), settings, shiftEndedAt: null, sleepStartsAt: null, liftedAt: at(16, 15) }))
      .toEqual({ starter: "AFTER_LIFTING", why: "You finished lifting at 15:00." });
    // Midday, nothing near: no suggestion.
    expect(pickStretchSuggestion({ now: at(16, 12), settings, shiftEndedAt: at(16, 6), sleepStartsAt: at(16, 23), liftedAt: at(16, 9) })).toBeNull();
    // Both fit: shift ended 90 min ago, sleep in 30 min → Before sleep (nearer).
    expect(pickStretchSuggestion({ now: at(16, 7, 30), settings, shiftEndedAt: at(16, 6), sleepStartsAt: at(16, 8), liftedAt: null })!.starter).toBe("BEFORE_SLEEP");
    // His windows and his off switch.
    expect(pickStretchSuggestion({ now: at(16, 7, 30), settings: { ...settings, afterShiftHours: 1, beforeSleepHours: 0.5 }, shiftEndedAt: at(16, 6), sleepStartsAt: at(16, 8, 5), liftedAt: null })).toBeNull();
    expect(pickStretchSuggestion({ now: at(16, 6, 30), settings: { ...settings, on: false }, shiftEndedAt: at(16, 6), sleepStartsAt: null, liftedAt: null })).toBeNull();
  });

  it("from the saved schedule: at 6:30 after a night shift TRAIN suggests After shift; a deleted starter isn't suggested; off is off", async () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
    await updateSchedulePattern(schedule);
    vi.setSystemTime(at(15, 6, 30)); // Sun 15 Nov: the Sat 14 night shift (18:00 → 06:00) just ended
    const s = await getStretchSuggestion();
    expect(s).toMatchObject({ routine: { name: "After shift" }, why: "Your shift ended at 6:00." });
    vi.setSystemTime(at(15, 12));
    expect(await getStretchSuggestion()).toBeNull();
    vi.setSystemTime(at(15, 6, 30));
    await deleteStretchRoutine("starter-after-shift", null);
    expect(await getStretchSuggestion()).toBeNull();
    await resetStarterRoutine("AFTER_SHIFT", (await getStretchRoutines()).id);
    writeStretchSuggestSettings({ ...DEFAULT_STRETCH_SUGGEST, on: false });
    expect(await getStretchSuggestion()).toBeNull();
  });
});

describe("Health Bridge cues", () => {
  it("the run-cue envelope: every change a spoken line, the end FINISH, no Bridge buzz; SKIP moves the start it's given", () => {
    const routine = STARTER_ROUTINES.AFTER_SHIFT;
    const clock = { startedAt: 1_000_000, pausedMs: 0, pausedAt: null, shift: 12, extra: {} };
    const p = stretchCuePayload("session-1", routine, clock, DEFAULT_RUN_CUE_PREFS);
    expect(p).toMatchObject({ v: 1, id: "session-1", title: "Stretch · After shift", startedAt: 1_000_000 - 12_000, pausedMs: 0 });
    expect(p.cues[0]).toEqual({ at: 0, kind: "HALFWAY", text: "Neck side stretch, left side", speak: true, buzz: false });
    expect(p.cues[1]).toMatchObject({ at: 30, kind: "HALFWAY", text: "Switch sides" });
    expect(p.cues.at(-1)).toMatchObject({ at: 540, kind: "FINISH", text: "Done" });
    expect(p.cues.every((c) => c.kind === "HALFWAY" || c.kind === "FINISH")).toBe(true);
    // Voice off in his run-cue settings: nothing is spoken.
    expect(stretchCuePayload("s", routine, clock, { ...DEFAULT_RUN_CUE_PREFS, voice: false }).cues.every((c) => !c.speak)).toBe(true);
  });
});
