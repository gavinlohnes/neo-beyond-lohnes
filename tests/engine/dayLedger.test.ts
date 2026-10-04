import { describe, expect, it } from "vitest";
import { projectDaySummaries, summarizeBurden, type DayLedgerInput } from "../../src/engine/dayLedger";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { BeyondDay, DomainEvent, DomainEventType, WorkoutSession } from "../../src/domain/common/types";
import type { PerformedSet } from "../../src/domain/workout/types";

/**
 * Drop 1 — Day Ledger, pure unit tests over hand-built history. Oct 12 2026
 * is a Week A Monday (scheduled work, 18:00–06:00), Oct 14 a Week A
 * Wednesday (off). Every value asserted is derived by hand from the events
 * below, never read back from the code under test.
 */
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min, 0, 0).toISOString();

let seq = 0;
function ev(
  dayId: string,
  type: DomainEventType,
  occurredAt: string,
  payload: unknown = {},
  source: DomainEvent["source"] = "USER",
  id = `e${++seq}`,
): DomainEvent {
  return { id, type, beyondDayId: dayId, occurredAt, recordedAt: occurredAt, payload, source, correlationId: id, seq };
}

function day(id: string, startedAt: string, workContext: BeyondDay["workContext"] = "UNKNOWN"): BeyondDay {
  return { id, startedAt, timezoneId: "America/Chicago", workContext, status: "ACTIVE", createdAt: startedAt, updatedAt: startedAt };
}

function input(partial: Partial<DayLedgerInput>): DayLedgerInput {
  return { days: [], events: [], workoutSessions: [], performedSets: [], schedule: DEFAULT_SCHEDULE_PATTERN, ...partial };
}

