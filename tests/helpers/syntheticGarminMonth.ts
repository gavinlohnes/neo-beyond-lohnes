import { ACTIVITY_IMPORT_FORMAT, type ActivityHour, type ActivitySnapshot, type RestingHeartRate } from "../../src/domain/health/activityImport";
import { GARMIN_ORIGIN, SLEEP_IMPORT_FORMAT, type ExternalSleep, type SleepSnapshot, type SleepStage } from "../../src/domain/health/sleepImport";

/**
 * GARMIN-004 tests: a deterministic synthetic month of Garmin data around `now` (no owner values).
 * Lived days start 16:30; work days alternate in pairs. Every night has stages, except that the
 * most recent night has no DEEP stage (Garmin sometimes leaves it out).
 */
const H = 3600_000, DAY = 24 * H;
const iso = (t: number) => new Date(t).toISOString();

export function syntheticGarminMonth(firstDayStart: number, dayCount: number, now: number) {
  const days = Array.from({ length: dayCount }, (_, i) => ({
    id: `garmin-day-${i}`, startedAt: iso(firstDayStart + i * DAY), timezoneId: "America/Chicago",
    workContext: (Math.floor(i / 2) % 2 ? "OFF" : "WORK") as "WORK" | "OFF", status: (i === dayCount - 1 ? "ACTIVE" : "ENDED") as "ACTIVE" | "ENDED",
    createdAt: iso(firstDayStart + i * DAY), updatedAt: iso(firstDayStart + i * DAY),
  }));
  const hours: ActivityHour[] = [];
  // Health Connect hours start on the UTC hour.
  for (let t = Math.ceil(firstDayStart / H) * H; t + H <= now; t += H) {
    const i = Math.floor((t - firstDayStart) / H), h = i % 24;
    const steps = h >= 14 && h < 21 ? 0 : 150 + ((i * 37) % 9) * 40; // quiet while asleep
    hours.push({ startTime: iso(t), endTime: iso(t + H), zoneOffsetSeconds: -18000, steps, heartRateMinBpm: 52, heartRateAvgBpm: 70 + (i % 7), heartRateMaxBpm: 110 });
  }
  const resting: RestingHeartRate[] = days.map((d, i) => ({ id: `rhr-${i}`, dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: iso(now),
    time: iso(Date.parse(d.startedAt) + 18 * H), zoneOffsetSeconds: -18000, bpm: 58 + (i % 5) }))
    .filter((r) => Date.parse(r.time) <= now);
  const records: ExternalSleep[] = days.flatMap((d, i) => {
    const start = Date.parse(d.startedAt) + 14 * H + 15 * 60000, minutes = 330 + (i % 4) * 25;
    const end = start + minutes * 60000;
    if (end > now) return [];
    const last = i === dayCount - 1 || end + DAY > now;
    const pattern: SleepStage["type"][] = last ? ["LIGHT", "REM", "LIGHT", "AWAKE", "REM", "LIGHT"] : ["LIGHT", "DEEP", "REM", "LIGHT", "AWAKE", "REM"];
    const stages: SleepStage[] = pattern.map((type, k) => ({ startTime: iso(start + (k * minutes * 60000) / pattern.length), endTime: iso(start + ((k + 1) * minutes * 60000) / pattern.length), type }));
    return [{ id: `sleep-${i}`, dataOriginPackage: GARMIN_ORIGIN, lastModifiedTime: iso(now), startTime: iso(start), endTime: iso(end), startZoneOffsetSeconds: -18000, endZoneOffsetSeconds: -18000, stages }];
  });
  const window = { startTime: iso(firstDayStart - H), endTime: iso(now) };
  const activity: ActivitySnapshot = { format: ACTIVITY_IMPORT_FORMAT, schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "0.5.0" }, source: GARMIN_ORIGIN, exportedAt: iso(now), window, hours, restingHeartRate: resting };
  const sleep: SleepSnapshot = { format: SLEEP_IMPORT_FORMAT, schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "0.5.0" }, exportedAt: iso(now), window, records };
  return { days, activity, sleep };
}
