package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

/** GRAYSON-BRISK-001 slice A: brisk minutes from raw step records. */
class BriskTest {
    private val h10 = Instant.parse("2026-11-20T10:00:00Z")
    private fun at(min: Long) = h10.plusSeconds(min * 60)
    private fun rec(from: Long, to: Long, steps: Long, modified: Long = 0) = StepSample(at(from), at(to), steps, h10.plusSeconds(modified))

    @Test fun tenMinutesAt1100StepsIsTenBriskMinutes() {
        val b = briskByHour(listOf(rec(5, 15, 1100))).getValue(h10)
        assertEquals(listOf(10, 10, 10, 0, 0), b.minutesAt) // 110 a minute: brisk at 90, 100 and 110
        assertEquals(0L, b.stepsTooCoarse)
    }
    @Test fun tenMinutesAt900StepsIsNotBriskAt100() {
        val b = briskByHour(listOf(rec(5, 15, 900))).getValue(h10)
        assertEquals(listOf(10, 0, 0, 0, 0), b.minutesAt)
    }
    @Test fun aTwentyMinuteRecordIsSkippedAndCountedAsTooCoarse() {
        val b = briskByHour(listOf(rec(0, 20, 2400))).getValue(h10)
        assertNull(b.minutesAt)
        assertEquals(2400L, b.stepsTooCoarse)
    }
    @Test fun overlappingRecordsCountOnceWithTheNewestWinning() {
        // An older 10-minute brisk record and a newer slow record over its second half: only 5 brisk minutes.
        val b = briskByHour(listOf(rec(0, 10, 1200, modified = 1), rec(5, 10, 300, modified = 2))).getValue(h10)
        assertEquals(listOf(5, 5, 5, 5, 0), b.minutesAt) // the older one is 120 a minute; the newer one (60) owns minutes 5–10
    }
    @Test fun aRecordCrossingAnHourSplitsItsMinutes() {
        val m = briskByHour(listOf(rec(55, 65, 1200)))
        assertEquals(5, m.getValue(h10).minutesAt!![1])
        assertEquals(5, m.getValue(h10.plusSeconds(3600)).minutesAt!![1])
    }
    @Test fun eachOfTheFiveThresholds() {
        listOf(95L to listOf(10, 0, 0, 0, 0), 105L to listOf(10, 10, 0, 0, 0), 115L to listOf(10, 10, 10, 0, 0),
            125L to listOf(10, 10, 10, 10, 0), 135L to listOf(10, 10, 10, 10, 10)).forEach { (cadence, want) ->
            assertEquals("cadence $cadence", want, briskByHour(listOf(rec(0, 10, cadence * 10))).getValue(h10).minutesAt)
        }
    }
    @Test fun slicesMergeForAnHourOnTheirEdge() {
        val merged = mergeBrisk(HourBrisk(listOf(40, 30, 0, 0, 0), 10), HourBrisk(listOf(30, 10, 0, 0, 0), 5))
        assertEquals(listOf(60, 40, 0, 0, 0), merged.minutesAt)
        assertEquals(15L, merged.stepsTooCoarse)
        assertEquals(listOf(1, 0, 0, 0, 0), mergeBrisk(HourBrisk(null, 0), HourBrisk(listOf(1, 0, 0, 0, 0), 0)).minutesAt)
    }
    @Test fun theStepDetailLine() {
        val now = at(60 * 24)
        assertEquals("Step detail: median record 1 min over the last 7 days; 0% too coarse to judge.",
            stepDetailLine(listOf(rec(0, 1, 80), rec(1, 2, 90), rec(2, 3, 100)), now))
        assertEquals("Step detail: median record 20 min over the last 7 days; 100% too coarse to judge.",
            stepDetailLine(listOf(rec(0, 20, 2000)), now))
        assertEquals("Step detail: no Garmin step records in the last 7 days.", stepDetailLine(emptyList(), now))
    }
}
