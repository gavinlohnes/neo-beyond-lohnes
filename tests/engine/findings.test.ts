import { describe, expect, it } from "vitest";
import {
  MIN_PER_ARM,
  MIN_URGES,
  projectFindings,
  type Finding,
  type FindingsInput,
} from "../../src/engine/findings";
import type { DaySummary, LedgerWorkout } from "../../src/engine/dayLedger";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { PerformedSet } from "../../src/domain/workout/types";
import type { SchedulePhase } from "../../src/engine/scheduledContext";

/** Read-only findings (2026-10-03): counts only, with an abstain floor. */
const at = (m: number, d: number, h: number, min = 0) => new Date(2026, m - 1, d, h, min, 0, 0).toISOString();
const NOW = new Date(2026, 9, 31, 12, 0); // Sat Oct 31, 12:00
// Every day a work night, 18:00 → 06:00.
const EVERY_NIGHT = { ...DEFAULT_SCHEDULE_PATTERN, weeks: [{ workdays: [0, 1, 2, 3, 4, 5, 6] }] };

function day(id: string, d: number, partial: Partial<DaySummary> = {}): DaySummary {
  const start = at(10, d, 16, 30);
  return {
    beyondDayId: id,
    startedAt: start,
    livedDayStart: start,
    work: { declared: "WORK", scheduled: "WORK" },
    sleep: {},
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    ...partial,
  };
}

function workout(id: string, startedAt: string, status = "COMPLETED", prCount = 0): LedgerWorkout {
  return { sessionId: id, templateId: "A", sessionType: "STANDARD", status, startedAt, prCount, setsLogged: 3 };
}

function input(partial: Partial<FindingsInput>): FindingsInput {
  return { summaries: [], sets: [], schedule: EVERY_NIGHT, now: NOW, ...partial };
}

function only<K extends Finding["kind"]>(findings: Finding[], kind: K): Extract<Finding, { kind: K }>[] {
  return findings.filter((f): f is Extract<Finding, { kind: K }> => f.kind === kind);
}

describe("sleep before workouts", () => {
  // Day d: main sleep logged 14:00 on day d, workout at 17:00 the same afternoon (3 h later).
  const days = (count: number, minutes: number, from: number, status: (i: number) => string) =>
    Array.from({ length: count }, (_, i) =>
      day(`s${from + i}`, from + i, {
        sleep: { primaryMinutes: minutes, primaryLogs: [{ at: at(10, from + i, 14), minutes }] },
        workouts: [workout(`w${from + i}`, at(10, from + i, 17), status(i), i === 0 ? 1 : 0)],
      }),
    );

  it("counts each workout against the main sleep logged in the 24 hours before it, split at 6 h", () => {
    const summaries = [...days(6, 300, 1, (i) => (i < 2 ? "COMPLETED" : "PARTIAL")), ...days(7, 450, 10, () => "COMPLETED")];
    const { findings, waiting } = projectFindings(input({ summaries }));
    expect(only(findings, "SLEEP_BEFORE_WORKOUT")).toEqual([
      {
        kind: "SLEEP_BEFORE_WORKOUT",
        windowDays: 45,
        shortSleepMinutes: 360,
        shortSleep: { workouts: 6, completed: 2, prs: 1 },
        longerSleep: { workouts: 7, completed: 7, prs: 1 },
      },
    ]);
    expect(waiting.map((w) => w.kind)).not.toContain("SLEEP_BEFORE_WORKOUT");
  });

  it("abstains below the floor on either side, saying how far along it is", () => {
    const summaries = [...days(MIN_PER_ARM - 1, 300, 1, () => "COMPLETED"), ...days(9, 450, 10, () => "COMPLETED")];
    const { findings, waiting } = projectFindings(input({ summaries }));
    expect(only(findings, "SLEEP_BEFORE_WORKOUT")).toEqual([]);
    expect(waiting).toContainEqual({ kind: "SLEEP_BEFORE_WORKOUT", have: MIN_PER_ARM - 1, need: MIN_PER_ARM });
  });

  it("never pairs a workout with sleep logged after it, or more than 24 hours before it", () => {
    const summaries = [
      day("late", 1, { sleep: { primaryMinutes: 300, primaryLogs: [{ at: at(10, 1, 18), minutes: 300 }] }, workouts: [workout("a", at(10, 1, 17))] }),
      day("old", 3, { sleep: { primaryMinutes: 300, primaryLogs: [{ at: at(10, 3, 10), minutes: 300 }] }, workouts: [workout("b", at(10, 4, 11))] }),
    ];
    expect(projectFindings(input({ summaries })).waiting).toContainEqual({ kind: "SLEEP_BEFORE_WORKOUT", have: 0, need: MIN_PER_ARM });
  });
});

