import { afterEach, describe, expect, it } from "vitest";
import { startDay } from "../src/application/commands";
import {
  fixStandardTest, recordStandardTest, removeStandardTest, undoStandardFix, undoStandardRemove,
} from "../src/application/standardTestCommands";
import { getStandardResults, readStandardTargets, STANDARD_TARGETS_KEY, writeStandardTarget } from "../src/application/standardTestQueries";
import { deriveTrainProgress } from "../src/application/trainProgress";
import type { DomainEvent } from "../src/domain/common/types";
import {
  describeStandardChange, describeStandardTarget, formatStandardValue, projectStandardResults, standardDate, standardValueProblem,
} from "../src/domain/workout/standardTests";
import { db } from "../src/persistence/db";
import { TRAVELLING_SETTINGS } from "../src/persistence/settingsTransfer";

/**
 * GRAYSON-TRAIN-STANDARDS-001: the three standards tests, recorded as one event, removed and fixed through the
 * shared void family, read into TRAIN → PROGRESS. Run under TZ=UTC and TZ=America/Chicago.
 */
afterEach(() => { localStorage.clear(); });

const rec = (id: string, test: string, value: number, at: string, seq: number, extra: Record<string, unknown> = {}): DomainEvent =>
  ({ id, type: "STANDARD_TEST_RECORDED", beyondDayId: "d", occurredAt: at, recordedAt: at, source: "USER", correlationId: id, seq,
    payload: { commandId: id, test, value, unit: "in", at, beyondDayId: "d", ...extra } }) as DomainEvent;
const voidOf = (id: string, root: string, seq: number): DomainEvent =>
  ({ id, type: "STANDARD_TEST_VOIDED", beyondDayId: "d", occurredAt: "2026-11-24T00:00:00Z", recordedAt: "2026-11-24T00:00:00Z", source: "USER", correlationId: id, seq,
    payload: { commandId: id, loggedEventId: root } }) as DomainEvent;
const undone = (id: string, voidId: string, seq: number): DomainEvent =>
  ({ id, type: "LOG_VOID_UNDONE", beyondDayId: "d", occurredAt: "2026-11-24T00:00:00Z", recordedAt: "2026-11-24T00:00:00Z", source: "USER", correlationId: id, seq,
    payload: { commandId: id, voidEventId: voidId, voidedType: "STANDARD_TEST_VOIDED" } }) as DomainEvent;

describe("GRAYSON-TRAIN-STANDARDS-001 pure", () => {
  it("validates each unit: inches 0–30 in quarters, reps 0–150, seconds 300–3600", () => {
    for (const ok of [0, 0.25, 14.75, 30]) expect(standardValueProblem("SIT_AND_REACH", ok)).toBeNull();
    for (const bad of [-0.25, 30.25, 14.1, NaN]) expect(standardValueProblem("SIT_AND_REACH", bad)).toMatch(/quarter inch/);
    for (const ok of [0, 38, 150]) expect(standardValueProblem("SIT_UPS_1MIN", ok)).toBeNull();
    for (const bad of [-1, 151, 3.5]) expect(standardValueProblem("SIT_UPS_1MIN", bad)).toMatch(/whole reps/);
    for (const ok of [300, 822, 3600]) expect(standardValueProblem("RUN_1_5_MILE", ok)).toBeNull();
    for (const bad of [299, 3601, 822.5]) expect(standardValueProblem("RUN_1_5_MILE", bad)).toMatch(/5:00 to 60:00/);
    expect(formatStandardValue("SIT_AND_REACH", 14.25)).toBe("14¼ in");
    expect(formatStandardValue("SIT_AND_REACH", 0.5)).toBe("½ in");
    expect(formatStandardValue("SIT_UPS_1MIN", 1)).toBe("1 rep");
    expect(formatStandardValue("RUN_1_5_MILE", 822)).toBe("13:42");
  });

  it("last and previous come out newest first; a standing removal drops a result and a put-back returns it", () => {
    const events = [rec("a", "SIT_AND_REACH", 13, "2026-10-02T20:00:00Z", 1), rec("b", "SIT_AND_REACH", 14, "2026-11-24T20:00:00Z", 2),
      rec("c", "SIT_AND_REACH", 15, "2026-11-10T20:00:00Z", 3)];
    expect(projectStandardResults(events).map((r) => r.eventId)).toEqual(["b", "c", "a"]);
    expect(projectStandardResults([...events, voidOf("v", "c", 4)]).map((r) => r.eventId)).toEqual(["b", "a"]);
    expect(projectStandardResults([...events, voidOf("v", "c", 4), undone("u", "v", 5)]).map((r) => r.eventId)).toEqual(["b", "c", "a"]);
  });

  it("says the change in plain words, never red or pass/fail", () => {
    const oct2 = new Date(2026, 9, 2, 19).toISOString();
    expect(describeStandardChange("SIT_AND_REACH", { value: 14 }, { value: 13, at: oct2 })).toBe("1 inch further than Oct 2");
    expect(describeStandardChange("SIT_AND_REACH", { value: 13.5 }, { value: 14, at: oct2 })).toBe("½ inch shorter than Oct 2");
    expect(describeStandardChange("SIT_UPS_1MIN", { value: 41 }, { value: 38, at: oct2 })).toBe("3 reps more than Oct 2");
    expect(describeStandardChange("RUN_1_5_MILE", { value: 840 }, { value: 822, at: oct2 })).toBe("18 seconds slower than Oct 2");
    expect(describeStandardChange("RUN_1_5_MILE", { value: 800 }, { value: 822, at: oct2 })).toBe("22 seconds faster than Oct 2");
    expect(describeStandardChange("SIT_UPS_1MIN", { value: 38 }, { value: 38, at: oct2 })).toBe("Same as Oct 2");
  });

  it("a result at 23:30 in his own time shows that evening's date", () => {
    expect(standardDate(new Date(2026, 10, 24, 23, 30).toISOString())).toBe("Nov 24");
    expect(standardDate(new Date(2026, 10, 25, 0, 30).toISOString())).toBe("Nov 25");
  });

  it("target words both ways; no target means no target words", () => {
    expect(describeStandardTarget("RUN_1_5_MILE", 797, 810)).toBe("13 seconds under your target");
    expect(describeStandardTarget("RUN_1_5_MILE", 832, 810)).toBe("22 seconds to go");
    expect(describeStandardTarget("SIT_AND_REACH", 15, 14)).toBe("1 inch past your target");
    expect(describeStandardTarget("SIT_UPS_1MIN", 36, 40)).toBe("4 reps to go");
    expect(describeStandardTarget("SIT_UPS_1MIN", 40, 40)).toBe("On your target");
    const base = {
      now: new Date(2026, 10, 24, 22), next: { kind: "NONE" } as const, sessions: [], lifts: [], names: {}, strengthIndexChangePercent: undefined,
      comparableLifts: 0, bodyweights: [], benchRelative: null, sitUpBestReps: null,
      standardResults: projectStandardResults([rec("r", "RUN_1_5_MILE", 832, new Date(2026, 10, 24, 21).toISOString(), 1)]),
    };
    const run = (p: ReturnType<typeof deriveTrainProgress>) => p.standards.find((s) => s.test === "RUN_1_5_MILE")!;
    expect(run(deriveTrainProgress(base)).text).toBe("Last: 13:52 on Nov 24.");
    expect(run(deriveTrainProgress({ ...base, standardTargets: { RUN_1_5_MILE: 810 } })).text).toBe("Last: 13:52 on Nov 24. Target: 13:30, set by you. 22 seconds to go.");
  });

  it("practice sets never count as a test", () => {
    const p = deriveTrainProgress({
      now: new Date(2026, 10, 24, 22), next: { kind: "NONE" }, sessions: [], lifts: [], names: {}, strengthIndexChangePercent: undefined,
      comparableLifts: 0, bodyweights: [], benchRelative: null, sitUpBestReps: 44,
    });
    const sitUps = p.standards.find((s) => s.test === "SIT_UPS_1MIN")!;
    expect(sitUps.results).toEqual([]);
    expect(sitUps.text).toBe("Not recorded yet. Best practice set: 44 reps. Practice isn't a timed test.");
  });
});

