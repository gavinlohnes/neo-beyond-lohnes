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

private val when_ = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm", Locale.US)

/**
 * SYNC-001: says how current Health Connect's Garmin data is, and what to do when it's behind, so a
 * missing night is explained instead of silently absent. Pure: the read itself is unchanged.
 */
fun freshnessLine(newestSleepEnd: Instant?, newestStepsHour: Instant?, now: Instant, zone: ZoneId): String {
    val sleep = newestSleepEnd?.let { "Newest Garmin sleep ended ${when_.format(it.atZone(zone))}." } ?: "No Garmin sleep in Health Connect for this window."
    val steps = newestStepsHour?.let { "Newest steps: ${when_.format(it.atZone(zone))}." } ?: "No Garmin steps in Health Connect for this window."
    val sleepBehind = newestSleepEnd == null || Duration.between(newestSleepEnd, now).toHours() >= STALE_SLEEP_HOURS
    val stepsBehind = newestStepsHour == null || Duration.between(newestStepsHour, now).toHours() >= STALE_STEPS_HOURS
    val hint = if (sleepBehind || stepsBehind) " If you've slept or moved since, open Garmin Connect, let it sync with your watch, then read again." else ""
    return "$sleep $steps$hint"
}
