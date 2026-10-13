import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import {
  captureItem,
  endDay,
  markWorkEnded,
  rateOutcome,
  setWorkContext,
  startDay,
  submitCheckIn,
  updateSchedulePattern,
} from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import {
  archiveMission,
  convertCaptureToObligation,
  createMission,
  createObligation,
  markObligationOpen,
  markObligationWaiting,
  modifyMission,
  modifyObligation,
  releaseObligation,
  satisfyObligation,
} from "../../src/application/intentCommands";
import {
  createDecisionJournalEntry,
  modifyDecisionJournalEntry,
  reviewDecisionJournalEntry,
} from "../../src/application/journalCommands";
import { buildRecurrenceRule } from "../../src/engine/recurrence";

/**
 * COMMAND-ATOMICITY-002 (owner approval 2026-10-13, issue #225). Every
 * compound command's row writes and events commit together or not at all,
 * guard reads run inside the same transaction so a double submit cannot
 * pass the guard twice, and nextSeq()'s cold-start read works inside each
 * family's transaction.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
});

const CHECK_IN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;

/** Lets the first `allowed` event writes through, then rejects the next one. */
function failEventWrite(allowed = 0) {
  const original = db.events.add.bind(db.events);
  let calls = 0;
  return vi.spyOn(db.events, "add").mockImplementation((...args: Parameters<typeof db.events.add>) => {
    calls += 1;
    if (calls === allowed + 1) return Promise.reject(new Error("simulated storage failure")) as ReturnType<typeof db.events.add>;
    return original(...args);
  });
}

async function snapshot() {
  return Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()] as const)));
}

async function expectRolledBack(run: () => Promise<unknown>, allowedEventWrites = 0) {
  const before = await snapshot();
  const spy = failEventWrite(allowedEventWrites);
  await expect(run()).rejects.toThrow("simulated storage failure");
  spy.mockRestore();
  expect(await snapshot()).toEqual(before);
}

describe("day family rolls back as a unit", () => {
  it("startDay: a failed DAY_STARTED leaves no day row", async () => {
    await expectRolledBack(() => startDay());
    expect(await db.beyondDays.count()).toBe(0);
    const day = await startDay();
    expect(await db.events.where("type").equals("DAY_STARTED").count()).toBe(1);
    expect((await db.beyondDays.get(day.id))?.status).toBe("ACTIVE");
  });

  it("startDay over an active day: a failed DAY_STARTED also undoes the auto-close", async () => {
    const first = await startDay();
    // DAY_ENDED for the old day is the first event write, DAY_STARTED the second.
    await expectRolledBack(() => startDay(), 1);
    expect((await db.beyondDays.get(first.id))?.status).toBe("ACTIVE");
    expect(await db.events.where("type").equals("DAY_ENDED").count()).toBe(0);
  });

  it("startDay with a standing schedule: a failed WORK_CONTEXT_SET undoes the whole start", async () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
    await updateSchedulePattern(fields);
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // Oct 12 2026 16:30 is a scheduled work day (see standingWorkContext.test.ts).
      vi.setSystemTime(new Date(2026, 9, 12, 16, 30));
      // DAY_STARTED is the first event write, the standing WORK_CONTEXT_SET the second.
      await expectRolledBack(() => startDay(), 1);
      expect(await db.beyondDays.count()).toBe(0);
      const day = await startDay();
      expect(day.workContext).toBe("WORK");
      expect(await db.events.where("type").equals("WORK_CONTEXT_SET").count()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("endDay: a failed DAY_ENDED leaves the day ACTIVE", async () => {
    const day = await startDay();
    await expectRolledBack(() => endDay(day.id));
    expect((await db.beyondDays.get(day.id))?.status).toBe("ACTIVE");
  });

  it("submitCheckIn: a failure at either event leaves no check-in, recommendation or event", async () => {
    const day = await startDay();
    await expectRolledBack(() => submitCheckIn(day.id, CHECK_IN));
    await expectRolledBack(() => submitCheckIn(day.id, CHECK_IN), 1);
    expect(await db.checkIns.count()).toBe(0);
    expect(await db.recommendations.count()).toBe(0);

    const { checkIn, recommendation } = await submitCheckIn(day.id, CHECK_IN);
    expect(await db.checkIns.count()).toBe(1);
    expect(await db.recommendations.count()).toBe(1);
    expect(recommendation.seq!).toBeGreaterThan(checkIn.seq!);
  });

  it("rateOutcome, setWorkContext: a failed event leaves the row unchanged", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, CHECK_IN);
    await expectRolledBack(() => rateOutcome(day.id, recommendation.id, "GOOD"));
    expect(await db.outcomes.count()).toBe(0);
    await expectRolledBack(() => setWorkContext(day.id, "WORK", "MANUAL"));
    expect((await db.beyondDays.get(day.id))?.workContext).toBe("UNKNOWN");
  });

  it("markWorkEnded: two overlapping taps record exactly one WORK_PERIOD_ENDED", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await Promise.all([markWorkEnded(day.id), markWorkEnded(day.id)]);
    expect(await db.events.where("type").equals("WORK_PERIOD_ENDED").count()).toBe(1);
  });
});

