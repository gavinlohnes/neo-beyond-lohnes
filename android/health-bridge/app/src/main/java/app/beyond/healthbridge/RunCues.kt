package app.beyond.healthbridge

import org.json.JSONObject

/**
 * GRAYSON-TRAIN-RUN-CUES-001 (Gavin, 2026-11-24): the run cues BEYOND hands the Bridge, and when each is due.
 *
 * Pure (no Android types) so it unit-tests on the JVM. BEYOND is the one source of truth: the payload carries every
 * cue's time, words and whether to speak or buzz, and the Bridge only works out *when*, from the same absolute
 * timestamps BEYOND's running screen uses (`startedAt + pausedMs`, frozen at `pausedAt` while paused), so both apps
 * agree. Nothing here is written to disk.
 */

/** The six cue kinds of RUN-001's timeline. */
val RUN_CUE_KINDS = setOf("WARMUP", "RUN", "WALK", "HALFWAY", "COOLDOWN", "FINISH")

/** The segment kinds: each one starts an interval (HALFWAY and FINISH don't). */
val RUN_SEGMENT_KINDS = setOf("WARMUP", "RUN", "WALK", "COOLDOWN")

const val RUN_CUES_MAX = 200

/** The longest run the Bridge will hold; it also stops itself this long after the start. */
const val RUN_CUES_MAX_MS = 4 * 60 * 60 * 1000L

/** How long after FINISH the Bridge keeps going before it stops itself. */
const val RUN_CUES_FINISH_GRACE_MS = 10_000L

data class RunCue(val at: Int, val kind: String, val text: String, val speak: Boolean, val buzz: Boolean)

data class RunCuePayload(
    val id: String,
    val title: String,
    val startedAt: Long,
    val pausedMs: Long,
    val pausedAt: Long?,
    val cues: List<RunCue>,
)

/**
 * Parses BEYOND's payload, or null for anything else: a version other than 1, no cues, more than [RUN_CUES_MAX] cues,
 * a run longer than [RUN_CUES_MAX_MS], cues out of time order, an unknown kind, or a bad timestamp.
 */
fun parseRunCues(json: String?): RunCuePayload? = try {
    val o = JSONObject(json ?: "")
    if (o.getInt("v") != 1) null
    else {
        val list = o.getJSONArray("cues")
        val startedAt = o.getLong("startedAt")
        val pausedMs = o.getLong("pausedMs")
        val pausedAt = if (o.has("pausedAt") && !o.isNull("pausedAt")) o.getLong("pausedAt") else null
        val count = list.length()
        if (count == 0 || count > RUN_CUES_MAX || startedAt <= 0 || pausedMs < 0 || (pausedAt != null && pausedAt < startedAt)) null
        else {
            val cues = (0 until count).map { i ->
                val c = list.getJSONObject(i)
                RunCue(c.getInt("at"), c.getString("kind"), c.getString("text").take(200), c.getBoolean("speak"), c.getBoolean("buzz"))
            }
            val ordered = cues.zipWithNext().all { (a, b) -> a.at <= b.at }
            val valid = cues.all { it.at >= 0 && it.kind in RUN_CUE_KINDS }
            if (!ordered || !valid || cues.last().at * 1000L > RUN_CUES_MAX_MS) null
            else RunCuePayload(o.getString("id").take(80), o.optString("title", "Running").take(80), startedAt, pausedMs, pausedAt, cues)
        }
    }
} catch (e: Exception) { null }

/** Whole seconds of the run so far, the same sum as BEYOND's runningElapsedSeconds(). */
fun runElapsedMs(p: RunCuePayload, nowMs: Long): Long = maxOf(0L, (p.pausedAt ?: nowMs) - p.startedAt - p.pausedMs)

/** The wall-clock time a cue comes due (meaningful while the run isn't paused). */
fun runCueDueAt(p: RunCuePayload, cue: RunCue): Long = p.startedAt + p.pausedMs + cue.at * 1000L

