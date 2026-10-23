package app.beyond.healthbridge

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class FreshnessTest {
    private val zone = ZoneId.of("America/Chicago")
    private val now = Instant.parse("2026-10-23T08:45:00Z") // 03:45 local

    @Test fun currentDataNamesBothTimesWithoutAHint() {
        val line = freshnessLine(Instant.parse("2026-10-22T19:00:00Z"), Instant.parse("2026-10-23T07:00:00Z"), now, zone)
        assertEquals("Newest Garmin sleep ended Thu 22 Oct, 14:00. Newest steps: Fri 23 Oct, 02:00.", line)
    }

    @Test fun anOldSleepExplainsGarminSync() {
        val line = freshnessLine(Instant.parse("2026-10-21T19:20:00Z"), Instant.parse("2026-10-23T07:00:00Z"), now, zone)
        assertTrue(line.startsWith("Newest Garmin sleep ended Wed 21 Oct, 14:20."))
        assertTrue(line.endsWith("open Garmin Connect, let it sync with your watch, then read again."))
    }

    @Test fun lateStepsAndMissingDataAlsoExplain() {
        assertTrue(freshnessLine(Instant.parse("2026-10-22T19:00:00Z"), Instant.parse("2026-10-23T02:00:00Z"), now, zone).contains("open Garmin Connect"))
        val none = freshnessLine(null, null, now, zone)
        assertTrue(none.startsWith("No Garmin sleep in Health Connect for this window. No Garmin steps"))
        assertTrue(none.contains("open Garmin Connect"))
    }
}