describe("before vs. after the shift", () => {
  it("splits work-day workouts at the shift (or MARK WORK ENDED), skipping days off and mid-shift starts", () => {
    const summaries: DaySummary[] = [];
    for (let i = 0; i < 6; i++) summaries.push(day(`b${i}`, 1 + i, { workouts: [workout(`b${i}`, at(10, 1 + i, 17), i < 3 ? "COMPLETED" : "PARTIAL")] }));
    for (let i = 0; i < 5; i++) summaries.push(day(`a${i}`, 10 + i, { workouts: [workout(`a${i}`, at(10, 11 + i, 7), "COMPLETED", 1)] }));
    // Work ended early at 04:00; a 04:30 workout counts as after the shift.
    summaries.push(day("early", 20, { work: { declared: "WORK", scheduled: "WORK", workEndedAt: at(10, 21, 4) }, workouts: [workout("e", at(10, 21, 4, 30))] }));
    // Not counted: a declared day off, and a workout started mid-shift.
    summaries.push(day("off", 22, { work: { declared: "OFF", scheduled: "WORK" }, workouts: [workout("o", at(10, 22, 17))] }));
    summaries.push(day("mid", 24, { workouts: [workout("m", at(10, 24, 23))] }));

    const [finding] = only(projectFindings(input({ summaries })).findings, "TRAINING_WINDOW");
    expect(finding).toEqual({
      kind: "TRAINING_WINDOW",
      windowDays: 45,
      beforeShift: { workouts: 6, completed: 3, prs: 0 },
      afterShift: { workouts: 6, completed: 6, prs: 5 },
    });
  });

  it("ignores workouts outside the last 45 days and unfinished ones", () => {
    const summaries = Array.from({ length: 8 }, (_, i) =>
      day(`x${i}`, 1 + i, { workouts: [workout(`x${i}`, at(10, 1 + i, 17), "ABANDONED"), workout(`y${i}`, at(8, 1 + i, 17))] }),
    );
    expect(projectFindings(input({ summaries })).waiting).toContainEqual({ kind: "TRAINING_WINDOW", have: 0, need: MIN_PER_ARM });
  });
});

describe("when urges came", () => {
  const urge = (when: string, phase: SchedulePhase) => ({ at: when, trigger: "STRESS" as const, phase });

  it("counts urges by schedule phase, most first", () => {
    const urges = [
      ...Array.from({ length: 4 }, (_, i) => urge(at(10, 10 + i, 8), "EXPECTED_POST_WORK")),
      urge(at(10, 20, 20), "SCHEDULED_SHIFT"),
      urge(at(10, 21, 12), "OFF"),
      urge(at(10, 22, 12), "OFF"),
      urge(at(8, 1, 12), "OFF"), // outside the window
    ];
    const [finding] = only(projectFindings(input({ summaries: [day("u", 10, { urges })] })).findings, "URGE_TIMING");
    expect(finding).toEqual({
      kind: "URGE_TIMING",
      windowDays: 45,
      total: 7,
      byPhase: [
        { phase: "EXPECTED_POST_WORK", count: 4 },
        { phase: "OFF", count: 2 },
        { phase: "SCHEDULED_SHIFT", count: 1 },
      ],
    });
  });

  it(`abstains under ${MIN_URGES} urges`, () => {
    const urges = [urge(at(10, 10, 8), "OFF")];
    const result = projectFindings(input({ summaries: [day("u", 10, { urges })] }));
    expect(only(result.findings, "URGE_TIMING")).toEqual([]);
    expect(result.waiting).toContainEqual({ kind: "URGE_TIMING", have: 1, need: MIN_URGES });
  });
});