describe("projectDaySummaries — a normal work day", () => {
  const D = "work-day";
  const water1 = ev(D, "WATER_LOGGED", at(10, 12, 17, 0), { amountOz: 16 }, "USER", "water-1");
  const sleep1 = ev(D, "SLEEP_LOGGED", at(10, 13, 14, 0), { durationMinutes: 420, kind: "PRIMARY" }, "USER", "sleep-1");
  const meal1 = ev(D, "MEAL_LOGGED", at(10, 12, 17, 30), { name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 }, "USER", "meal-1");
  const meal2 = ev(D, "MEAL_LOGGED", at(10, 13, 2, 0), { name: "Shake", calories: 200, proteinG: 30, carbsG: 5, fatG: 3 }, "USER", "meal-2");
  const meal3 = ev(D, "MEAL_LOGGED", at(10, 13, 2, 5), { name: "Oops", calories: 900, proteinG: 10, carbsG: 99, fatG: 40 }, "USER", "meal-3");
  const urge = ev(D, "URGE_LOGGED", at(10, 13, 7, 0), { trigger: "AFTER_SHIFT" }, "USER", "urge-1");
  const undoneUrge = ev(D, "URGE_LOGGED", at(10, 13, 7, 1), { trigger: "TIRED" }, "USER", "urge-2");
  const events: DomainEvent[] = [
    ev(D, "DAY_STARTED", at(10, 12, 16, 30), { dayId: D }),
    ev(D, "WORK_CONTEXT_SET", at(10, 12, 16, 30), { workContext: "WORK", source: "SCHEDULE_STANDING" }, "SYSTEM"),
    water1,
    ev(D, "WATER_LOG_CORRECTED", at(10, 12, 17, 1), { amountOz: 20, originalEventId: "water-1", supersedesEventId: "water-1" }),
    ev(D, "WATER_LOGGED", at(10, 13, 1, 0), { amountOz: 12 }),
    ev(D, "PROTEIN_LOGGED", at(10, 12, 17, 5), { grams: 25 }),
    meal1,
    meal2,
    meal3,
    ev(D, "MEAL_LOG_VOIDED", at(10, 13, 2, 6), { mealEventId: "meal-3" }),
    ev(D, "STATE_CHECKED_IN", at(10, 12, 16, 40), { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 }),
    ev(D, "STATE_CHECKED_IN", at(10, 12, 16, 50), { energy: 2, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 }),
    ev(D, "RECOMMENDATION_ISSUED", at(10, 12, 16, 40), { recommendationId: "r1", kind: "NO_ACTION_REQUIRED" }, "ENGINE"),
    ev(D, "RECOMMENDATION_ISSUED", at(10, 12, 16, 50), { recommendationId: "r2", kind: "RECOVER" }, "ENGINE"),
    ev(D, "RECOMMENDATION_ACCEPTED", at(10, 12, 16, 51), { recommendationId: "r2" }),
    ev(D, "WORK_PERIOD_ENDED", at(10, 13, 6, 10)),
    urge,
    undoneUrge,
    ev(D, "URGE_UNDONE", at(10, 13, 7, 2), { urgeEventId: "urge-2" }),
    ev(D, "CLEAN_DAY_LOGGED", at(10, 13, 7, 30), { habitName: "Beer" }),
    sleep1,
    ev(D, "SLEEP_LOG_CORRECTED", at(10, 13, 14, 1), { durationMinutes: 400, originalEventId: "sleep-1", supersedesEventId: "sleep-1" }),
    ev(D, "SLEEP_LOGGED", at(10, 13, 15, 0), { durationMinutes: 30, kind: "SUPPLEMENTAL" }),
  ];
  const [summary] = projectDaySummaries(input({ days: [day(D, at(10, 12, 16, 30), "WORK")], events }));

  it("resolves corrections and voids the way BODY does", () => {
    expect(summary!.waterOz).toBe(32); // 20 (corrected from 16) + 12
    expect(summary!.sleep).toEqual({
      primaryMinutes: 400,
      primaryLogs: [{ at: at(10, 13, 14, 0), minutes: 400 }],
      napMinutes: 30,
    });
    expect(summary!.kcal).toBe(800); // the voided 900 kcal meal is gone
    expect(summary!.proteinG).toBe(100); // 25 logged + 45 + 30 from meals
  });

  it("records work as declared, its source, the schedule's view, and when it ended", () => {
    expect(summary!.work).toEqual({
      declared: "WORK",
      declaredSource: "SCHEDULE_STANDING",
      scheduled: "WORK",
      workEndedAt: at(10, 13, 6, 10),
    });
    expect(summary!.livedDayStart).toBe(at(10, 12, 16, 30));
  });

  it("keeps the latest check-in's capacity and the latest recommendation with its decision", () => {
    expect(summary!.checkIn).toMatchObject({ capacity: "YELLOW", count: 2, at: at(10, 12, 16, 50) });
    expect(summary!.recommendation).toEqual({ recommendationId: "r2", kind: "RECOVER", issuedAt: at(10, 12, 16, 50), decision: "ACCEPTED" });
  });

  it("places urges against the schedule and drops undone ones", () => {
    expect(summary!.urges).toEqual([{ at: at(10, 13, 7, 0), trigger: "AFTER_SHIFT", phase: "EXPECTED_POST_WORK" }]);
    expect(summary!.cleanDay).toBe(true);
  });

  it("counts burden: manual entries and corrections, never the system's standing value", () => {
    // Entries: water ×2, protein, meals ×3, check-ins ×2, accepted, work ended, urges ×2, clean day, sleep ×2
    // = 2 + 1 + 3 + 2 + 1 + 1 + 2 + 1 + 2 = 15.
    expect(summary!.burden.manualEntries).toBe(15);
    // Corrections: water fix, meal void, urge undo, sleep fix.
    expect(summary!.burden.corrections).toBe(4);
    expect(summary!.burden.trainingSets).toBe(0);
    expect(summary!.burden.firstEntryAt).toBe(at(10, 12, 16, 40));
  });
});

