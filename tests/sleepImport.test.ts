import { describe, expect, it } from "vitest";
import { MAX_SLEEP_FILE_BYTES, parseSleepSnapshot, sleepDurations, validateSleepSnapshot } from "../src/domain/health/sleepImport";
import { syntheticSleep } from "./helpers/syntheticSleep";

describe("sleep interchange boundary", () => {
  it("preserves source provenance, UTC offsets, stages and precision", () => {
    const file = syntheticSleep(); file.records[0]!.lastModifiedTime = "2026-10-18T12:00:00.123456789Z";
    expect(parseSleepSnapshot(JSON.stringify(file))).toEqual(file);
    expect(sleepDurations(file.records[0]!)).toEqual({ spanMinutes: 60, asleepMinutes: 30 });
  });
  it.each(["missing", "gap", "unknown"])("does not call session span asleep time with %s stages", (kind) => {
    const r = syntheticSleep().records[0]!;
    if (kind === "missing") r.stages = [];
    if (kind === "gap") r.stages = r.stages.slice(0, 1);
    if (kind === "unknown") r.stages[0]!.type = "UNKNOWN";
    expect(sleepDurations(r)).toEqual({ spanMinutes: 60, asleepMinutes: null });
  });
  it.each([
    (f: SleepSnapshotMutable) => { f.schemaVersion = 2; },
    (f: SleepSnapshotMutable) => { f.records[0].dataOriginPackage = "phone"; },
    (f: SleepSnapshotMutable) => { f.records.push(f.records[0]); },
    (f: SleepSnapshotMutable) => { f.records[0].startTime = "2026-02-30T00:00:00Z"; },
    (f: SleepSnapshotMutable) => { f.records[0].endTime = f.records[0].startTime; },
    (f: SleepSnapshotMutable) => { f.window.startTime = "2026-10-01T00:00:00Z"; },
    (f: SleepSnapshotMutable) => { f.window.endTime = "2026-10-20T00:00:00Z"; },
    (f: SleepSnapshotMutable) => { f.records[0].startZoneOffsetSeconds = 70000; },
    (f: SleepSnapshotMutable) => { f.records[0].stages[1].startTime = f.records[0].startTime; },
    (f: SleepSnapshotMutable) => { f.records[0].stages[0].type = "SNOOZING"; },
    (f: SleepSnapshotMutable) => { f.records[0].title = "unexpected"; },
    (f: SleepSnapshotMutable) => { f.records = Array.from({ length: 501 }, (_, i) => ({ ...f.records[0], id: `${i}` })); },
  ])("rejects an unsupported or malformed export", (mutate) => {
    const file = syntheticSleep(); mutate(file);
    expect(() => validateSleepSnapshot(file)).toThrow();
  });
  it("bounds file bytes and rejects malformed JSON", () => {
    expect(() => parseSleepSnapshot(" ".repeat(MAX_SLEEP_FILE_BYTES + 1))).toThrow("too large");
    expect(() => parseSleepSnapshot("{")).toThrow("supported BEYOND sleep export");
  });
  it("accepts empty exports without inventing evidence", () => {
    const file = syntheticSleep(); file.records = [];
    expect(validateSleepSnapshot(file).records).toEqual([]);
  });
});
// Deliberately loose only for exercising hostile inputs at the unknown boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SleepSnapshotMutable = { schemaVersion: number; window: { startTime: string; endTime: string }; records: any[] };
