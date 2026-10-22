import { GARMIN_ORIGIN } from "../../src/domain/health/sleepImport";
import { ACTIVITY_IMPORT_FORMAT, type ActivitySnapshot } from "../../src/domain/health/activityImport";
/** Synthetic only: no owner health values. */
export function syntheticActivity(exportedAt = "2026-10-19T00:00:00Z"): ActivitySnapshot {
  return {
    format: ACTIVITY_IMPORT_FORMAT, schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "0.2.0" }, source: GARMIN_ORIGIN,
    exportedAt, window: { startTime: "2026-10-12T00:00:00Z", endTime: "2026-10-19T00:00:00Z" },
    hours: [
      { startTime: "2026-10-17T22:00:00Z", endTime: "2026-10-17T23:00:00Z", zoneOffsetSeconds: -18000, steps: 1200, heartRateMinBpm: 60, heartRateAvgBpm: 80, heartRateMaxBpm: 120 },
      { startTime: "2026-10-18T03:00:00Z", endTime: "2026-10-18T04:00:00Z", zoneOffsetSeconds: -18000, steps: 300, heartRateMinBpm: 55, heartRateAvgBpm: 70, heartRateMaxBpm: 95 },
      { startTime: "2026-10-18T23:00:00Z", endTime: "2026-10-19T00:00:00Z", zoneOffsetSeconds: -18000, steps: null, heartRateMinBpm: 58, heartRateAvgBpm: 64, heartRateMaxBpm: 70 },
    ],
    restingHeartRate: [{ id: "synthetic-rhr", dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: "2026-10-18T12:00:00Z", time: "2026-10-18T05:00:00Z", zoneOffsetSeconds: -18000, bpm: 54 }],
  };
}
