import { GARMIN_ORIGIN, SLEEP_IMPORT_FORMAT, type SleepSnapshot } from "../../src/domain/health/sleepImport";
/** Synthetic only: no owner screenshots or health values. */
export function syntheticSleep(): SleepSnapshot {
  return {
    format: SLEEP_IMPORT_FORMAT, schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "0.1.0" },
    exportedAt: "2026-10-19T00:00:00Z", window: { startTime: "2026-10-12T00:00:00Z", endTime: "2026-10-19T00:00:00Z" },
    records: [{ id: "synthetic-sleep", dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: "2026-10-18T12:00:00Z",
      startTime: "2026-10-18T07:00:00Z", endTime: "2026-10-18T08:00:00Z", startZoneOffsetSeconds: -18000, endZoneOffsetSeconds: null,
      stages: [{ startTime: "2026-10-18T07:00:00Z", endTime: "2026-10-18T07:30:00Z", type: "LIGHT" },
        { startTime: "2026-10-18T07:30:00Z", endTime: "2026-10-18T08:00:00Z", type: "AWAKE" }] }],
  };
}
