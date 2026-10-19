import { db } from "../persistence/db";
import { computeDueRollover, IDLE_WORKOUT_RELEASE_MS, nextRolloverBoundaryAfter } from "../engine/dayRollover";

/**
 * Read-only scheduling hint. The rollover command revalidates activity inside
 * its write transaction; a set recorded after this read can only postpone a
 * check, never be bypassed by the timer.
 */
export async function getNextDayRolloverCheckAt(now: Date = new Date()): Promise<Date> {
  const day = await db.beyondDays.filter((row) => row.status === "ACTIVE").last();
  if (!day || !computeDueRollover(new Date(day.startedAt), now)) {
    return nextRolloverBoundaryAfter(now);
  }
  const workout = await db.workoutSessions.where("beyondDayId").equals(day.id)
    .filter((session) => session.status === "ACTIVE").first();
  if (!workout) return now;
  const sets = await db.performedSets.where("sessionId").equals(workout.id).toArray();
  const lastActivityAt = sets.reduce(
    (latest, set) => Math.max(latest, new Date(set.recordedAt).getTime()),
    new Date(workout.startedAt).getTime(),
  );
  // Corrupt timestamps must not create a zero-delay retry loop.
  const idleAt = lastActivityAt + IDLE_WORKOUT_RELEASE_MS;
  return new Date(Number.isFinite(idleAt) ? Math.max(now.getTime(), idleAt) : now.getTime() + 30_000);
}
