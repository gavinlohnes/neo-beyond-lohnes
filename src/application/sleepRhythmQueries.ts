import type { ExternalSleepRevision } from "../domain/health/sleepImport";
import type { DaySummary } from "../engine/dayLedger";
import { deriveSleepRhythm, RHYTHM_MIN_NIGHTS, RHYTHM_WINDOW_DAYS, type RhythmGroup, type RhythmNight, type SleepRhythm } from "../engine/sleepRhythm";

/**
 * SLEEP-RHYTHM-001: the sleep page's rhythm section, from the imported Garmin sleep and day summaries the
 * page has already read. Read only.
 */
export { RHYTHM_MIN_NIGHTS, RHYTHM_WINDOW_DAYS, type RhythmGroup, type RhythmNight, type SleepRhythm };

export function sleepRhythmFrom(records: readonly ExternalSleepRevision[], summaries: readonly DaySummary[], now: Date = new Date()): SleepRhythm {
  return deriveSleepRhythm(records.map((r) => r.evidence), summaries, now);
}
