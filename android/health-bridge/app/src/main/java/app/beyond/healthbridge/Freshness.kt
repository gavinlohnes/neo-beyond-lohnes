package app.beyond.healthbridge

import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** BEYOND's SYNC GARMIN link opens the helper with beyond-bridge://sync. */
const val SYNC_SCHEME = "beyond-bridge"
/** A main sleep that ended longer ago than this suggests Garmin hasn't passed a newer one to Health Connect yet. */
const val STALE_SLEEP_HOURS = 20L
/** Steps this many hours behind the current hour suggest Garmin hasn't synced today's steps yet. */
const val STALE_STEPS_HOURS = 3L
/** Garmin writes resting heart rate about once a day; older than this suggests it hasn't synced. */
const val STALE_RESTING_HOURS = 30L

private val time_ = DateTimeFormatter.ofPattern("HH:mm", Locale.US)
private val dated_ = DateTimeFormatter.ofPattern("MMM d, HH:mm", Locale.US)

/**
 * SYNC-001, per kind since BRIDGE-CHECK-001 (owner go 2026-10-31): how current each kind of Garmin data
 * in Health Connect is ("Sleep: Oct 27, 08:15 · Steps: 14:00 · Resting HR: Oct 27, 06:40"), and which
 * ones are behind, so "Garmin is behind" points at exactly what. Pure: the reads are unchanged.
 */
fun freshnessLine(newestSleepEnd: Instant?, newestStepsHour: Instant?, newestResting: Instant?, now: Instant, zone: ZoneId): String {
    fun at(t: Instant?) = t?.let { val z = it.atZone(zone); if (z.toLocalDate() == now.atZone(zone).toLocalDate()) time_.format(z) else dated_.format(z) } ?: "none"
    fun behind(t: Instant?, hours: Long) = t == null || Duration.between(t, now).toHours() >= hours
    val late = listOfNotNull(
        "sleep".takeIf { behind(newestSleepEnd, STALE_SLEEP_HOURS) },
        "steps".takeIf { behind(newestStepsHour, STALE_STEPS_HOURS) },
        "resting HR".takeIf { behind(newestResting, STALE_RESTING_HOURS) },
    )
    val line = "Sleep: ${at(newestSleepEnd)} · Steps: ${at(newestStepsHour)} · Resting HR: ${at(newestResting)}"
    return if (late.isEmpty()) line
    else "$line\nBehind: ${late.joinToString(", ")}. Open Garmin Connect, let it sync with your watch, then read again."
}