describe("stall and exercise story", () => {
  let n = 0;
  const set = (sessionId: string, exerciseId: string, weight: number, reps: number, recordedAt: string): PerformedSet => ({
    id: `set-${n++}`,
    beyondDayId: "d",
    sessionId,
    exerciseId,
    setNumber: 1,
    weight,
    reps,
    skipped: false,
    recordedAt,
  });

  /** One session per entry, a week apart, ending Oct 29; each entry is the top set's [weight, reps]. */
  function history(exerciseId: string, tops: [number, number][], startDay = 29 - (tops.length - 1) * 7) {
    const summaries: DaySummary[] = [];
    const sets: PerformedSet[] = [];
    tops.forEach(([weight, reps], i) => {
      const when = new Date(2026, 9, startDay + i * 7, 7, 0);
      const id = `${exerciseId}-${i}`;
      summaries.push({ ...day(id, 1), startedAt: when.toISOString(), workouts: [workout(id, when.toISOString())] });
      sets.push(set(id, exerciseId, weight, reps, new Date(when.getTime() + 60_000).toISOString()));
    });
    return { summaries, sets };
  }

  it("names a stall: four sessions in a row without a new record", () => {
    const { summaries, sets } = history("bench", [[175, 5], [185, 5], [185, 5], [185, 4], [180, 5], [185, 5]]);
    const [stall] = only(projectFindings(input({ summaries, sets })).findings, "STALL");
    expect(stall).toEqual({ kind: "STALL", exerciseId: "bench", sessions: 4, topWeights: { min: 180, max: 185 } });
  });

  it("is not a stall when any of the last four sessions set a record (heavier or more reps)", () => {
    const reps = history("bench", [[175, 5], [185, 5], [185, 5], [185, 6], [185, 5], [185, 5]]);
    expect(only(projectFindings(input(reps)).findings, "STALL")).toEqual([]);
    // Only four sessions: the first can't set a record, so there's no stall to call yet.
    const short = history("bench", [[185, 5], [185, 5], [185, 5], [185, 5]]);
    expect(only(projectFindings(input(short)).findings, "STALL")).toEqual([]);
  });

  it("tells an exercise's story: first top set to latest, over the weeks between", () => {
    const { summaries, sets } = history("legpress", [[200, 8], [220, 8], [250, 8], [270, 8]]);
    const [story] = only(projectFindings(input({ summaries, sets })).findings, "EXERCISE_STORY");
    expect(story).toEqual({ kind: "EXERCISE_STORY", exerciseId: "legpress", fromWeight: 200, toWeight: 270, sessions: 4, days: 21 });
  });

  it("leaves out exercises not done in the last 28 days, and unchanged top sets", () => {
    const stale = history("row", [[100, 8], [110, 8], [120, 8], [130, 8], [130, 8], [130, 8], [130, 8], [130, 8]], 1 - 7 * 7);
    expect(projectFindings(input(stale)).findings.filter((f) => f.kind === "STALL" || f.kind === "EXERCISE_STORY")).toEqual([]);
    const flat = history("curl", [[30, 10], [30, 10], [30, 10], [30, 10]]);
    expect(only(projectFindings(input(flat)).findings, "EXERCISE_STORY")).toEqual([]);
  });

  it("ignores skipped and substituted sets", () => {
    const { summaries, sets } = history("legpress", [[200, 8], [220, 8], [250, 8], [270, 8]]);
    sets[3] = { ...sets[3]!, substitutedName: "Hack squat" };
    // Three sessions left — under the story minimum of four.
    expect(only(projectFindings(input({ summaries, sets })).findings, "EXERCISE_STORY")).toEqual([]);
  });
});

it("is pure: the same input gives the same output", () => {
  const summaries = [day("a", 10, { urges: Array.from({ length: 6 }, (_, i) => ({ at: at(10, 10 + i, 8), trigger: "STRESS" as const, phase: "OFF" as const })) })];
  expect(projectFindings(input({ summaries }))).toEqual(projectFindings(input({ summaries })));
});