describe("GRAYSON-TRAIN-STANDARDS-001 recorded, fixed and removed", () => {
  it("records into today's lived day, fixes (original kept, voided) and removes, with both undos", async () => {
    await startDay();
    const first = await recordStandardTest({ test: "SIT_AND_REACH", value: 13.75, note: "  shoes off " });
    const second = await recordStandardTest({ test: "SIT_AND_REACH", value: 14.25 });
    let results = await getStandardResults();
    expect(results.map((r) => r.value)).toEqual([14.25, 13.75]);
    expect(results[1]!.note).toBe("shoes off");
    await expect(recordStandardTest({ test: "SIT_AND_REACH", value: 31 })).rejects.toThrow(/quarter inch/);

    const fix = await fixStandardTest(second, { value: 14.5 });
    results = await getStandardResults();
    expect(results.find((r) => r.eventId === fix.recordEventId)).toMatchObject({ value: 14.5, correctsEventId: second });
    expect(results.some((r) => r.eventId === second)).toBe(false);
    expect((await db.events.get(second))?.type).toBe("STANDARD_TEST_RECORDED");
    await expect(fixStandardTest(second, { value: 15 })).rejects.toThrow(/already removed/);

    await undoStandardFix(fix);
    results = await getStandardResults();
    expect(results.some((r) => r.eventId === second)).toBe(true);
    expect(results.some((r) => r.eventId === fix.recordEventId)).toBe(false);

    const removal = await removeStandardTest(first);
    expect((await getStandardResults()).some((r) => r.eventId === first)).toBe(false);
    await undoStandardRemove(removal);
    expect((await getStandardResults()).some((r) => r.eventId === first)).toBe(true);
  });

  it("targets save, validate, clear and travel with his settings as \"Standards targets\"", () => {
    expect(readStandardTargets()).toEqual({});
    writeStandardTarget("RUN_1_5_MILE", 810);
    expect(readStandardTargets()).toEqual({ RUN_1_5_MILE: 810 });
    expect(() => writeStandardTarget("SIT_UPS_1MIN", 200)).toThrow(/whole reps/);
    writeStandardTarget("RUN_1_5_MILE", null);
    expect(readStandardTargets()).toEqual({});
    localStorage.setItem(STANDARD_TARGETS_KEY, JSON.stringify({ RUN_1_5_MILE: 10, SIT_UPS_1MIN: 40, BENCH: 1 }));
    expect(readStandardTargets()).toEqual({ SIT_UPS_1MIN: 40 });
    expect(TRAVELLING_SETTINGS[STANDARD_TARGETS_KEY]).toBe("Standards targets");
  });
});