describe("projectDaySummaries — missing data stays missing", () => {
  it("a day with nothing logged has no numbers at all, not zeros", () => {
    const [summary] = projectDaySummaries(input({ days: [day("empty", at(10, 14, 16, 30))] }));
    expect(summary).toEqual({
      beyondDayId: "empty",
      startedAt: at(10, 14, 16, 30),
      livedDayStart: at(10, 14, 16, 30),
      work: { declared: "UNKNOWN", scheduled: "OFF" },
      sleep: {},
      workouts: [],
      urges: [],
      cleanDay: false,
      burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    });
  });

  it("an off day with only a check-in has capacity and nothing else", () => {
    const D = "off-day";
    const [summary] = projectDaySummaries(
      input({
        days: [day(D, at(10, 14, 16, 30), "OFF")],
        events: [ev(D, "STATE_CHECKED_IN", at(10, 14, 17, 0), { energy: 5, stress: 1, mood: 5, soreness: 0, alcoholUrge: 0 })],
      }),
    );
    expect(summary!.work).toEqual({ declared: "OFF", scheduled: "OFF" });
    expect(summary!.checkIn?.capacity).toBe("GREEN");
    expect(summary!.waterOz).toBeUndefined();
    expect(summary!.proteinG).toBeUndefined();
    expect(summary!.kcal).toBeUndefined();
    expect(summary!.sleep).toEqual({});
    expect(summary!.recommendation).toBeUndefined();
  });

  it("a water log corrected to 0 is a real 0, not missing", () => {
    const D = "zero";
    const [summary] = projectDaySummaries(
      input({
        days: [day(D, at(10, 14, 16, 30))],
        events: [
          ev(D, "WATER_LOGGED", at(10, 14, 17, 0), { amountOz: 8 }, "USER", "w0"),
          ev(D, "WATER_LOG_CORRECTED", at(10, 14, 17, 1), { amountOz: 0, originalEventId: "w0", supersedesEventId: "w0" }),
        ],
      }),
    );
    expect(summary!.waterOz).toBe(0);
  });
});

describe("projectDaySummaries — lived days", () => {
  it("a night shift crossing midnight lands in one lived day", () => {
    const D = "night";
    const summaries = projectDaySummaries(
      input({
        days: [day(D, at(10, 12, 16, 30), "WORK")],
        events: [
          ev(D, "WATER_LOGGED", at(10, 12, 23, 0), { amountOz: 16 }),
          ev(D, "WATER_LOGGED", at(10, 13, 3, 0), { amountOz: 16 }),
          ev(D, "URGE_LOGGED", at(10, 12, 23, 30), { trigger: "STRESS" }),
          ev(D, "URGE_LOGGED", at(10, 13, 4, 0), { trigger: "TIRED" }),
        ],
      }),
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.waterOz).toBe(32);
    expect(summaries[0]!.livedDayStart).toBe(at(10, 12, 16, 30));
    expect(summaries[0]!.urges.map((u) => u.phase)).toEqual(["SCHEDULED_SHIFT", "SCHEDULED_SHIFT"]);
  });

  it("the 16:30 boundary splits days: each record keeps its own events and window", () => {
    const summaries = projectDaySummaries(
      input({
        days: [day("second", at(10, 13, 16, 30)), day("first", at(10, 12, 16, 30))],
        events: [
          ev("first", "WATER_LOGGED", at(10, 13, 16, 29), { amountOz: 10 }),
          ev("second", "WATER_LOGGED", at(10, 13, 16, 31), { amountOz: 6 }),
        ],
      }),
    );
    expect(summaries.map((s) => [s.beyondDayId, s.waterOz, s.livedDayStart])).toEqual([
      ["first", 10, at(10, 12, 16, 30)],
      ["second", 6, at(10, 13, 16, 30)],
    ]);
  });

  it("a day begun at 03:00 belongs to the 16:30 window before it", () => {
    const [summary] = projectDaySummaries(input({ days: [day("late", at(10, 13, 3, 0))] }));
    expect(summary!.livedDayStart).toBe(at(10, 12, 16, 30));
    expect(summary!.work.scheduled).toBe("WORK");
  });
});