describe("Missions & Obligations family rolls back as a unit", () => {
  it("create / modify / archive mission", async () => {
    await expectRolledBack(() => createMission({ title: "Direction" }));
    const mission = await createMission({ title: "Direction" });
    await expectRolledBack(() => modifyMission(mission.id, { title: "Renamed" }));
    await expectRolledBack(() => archiveMission(mission.id));
    expect((await db.missions.get(mission.id))?.status).toBe("ACTIVE");
    expect((await db.missions.get(mission.id))?.title).toBe("Direction");
  });

  it("create / modify / waiting / open / satisfy / release obligation", async () => {
    await expectRolledBack(() => createObligation({ title: "Call" }));
    const obligation = await createObligation({ title: "Call" });
    await expectRolledBack(() => modifyObligation(obligation.id, { title: "Call back" }));
    await expectRolledBack(() => markObligationWaiting(obligation.id));
    await markObligationWaiting(obligation.id);
    await expectRolledBack(() => markObligationOpen(obligation.id));
    await expectRolledBack(() => satisfyObligation(obligation.id));
    await expectRolledBack(() => releaseObligation(obligation.id));
    expect((await db.obligations.get(obligation.id))?.status).toBe("WAITING");
  });

  it("satisfying a recurring obligation commits the instance and its next occurrence together", async () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    const obligation = await createObligation({ title: "Trash", dueAt: "2026-09-14", recurrence: { rrule } });
    // OBLIGATION_SATISFIED is the first event write; the next occurrence's OBLIGATION_CREATED the second.
    await expectRolledBack(() => satisfyObligation(obligation.id), 1);
    expect((await db.obligations.get(obligation.id))?.status).toBe("OPEN");
    expect(await db.obligations.count()).toBe(1);

    await satisfyObligation(obligation.id);
    expect(await db.obligations.count()).toBe(2);
  });

  it("D1: a recurring obligation whose mission is archived is not half-satisfied", async () => {
    const mission = await createMission({ title: "Old direction" });
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    const obligation = await createObligation({ title: "Trash", missionId: mission.id, dueAt: "2026-09-14", recurrence: { rrule } });
    await archiveMission(mission.id);
    const before = await snapshot();
    await expect(satisfyObligation(obligation.id)).rejects.toThrow("MISSION_ARCHIVED");
    expect(await snapshot()).toEqual(before);
    // Releasing (no next occurrence) remains available.
    await releaseObligation(obligation.id);
    expect((await db.obligations.get(obligation.id))?.status).toBe("RELEASED");
  });

  it("two overlapping satisfies record one SATISFIED event and one next occurrence", async () => {
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-09-14" });
    const obligation = await createObligation({ title: "Trash", dueAt: "2026-09-14", recurrence: { rrule } });
    const results = await Promise.allSettled([satisfyObligation(obligation.id), satisfyObligation(obligation.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(rejected.reason)).toContain("OBLIGATION_ALREADY_RESOLVED");
    expect(await db.events.where("type").equals("OBLIGATION_SATISFIED").count()).toBe(1);
    expect(await db.obligations.count()).toBe(2);
  });

  it("Capture conversion: a failed capture resolve leaves no obligation and the capture OPEN", async () => {
    const capture = await captureItem("Book the dentist");
    const before = await snapshot();
    const spy = vi.spyOn(db.captureItems, "update").mockRejectedValueOnce(new Error("simulated storage failure"));
    await expect(convertCaptureToObligation(capture.id, { title: "Book the dentist" })).rejects.toThrow("simulated storage failure");
    spy.mockRestore();
    expect(await snapshot()).toEqual(before);

    await expectRolledBack(() => convertCaptureToObligation(capture.id, { title: "Book the dentist" }));
    expect((await db.captureItems.get(capture.id))?.status).toBe("OPEN");
  });

  it("Capture conversion: two overlapping conversions create one obligation", async () => {
    const capture = await captureItem("Book the dentist");
    const results = await Promise.allSettled([
      convertCaptureToObligation(capture.id, { title: "Book the dentist" }),
      convertCaptureToObligation(capture.id, { title: "Book the dentist" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(String((results.find((r) => r.status === "rejected") as PromiseRejectedResult).reason)).toContain("CAPTURE_NOT_OPEN");
    expect(await db.obligations.count()).toBe(1);
    expect((await db.captureItems.get(capture.id))?.status).toBe("RESOLVED");
  });
});

describe("Decision Journal family rolls back as a unit", () => {
  it("create / modify / review", async () => {
    await expectRolledBack(() => createDecisionJournalEntry({ title: "Job", decision: "Take it" }));
    const entry = await createDecisionJournalEntry({ title: "Job", decision: "Take it" });
    await expectRolledBack(() => modifyDecisionJournalEntry(entry.id, { title: "New job" }));
    await expectRolledBack(() => reviewDecisionJournalEntry(entry.id, { outcome: "Went well" }));
    const saved = await db.decisionJournalEntries.get(entry.id);
    expect(saved?.status).toBe("OPEN");
    expect(saved?.title).toBe("Job");
  });

  it("two overlapping reviews record one review", async () => {
    const entry = await createDecisionJournalEntry({ title: "Job", decision: "Take it" });
    const results = await Promise.allSettled([
      reviewDecisionJournalEntry(entry.id, { outcome: "First" }),
      reviewDecisionJournalEntry(entry.id, { outcome: "Second" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.events.where("type").equals("DECISION_JOURNAL_REVIEWED").count()).toBe(1);
  });
});

describe("cold-start event sequencing inside each family's transaction", () => {
  /**
   * nextSeq() memoizes the highest seq on disk the first time it runs in a
   * module instance, reading events, checkIns and recommendations. A fresh
   * module graph reproduces an app reload where the first write of the
   * session is one of these commands. A table missing from a family's list
   * would make that first read throw NotFoundError.
   */
  async function freshModules() {
    await db.events.add({
      id: "seeded",
      type: "DAY_STARTED",
      beyondDayId: "seeded-day",
      occurredAt: "2026-10-01T00:00:00.000Z",
      recordedAt: "2026-10-01T00:00:00.000Z",
      payload: {},
      source: "USER",
      correlationId: "seeded",
      seq: 500,
    });
    db.close();
    vi.resetModules();
    const fresh = {
      db: (await import("../../src/persistence/db")).db,
      commands: await import("../../src/application/commands"),
      intent: await import("../../src/application/intentCommands"),
      journal: await import("../../src/application/journalCommands"),
      train: await import("../../src/application/trainCommands"),
    };
    await fresh.db.open();
    return fresh;
  }

  async function seqs(fresh: Awaited<ReturnType<typeof freshModules>>) {
    return (await fresh.db.events.toArray()).filter((e) => e.id !== "seeded").map((e) => e.seq ?? 0);
  }

  it("day family: first write after reload continues after the highest seq", async () => {
    const fresh = await freshModules();
    try {
      const day = await fresh.commands.startDay();
      await fresh.commands.submitCheckIn(day.id, CHECK_IN);
      const all = await seqs(fresh);
      expect(Math.min(...all)).toBe(501);
      expect(new Set(all).size).toBe(all.length);
    } finally {
      fresh.db.close();
    }
  });

  it("intent family", async () => {
    const fresh = await freshModules();
    try {
      await fresh.intent.createMission({ title: "Direction" });
      expect(Math.min(...(await seqs(fresh)))).toBeGreaterThan(500);
    } finally {
      fresh.db.close();
    }
  });

  it("journal family", async () => {
    const fresh = await freshModules();
    try {
      await fresh.journal.createDecisionJournalEntry({ title: "Job", decision: "Take it" });
      expect(Math.min(...(await seqs(fresh)))).toBeGreaterThan(500);
    } finally {
      fresh.db.close();
    }
  });

  it("workout family (PR #223 review note)", async () => {
    await db.beyondDays.add({
      id: "d",
      startedAt: "2026-10-01T00:00:00.000Z",
      timezoneId: "UTC",
      workContext: "UNKNOWN",
      status: "ACTIVE",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const fresh = await freshModules();
    try {
      const session = await fresh.train.startWorkout("d", "A", "RECOVERY");
      await fresh.train.logSet("d", session.id, "squat", 1, 100, 5);
      const all = await seqs(fresh);
      expect(Math.min(...all)).toBe(501);
      expect(all).toHaveLength(2);
    } finally {
      fresh.db.close();
    }
  });
});
