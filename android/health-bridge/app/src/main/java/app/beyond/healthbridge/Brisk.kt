package app.beyond.healthbridge

import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * GRAYSON-BRISK-001 slice A: brisk minutes from Garmin's raw step records, per clock hour. Pure, so the unit tests
 * cover it without Health Connect.
 *
 * A record's cadence is its steps over its length in minutes. Its time counts as brisk at every threshold its cadence
 * reaches (90, 100, 110, 120, 130 steps a minute), in the hour each part falls in. A record longer than 15 minutes is
 * too coarse to say: its steps go to that hour's `stepsTooCoarse` instead. Where records overlap, the newest
 * (`lastModifiedTime`) owns the overlap. An hour with no judgeable record has no brisk minutes (null), not zero.
 * Research basis for 100: Tudor-Locke et al., Br J Sports Med 2018 (PMC6029645).
 */
val BRISK_CADENCES = listOf(90, 100, 110, 120, 130)
const val MAX_JUDGED_RECORD_MINUTES = 15L

data class StepSample(val start: Instant, val end: Instant, val steps: Long, val modified: Instant)
data class HourBrisk(val minutesAt: List<Int>?, val stepsTooCoarse: Long)

private data class Piece(val start: Instant, val end: Instant)

/** The parts of [start, end) not already in `claimed` (sorted, non-overlapping). */
private fun unclaimed(start: Instant, end: Instant, claimed: List<Piece>): List<Piece> {
    val out = mutableListOf<Piece>()
    var cursor = start
    for (c in claimed) {
        if (c.end <= cursor) continue
        if (c.start >= end) break
        if (c.start > cursor) out.add(Piece(cursor, minOf(c.start, end)))
        cursor = maxOf(cursor, c.end)
        if (cursor >= end) break
    }
    if (cursor < end) out.add(Piece(cursor, end))
    return out
}

private fun claim(claimed: MutableList<Piece>, piece: Piece) {
    claimed.add(piece)
    claimed.sortBy { it.start }
    val merged = mutableListOf<Piece>()
    for (p in claimed) {
        val last = merged.lastOrNull()
        if (last != null && p.start <= last.end) merged[merged.size - 1] = Piece(last.start, maxOf(last.end, p.end))
        else merged.add(p)
    }
    claimed.clear(); claimed.addAll(merged)
}

/** Splits [start, end) at clock-hour boundaries: (hour start, seconds in that hour). */
private fun byHour(piece: Piece): List<Pair<Instant, Long>> {
    val out = mutableListOf<Pair<Instant, Long>>()
    var cursor = piece.start
    while (cursor < piece.end) {
        val hour = cursor.truncatedTo(ChronoUnit.HOURS)
        val next = minOf(hour.plus(1, ChronoUnit.HOURS), piece.end)
        out.add(hour to Duration.between(cursor, next).seconds)
        cursor = next
    }
    return out
}

fun briskByHour(samples: List<StepSample>): Map<Instant, HourBrisk> {
    val judgedSeconds = mutableMapOf<Instant, LongArray>() // per hour, seconds at each threshold
    val judgedHours = mutableSetOf<Instant>()
    val coarse = mutableMapOf<Instant, Double>()
    val claimed = mutableListOf<Piece>()
    samples.filter { it.end > it.start && it.steps >= 0 }
        .sortedWith(compareByDescending<StepSample> { it.modified }.thenBy { it.start })
        .forEach { s ->
            val total = Duration.between(s.start, s.end).seconds.toDouble()
            val parts = unclaimed(s.start, s.end, claimed)
            if (total > MAX_JUDGED_RECORD_MINUTES * 60) {
                // Too coarse: its steps, in proportion to the time it still owns, go to each hour's coarse count.
                parts.flatMap(::byHour).forEach { (hour, secs) -> coarse[hour] = (coarse[hour] ?: 0.0) + s.steps * secs / total }
            } else {
                val cadence = s.steps / (total / 60.0)
                parts.flatMap(::byHour).forEach { (hour, secs) ->
                    judgedHours.add(hour)
                    val row = judgedSeconds.getOrPut(hour) { LongArray(BRISK_CADENCES.size) }
                    BRISK_CADENCES.forEachIndexed { i, c -> if (cadence >= c) row[i] += secs }
                }
            }
            claim(claimed, Piece(s.start, s.end))
        }
    return (judgedHours + coarse.keys).associateWith { hour ->
        val minutes = if (hour in judgedHours) judgedSeconds.getValue(hour).map { (it / 60).toInt().coerceIn(0, 60) } else null
        HourBrisk(minutes, Math.round(coarse[hour] ?: 0.0).coerceIn(0, 100_000))
    }
}

/**
 * The bridge screen's check after a sync, from the last 7 days of records: how long Garmin's step records are, and how
 * many steps were in records too long to judge.
 */
fun stepDetailLine(samples: List<StepSample>, now: Instant): String {
    val recent = samples.filter { it.end > it.start && it.start >= now.minus(7, ChronoUnit.DAYS) && it.start < now }
    if (recent.isEmpty()) return "Step detail: no Garmin step records in the last 7 days."
    val lengths = recent.map { Duration.between(it.start, it.end).seconds / 60.0 }.sorted()
    val median = if (lengths.size % 2 == 1) lengths[lengths.size / 2] else (lengths[lengths.size / 2 - 1] + lengths[lengths.size / 2]) / 2
    val steps = recent.sumOf { it.steps }
    val coarseSteps = recent.filter { Duration.between(it.start, it.end).seconds > MAX_JUDGED_RECORD_MINUTES * 60 }.sumOf { it.steps }
    val pct = if (steps > 0) Math.round(coarseSteps * 100.0 / steps) else 0
    val minutes = if (median < 1) "under 1 min" else "${Math.round(median)} min"
    return "Step detail: median record $minutes over the last 7 days; $pct% too coarse to judge."
}

/** Two slices' counts for the same hour (a record crossing a slice edge): minutes add up to 60, coarse steps add. */
fun mergeBrisk(a: HourBrisk, b: HourBrisk): HourBrisk {
    val minutes = when {
        a.minutesAt == null -> b.minutesAt
        b.minutesAt == null -> a.minutesAt
        else -> a.minutesAt.zip(b.minutesAt) { x, y -> (x + y).coerceAtMost(60) }
    }
    return HourBrisk(minutes, (a.stepsTooCoarse + b.stepsTooCoarse).coerceAtMost(100_000))
}
