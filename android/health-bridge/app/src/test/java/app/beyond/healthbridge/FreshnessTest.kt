package app.beyond.healthbridge

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

class FreshnessTest {
    private val zone = ZoneId.of("America/Chicago")
    private val now = Instant.parse("2026-10-23T08:45:00Z") // Fri 03:45 local

    @Test fun currentDataNamesEachKindWithoutAHint() {
        val line = freshnessLine(Instant.parse("2026-10-22T19:00:00Z"), Instant.parse("2026-10-23T07:00:00Z"), Instant.parse("2026-10-22T11:40:00Z"), now, zone)
        assertEquals("Sleep: Oct 22, 14:00 · Steps: 02:00 · Resting HR: Oct 22, 06:40", line)
    }

    @Test fun namesExactlyWhatIsBehind() {
        val line = freshnessLine(Instant.parse("2026-10-21T19:20:00Z"), Instant.parse("2026-10-23T07:00:00Z"), Instant.parse("2026-10-20T11:00:00Z"), now, zone)
        assertTrue(line.startsWith("Sleep: Oct 21, 14:20 · Steps: 02:00 · Resting HR: Oct 20, 06:00"))
        assertTrue(line.endsWith("Behind: sleep, resting HR. Open Garmin Connect, let it sync with your watch, then read again."))
    }

    @Test fun lateStepsAndMissingDataAlsoExplain() {
        assertTrue(freshnessLine(Instant.parse("2026-10-22T19:00:00Z"), Instant.parse("2026-10-23T02:00:00Z"), Instant.parse("2026-10-22T11:40:00Z"), now, zone).contains("Behind: steps."))
        val none = freshnessLine(null, null, null, now, zone)
        assertTrue(none.startsWith("Sleep: none · Steps: none · Resting HR: none"))
        assertTrue(none.contains("Behind: sleep, steps, resting HR."))
    }

    @Test fun syncSummaryReadsSleepAndSteps() {
        val start = Instant.parse("2026-10-31T11:00:00Z")
        assertEquals("slept 7h12 · 8,400 steps today", syncSummary(start, start.plusSeconds(7 * 3600 + 12 * 60), 8400))
        assertEquals("slept 0h45", syncSummary(start, start.plusSeconds(45 * 60), null))
    }
}
