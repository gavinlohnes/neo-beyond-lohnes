package app.beyond.healthbridge

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** GRAYSON-TRAIN-RUN-CUES-001: when each cue BEYOND sends comes due, from the same timestamps BEYOND uses. */
class RunCuesTest {
    private val start = 1_800_000_000_000L

    /** Week 1 run 1 of the NHS plan, as BEYOND's runningCueTimeline() lays it out (first cues and the end). */
    private fun json(pausedMs: Long = 0, pausedAt: Long? = null, v: Int = 1, cues: String = WEEK1) =
        """{"v":$v,"id":"run-1","title":"Running · Week 1, run 1","startedAt":$start,"pausedMs":$pausedMs,""" +
            (if (pausedAt != null) """"pausedAt":$pausedAt,""" else "") + """"cues":[$cues]}"""

    private fun cue(at: Int, kind: String, text: String = kind, speak: Boolean = true, buzz: Boolean = kind == "RUN" || kind == "WALK") =
        """{"at":$at,"kind":"$kind","text":"$text","speak":$speak,"buzz":$buzz}"""

    private val WEEK1 = listOf(
        cue(0, "WARMUP", "Warm-up walk, 5 minutes"),
        cue(300, "RUN", "Run for 1 minute"),
        cue(360, "WALK", "Walk for 1 minute 30 seconds"),
        cue(450, "RUN", "Run for 1 minute"),
        cue(510, "WALK", "Walk for 1 minute 30 seconds"),
        cue(600, "HALFWAY", "Halfway"),
        cue(600, "RUN", "Run for 1 minute"),
        cue(1500, "COOLDOWN", "Cool-down walk, 5 minutes"),
        cue(1800, "FINISH", "Finished. That's the run done."),
    ).joinToString(",")

    private val week1 get() = parseRunCues(json())!!

    @Test fun atTheStartTheWarmUpIsDueNow() {
        val next = nextRunCue(week1, start)!!
        assertEquals(0, next.index)
        assertEquals("Warm-up walk, 5 minutes", next.cue.text)
        assertEquals(0L, next.delayMs)
    }

    @Test fun midIntervalWaitsForTheNextChange() {
        val next = nextRunCue(week1, start + 320_000, doneIndex = 1)!!
        assertEquals("WALK", next.cue.kind)
        assertEquals(40_000L, next.delayMs)
        assertEquals(start + 360_000, runCueDueAt(week1, next.cue))
    }

    @Test fun pausedSchedulesNothingAndResumeMovesEveryCueByThePause() {
        assertNull(nextRunCue(parseRunCues(json(pausedAt = start + 320_000))!!, start + 400_000, doneIndex = 1))
        // Paused at 5:20 for 30 seconds: the walk at 6:00 now comes at 6:30 of wall time.
        val resumed = parseRunCues(json(pausedMs = 30_000))!!
        val next = nextRunCue(resumed, start + 350_000, doneIndex = 1)!!
        assertEquals("WALK", next.cue.kind)
        assertEquals(40_000L, next.delayMs)
        assertEquals(start + 390_000, runCueDueAt(resumed, next.cue))
    }

    @Test fun afterFinishThereIsNothingLeft() {
        val p = week1
        assertEquals("FINISH", nextRunCue(p, start + 1_800_000, doneIndex = 7)!!.cue.kind)
        assertNull(nextRunCue(p, start + 1_800_000, doneIndex = 8))
        assertNull(nextRunCue(p, start + 1_800_000 + RUN_CUES_FINISH_GRACE_MS, doneIndex = 7))
        assertEquals(start + 1_800_000 + RUN_CUES_FINISH_GRACE_MS, runCuesStopAt(p))
    }

    @Test fun aLateCueInsideItsIntervalIsSaidAndOnePastItsIntervalIsSkipped() {
        // The phone was busy: at 6:08 the 6:00 walk is late but its walk is still going, so it's said now.
        val late = nextRunCue(week1, start + 368_000, doneIndex = 1)!!
        assertEquals(2, late.index)
        assertEquals(0L, late.delayMs)
        // At 7:35 the walk (6:00 to 7:30) has passed: skip to the run at 7:30, never say the walk after it.
        val skipped = nextRunCue(week1, start + 455_000, doneIndex = 1)!!
        assertEquals(3, skipped.index)
        assertEquals("RUN", skipped.cue.kind)
    }

    @Test fun cuesAtTheSameSecondAreBothSaid() {
        val first = nextRunCue(week1, start + 600_000, doneIndex = 4)!!
        assertEquals("HALFWAY", first.cue.kind)
        val second = nextRunCue(week1, start + 600_500, doneIndex = first.index)!!
        assertEquals("RUN", second.cue.kind)
        assertEquals(0L, second.delayMs)
    }

    @Test fun refusesAnythingButAVersionOnePayloadOfAFewHours() {
        assertNull(parseRunCues(json(v = 2)))
        assertNull(parseRunCues("not json"))
        assertNull(parseRunCues(null))
        assertNull(parseRunCues(json(cues = (0..RUN_CUES_MAX).joinToString(",") { cue(it, "WALK") })))
        assertNotNull(parseRunCues(json(cues = (0 until RUN_CUES_MAX).joinToString(",") { cue(it, "WALK") })))
        assertNull(parseRunCues(json(cues = cue(0, "WARMUP") + "," + cue(4 * 60 * 60 + 1, "FINISH"))))
        assertNull(parseRunCues(json(cues = cue(60, "RUN") + "," + cue(0, "WALK"))))
        assertNull(parseRunCues(json(cues = cue(0, "SPRINT"))))
        assertNull(parseRunCues(json(cues = "")))
    }

    @Test fun theLockScreenLineNamesThisIntervalAndTheNextChange() {
        val i = runInterval(week1, start + 318_000)!!
        assertEquals("RUN", i.kind)
        assertEquals("WALK", i.nextKind)
        assertEquals(start + 360_000, i.nextChangeAt)
        assertEquals("Run · walk in", runIntervalLine(i))
        assertEquals("0:42", formatRunClock(42_000))
        val last = runInterval(week1, start + 1_600_000)!!
        assertEquals("Cool-down walk · finish in", runIntervalLine(last))
    }

    @Test fun runAndWalkBuzzDifferently() {
        assertArrayEquals(longArrayOf(0, 450, 200, 450), runCueBuzzPattern("RUN"))
        assertArrayEquals(longArrayOf(0, 180), runCueBuzzPattern("WALK"))
        assertNull(runCueBuzzPattern("HALFWAY"))
        assertTrue(week1.cues.filter { it.buzz }.all { it.kind == "RUN" || it.kind == "WALK" })
    }

    @Test fun neverRunsPastFourHoursFromTheStart() {
        val paused = parseRunCues(json(pausedAt = start + 60_000))!!
        assertEquals(start + RUN_CUES_MAX_MS, runCuesStopAt(paused))
    }
}
