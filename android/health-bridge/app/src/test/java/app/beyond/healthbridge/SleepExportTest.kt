package app.beyond.healthbridge

import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
import java.time.Instant

class SleepExportTest {
    private val start = Instant.parse("2026-10-12T00:00:00Z")
    private val end = Instant.parse("2026-10-19T00:00:00Z")
    private fun record() = ExportSleep("synthetic-sleep", GARMIN_PACKAGE, end, start, start.plusSeconds(3600), -18000, null, emptyList())
    @Test fun preservesProvenanceOffsetsAndMissingStages() {
        val json = JSONObject(sleepExport(listOf(record()), start, end, end, "0.1.0"))
        assertEquals("BEYOND_HEALTH_CONNECT_SLEEP", json.getString("format"))
        assertEquals(1, json.getInt("schemaVersion"))
        val r = json.getJSONArray("records").getJSONObject(0)
        assertEquals(GARMIN_PACKAGE, r.getString("dataOriginPackage"))
        assertEquals("synthetic-sleep", r.getString("id"))
        assertEquals(end.toString(), r.getString("lastModifiedTime"))
        assertEquals(-18000, r.getInt("startZoneOffsetSeconds"))
        assertTrue(r.isNull("endZoneOffsetSeconds"))
        assertEquals(0, r.getJSONArray("stages").length())
        assertFalse(r.has("asleepMinutes"))
    }
    @Test fun allowsEmptyExports() { assertEquals(0, JSONObject(sleepExport(emptyList(), start, end, end, "0.1.0")).getJSONArray("records").length()) }
    @Test(expected = IllegalArgumentException::class) fun refusesOtherSources() { sleepExport(listOf(record().copy(origin = "phone")), start, end, end, "0.1.0") }
    @Test(expected = IllegalArgumentException::class) fun refusesDuplicateSourceIds() { sleepExport(listOf(record(), record()), start, end, end, "0.1.0") }
    @Test(expected = IllegalArgumentException::class) fun refusesOutsideWindow() { sleepExport(listOf(record().copy(start = start.minusSeconds(1))), start, end, end, "0.1.0") }
    @Test(expected = IllegalArgumentException::class) fun refusesOverlappingStages() {
        val r = record()
        val stage = ExportStage(r.start, r.end, "LIGHT")
        sleepExport(listOf(r.copy(stages = listOf(stage, stage))), start, end, end, "0.1.0")
    }
    @Test(expected = IllegalArgumentException::class) fun refusesExcessiveWindow() { sleepExport(emptyList(), end.minusSeconds(MAX_EXPORT_DAYS * 86400 + 1), end, end, "0.1.0") }
    @Test(expected = IllegalArgumentException::class) fun refusesExcessiveRecords() { sleepExport((0..2000).map { record().copy(id = "r-$it") }, start, end, end, "0.1.0") }
}