describe("projectDaySummaries — workouts", () => {
  const session = (id: string, dayId: string, startedAt: string, endedAt: string | undefined, status: string): WorkoutSession => ({
    id,
    schemaVersion: 1,
    beyondDayId: dayId,
    templateId: "A",
    sessionType: "STANDARD",
    status,
    startedAt,
    ...(endedAt ? { endedAt } : {}),
  });
  const set = (id: string, sessionId: string, dayId: string, weight: number, reps: number, setNumber: number, recordedAt: string): PerformedSet => ({
    id,
    beyondDayId: dayId,
    sessionId,
    exerciseId: "leg-press",
    setNumber,
    weight,
    reps,
    skipped: false,
    recordedAt,
  });

  it("reports status, duration, sets and PRs judged against earlier finished sessions", () => {
    const summaries = projectDaySummaries(
      input({
        days: [day("d1", at(10, 12, 16, 30)), day("d2", at(10, 14, 16, 30))],
        workoutSessions: [
          session("s1", "d1", at(10, 12, 17, 0), at(10, 12, 17, 45), "COMPLETED"),
          session("s2", "d2", at(10, 14, 17, 0), at(10, 14, 17, 52), "COMPLETED"),
          session("s3", "d2", at(10, 14, 18, 0), at(10, 14, 18, 1), "ABANDONED"),
        ],
        performedSets: [
          set("p1", "s1", "d1", 200, 10, 1, at(10, 12, 17, 10)),
          set("p2", "s2", "d2", 220, 8, 1, at(10, 14, 17, 10)), // heavier than anything before: a PR
          set("p3", "s2", "d2", 240, 6, 2, at(10, 14, 17, 15)), // heavier again: another PR
        ],
        events: [ev("d2", "SET_UNDONE", at(10, 14, 17, 16), { performedSetId: "p3" })],
      }),
    );
    expect(summaries[0]!.workouts).toEqual([
      { sessionId: "s1", templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: at(10, 12, 17, 0), endedAt: at(10, 12, 17, 45), durationMinutes: 45, prCount: 0, setsLogged: 1 },
    ]);
    // p3 was undone, so it neither counts as a set nor as a PR.
    expect(summaries[1]!.workouts.map((w) => [w.sessionId, w.durationMinutes, w.prCount, w.setsLogged])).toEqual([
      ["s2", 52, 1, 1],
      ["s3", 1, undefined, 0],
    ]);
  });

  it("an active session has no duration yet", () => {
    const [summary] = projectDaySummaries(
      input({ days: [day("d", at(10, 12, 16, 30))], workoutSessions: [session("live", "d", at(10, 12, 17, 0), undefined, "ACTIVE")] }),
    );
    expect(summary!.workouts[0]).not.toHaveProperty("durationMinutes");
    expect(summary!.workouts[0]).not.toHaveProperty("prCount");
  });
});

describe("burden counting", () => {
  it("counts a hand-set work context once, and changing it afterwards as a correction", () => {
    const D = "wc";
    const [summary] = projectDaySummaries(
      input({
        days: [day(D, at(10, 12, 16, 30), "OFF")],
        events: [
          ev(D, "WORK_CONTEXT_SET", at(10, 12, 16, 30), { workContext: "WORK", source: "SCHEDULE_STANDING" }, "SYSTEM"),
          ev(D, "WORK_CONTEXT_SET", at(10, 12, 17, 0), { workContext: "OFF", source: "MANUAL" }),
        ],
      }),
    );
    // BEYOND set it from the schedule; the operator changing it is a correction of BEYOND's value.
    expect(summary!.burden).toMatchObject({ manualEntries: 0, corrections: 1 });
  });

  it("answering an unset work context is one entry", () => {
    const D = "wc2";
    const [summary] = projectDaySummaries(
      input({
        days: [day(D, at(10, 12, 16, 30), "WORK")],
        events: [ev(D, "WORK_CONTEXT_SET", at(10, 12, 17, 0), { workContext: "WORK", source: "SCHEDULE_SUGGESTION_ACCEPTED" })],
      }),
    );
    expect(summary!.burden).toMatchObject({ manualEntries: 1, corrections: 0, firstEntryAt: at(10, 12, 17, 0) });
  });

  it("keeps training sets apart and ignores operations, engine and system events", () => {
    const D = "ops";
    const [summary] = projectDaySummaries(
      input({
        days: [day(D, at(10, 12, 16, 30))],
        events: [
          ev(D, "DAY_STARTED", at(10, 12, 16, 30)),
          ev(D, "WORKOUT_STARTED", at(10, 12, 17, 0)),
          ev(D, "SET_LOGGED", at(10, 12, 17, 5)),
          ev(D, "SET_LOGGED", at(10, 12, 17, 8)),
          ev(D, "SET_SKIPPED", at(10, 12, 17, 9)),
          ev(D, "SET_UNDONE", at(10, 12, 17, 10), { performedSetId: "x" }),
          ev(D, "WORKOUT_COMPLETED", at(10, 12, 17, 40)),
          ev(D, "RESET_STARTED", at(10, 12, 18, 0)),
          ev(D, "COMMAND_STARTED", at(10, 12, 18, 0)),
          ev(D, "RECOMMENDATION_ISSUED", at(10, 12, 18, 1), { recommendationId: "r", kind: "NO_ACTION_REQUIRED" }, "ENGINE"),
          ev(D, "COMMAND_COMPLETED", at(10, 12, 18, 1), {}, "SYSTEM"),
        ],
      }),
    );
    expect(summary!.burden).toEqual({ manualEntries: 0, corrections: 0, trainingSets: 2 });
  });

  it("summarizeBurden averages entries per day and totals corrections", () => {
    const D1 = "b1";
    const D2 = "b2";
    const summaries = projectDaySummaries(
      input({
        days: [day(D1, at(10, 12, 16, 30)), day(D2, at(10, 13, 16, 30))],
        events: [
          ev(D1, "WATER_LOGGED", at(10, 12, 17, 0), { amountOz: 8 }, "USER", "bw"),
          ev(D1, "WATER_LOG_CORRECTED", at(10, 12, 17, 1), { amountOz: 9, originalEventId: "bw", supersedesEventId: "bw" }),
          ev(D1, "PROTEIN_LOGGED", at(10, 12, 18, 0), { grams: 30 }),
          ev(D1, "URGE_LOGGED", at(10, 12, 19, 0), { trigger: "BORED" }),
          ev(D2, "WATER_LOGGED", at(10, 13, 17, 0), { amountOz: 8 }),
        ],
      }),
    );
    expect(summarizeBurden(summaries)).toEqual({ days: 2, entriesPerDay: 2, corrections: 1 });
    expect(summarizeBurden([])).toEqual({ days: 0, corrections: 0 });
  });
});