/**
 * When cue [index] stops being worth saying, in run seconds: the time of the next cue that comes *later* (cues at the
 * same second, such as a HALFWAY that lands on a change, share an interval), or FINISH's grace after the last.
 */
fun runCueIntervalEnd(p: RunCuePayload, index: Int): Long {
    val at = p.cues[index].at
    val later = p.cues.drop(index + 1).firstOrNull { it.at > at }
    return if (later != null) later.at * 1000L else at * 1000L + RUN_CUES_FINISH_GRACE_MS
}

data class NextRunCue(val index: Int, val cue: RunCue, val delayMs: Long)

/**
 * The next cue to act on after [doneIndex] (the last one already handled, -1 before the first), or null when there's
 * nothing to schedule: paused, or past FINISH. `delayMs` is 0 when it's due now. A cue that's late but whose interval
 * is still running is due now (said late beats never said); one whose interval has already passed is skipped, so cues
 * are never said out of order.
 */
fun nextRunCue(p: RunCuePayload, nowMs: Long, doneIndex: Int = -1): NextRunCue? {
    if (p.pausedAt != null) return null
    val elapsed = runElapsedMs(p, nowMs)
    for (i in (doneIndex + 1) until p.cues.size) {
        if (runCueIntervalEnd(p, i) <= elapsed) continue
        val cue = p.cues[i]
        return NextRunCue(i, cue, maxOf(0L, cue.at * 1000L - elapsed))
    }
    return null
}

/** The interval running now and when the next change comes, for the lock-screen line "Walk · run in 0:42". */
data class RunInterval(val kind: String, val nextKind: String?, val nextChangeAt: Long?)

fun runInterval(p: RunCuePayload, nowMs: Long): RunInterval? {
    val elapsed = runElapsedMs(p, nowMs)
    val segments = p.cues.filter { it.kind in RUN_SEGMENT_KINDS }
    val current = segments.lastOrNull { it.at * 1000L <= elapsed } ?: segments.firstOrNull() ?: return null
    val next = segments.firstOrNull { it.at * 1000L > elapsed }
    val finish = p.cues.lastOrNull { it.kind == "FINISH" }
    val changeAt = (next ?: finish)?.let { it.at * 1000L - elapsed + nowMs }
    return RunInterval(current.kind, next?.kind ?: finish?.kind, changeAt)
}

/** When the Bridge stops itself: FINISH's grace after the end of the run, and never past [RUN_CUES_MAX_MS] from start. */
fun runCuesStopAt(p: RunCuePayload): Long {
    val cap = p.startedAt + RUN_CUES_MAX_MS
    if (p.pausedAt != null) return cap
    val last = p.cues.last()
    return minOf(cap, runCueDueAt(p, last) + RUN_CUES_FINISH_GRACE_MS)
}

/** Vibration patterns (off, on, off, on… in ms): a long double before RUN, one short before WALK. */
fun runCueBuzzPattern(kind: String): LongArray? = when (kind) {
    "RUN" -> longArrayOf(0, 450, 200, 450)
    "WALK" -> longArrayOf(0, 180)
    else -> null
}

/** "0:42", "12:05": the countdown the lock-screen line shows. */
fun formatRunClock(ms: Long): String {
    val s = maxOf(0L, (ms + 999) / 1000)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}

private val RUN_KIND_WORD = mapOf("WARMUP" to "Warm-up walk", "RUN" to "Run", "WALK" to "Walk", "COOLDOWN" to "Cool-down walk", "FINISH" to "Finish")

/** "Walk · run in" for the notification text; Android's countdown chronometer beside it shows the "0:42". */
fun runIntervalLine(i: RunInterval): String {
    val now = RUN_KIND_WORD[i.kind] ?: i.kind
    val next = i.nextKind?.let { RUN_KIND_WORD[it]?.lowercase() }
    return if (next == null) now else "$now · $next in"
}
