import {
  endDay,
  logProtein,
  logSleep,
  logWater,
  startDay,
  submitCheckIn,
} from "../../src/application/commands";
import { startWorkout, completeWorkout, logSet } from "../../src/application/trainCommands";

/**
 * Shared realistic-history generator for both the Priority 2 (long-
 * history correctness) and Priority 3 (long-history performance)
 * checks — one implementation, so both are exercising the exact same
 * shape of data. Each simulated day: a check-in, a water log, a
 * protein log, a primary sleep log, occasionally a workout, then an
 * explicit end. Every write goes through the real, already-locked
 * commands — nothing here invents new behavior, it only replays
 * ordinary daily usage N times.
 */
export async function generateDayHistory(dayCount: number): Promise<void> {
  for (let i = 0; i < dayCount; i++) {
    const day = await startDay();
    await submitCheckIn(day.id, {
      energy: 3,
      stress: 3,
      mood: 3,
      soreness: 1,
      alcoholUrge: 0,
    });
    await logWater(day.id, 16);
    await logProtein(day.id, 30);
    if (i % 3 === 0) {
      const template = (["A", "B", "C"] as const)[Math.floor(i / 3) % 3]!;
      const session = await startWorkout(day.id, template, "STANDARD");
      // OWNER-GO-001: a completion advances the rotation only with a working set logged.
      await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
      await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    }
    await logSleep(day.id, 420, "PRIMARY");
    await endDay(day.id);
  }
}