describe("projectDaySummaries — UNDO-001 undone water and sleep", () => {
  it("leaves an undone log out of every total and counts the undo as a correction", () => {
    const D = "undo-day";
    const events = [
      ev(D, "WATER_LOGGED", at(10, 14, 9, 0), { amountOz: 16 }, "USER", "w-keep"),
      ev(D, "WATER_LOGGED", at(10, 14, 9, 1), { amountOz: 500 }, "USER", "w-undo"),
      ev(D, "WATER_LOG_VOIDED", at(10, 14, 9, 1), { loggedEventId: "w-undo" }),
      ev(D, "SLEEP_LOGGED", at(10, 14, 10, 0), { durationMinutes: 435, kind: "PRIMARY" }, "USER", "s-undo"),
      ev(D, "SLEEP_LOG_VOIDED", at(10, 14, 10, 0), { loggedEventId: "s-undo" }),
    ];
    const [summary] = projectDaySummaries(input({ days: [day(D, at(10, 14, 8, 0), "OFF")], events }));
    expect(summary!.waterOz).toBe(16);
    expect(summary!.sleep).toEqual({});
    // Three logs by hand, two undos.
    expect(summary!.burden.manualEntries).toBe(3);
    expect(summary!.burden.corrections).toBe(2);
  });
});

describe("projectDaySummaries — FOUNDATION-A-F1 entry counts", () => {
  it("counts the water and food entries behind each total, undone and deleted ones excluded", () => {
    const D = "count-day";
    const events = [
      ev(D, "WATER_LOGGED", at(10, 14, 9, 0), { amountOz: 16 }, "USER", "cw1"),
      ev(D, "WATER_LOGGED", at(10, 14, 10, 0), { amountOz: 16 }, "USER", "cw2"),
      ev(D, "WATER_LOG_VOIDED", at(10, 14, 10, 1), { loggedEventId: "cw2" }),
      ev(D, "PROTEIN_LOGGED", at(10, 14, 11, 0), { grams: 30 }, "USER", "cp1"),
      ev(D, "MEAL_LOGGED", at(10, 14, 12, 0), { name: "Bowl", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 }, "USER", "cm1"),
      ev(D, "MEAL_LOGGED", at(10, 14, 13, 0), { name: "Shake", calories: 200, proteinG: 30, carbsG: 5, fatG: 3 }, "USER", "cm2"),
      ev(D, "MEAL_LOG_VOIDED", at(10, 14, 13, 1), { mealEventId: "cm2" }),
    ];
    const [summary] = projectDaySummaries(input({ days: [day(D, at(10, 14, 8, 0), "OFF")], events }));
    expect(summary!.waterOz).toBe(16);
    expect(summary!.proteinG).toBe(75);
    expect(summary!.entryCounts).toEqual({ water: 1, food: 2 });
  });
});
