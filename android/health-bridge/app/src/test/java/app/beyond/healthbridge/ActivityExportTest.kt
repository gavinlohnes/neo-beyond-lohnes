package app.beyond.healthbridge

import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
import java.time.Instant

class ActivityExportTest {
    private val start = Instant.parse("2026-10-12T00:00:00Z")
    private val end = Instant.parse("2026-10-19T00:00:00Z")
    private fun hour(offsetHours: Long = 0) = ExportHour(start.plusSeconds(offsetHours * 3600), -18000, 812, 58, 71, 104)
    private fun resting() = ExportRestingHeartRate("synthetic-rhr", GARMIN_PACKAGE, end, start.plusSeconds(600), -18000, 54)
    private fun export(hours: List<ExportHour> = listOf(hour()), rest: List<ExportRestingHeartRate> = listOf(resting())) =
        JSONObject(activityExport(hours, rest, start, end, end, "0.2.0"))

    @Test fun writesHourlyMeasurementsAndRestingHeartRateWithProvenance() {
        val json = export()
        assertEquals("BEYOND_HEALTH_CONNECT_ACTIVITY", json.getString("format"))
        assertEquals(2, json.getInt("schemaVersion"))
        assertEquals(GARMIN_PACKAGE, json.getString("source"))
        val h = json.getJSONArray("hours").getJSONObject(0)
        assertEquals("2026-10-12T00:00:00Z", h.getString("startTime"))
        assertEquals("2026-10-12T01:00:00Z", h.getString("endTime"))
        assertEquals(812, h.getInt("steps"))
        assertEquals(71, h.getInt("heartRateAvgBpm"))
        assertEquals(-18000, h.getInt("zoneOffsetSeconds"))
        val r = json.getJSONArray("restingHeartRate").getJSONObject(0)
        assertEquals("synthetic-rhr", r.getString("id"))
        assertEquals(54, r.getInt("bpm"))
    }
    @Test fun keepsMissingMeasurementsNullRatherThanZero() {
        val h = export(listOf(hour().copy(steps = null))).getJSONArray("hours").getJSONObject(0)
        assertTrue(h.isNull("steps"))
        val s = export(listOf(hour().copy(heartRateMin = null, heartRateAvg = null, heartRateMax = null))).getJSONArray("hours").getJSONObject(0)
        assertTrue(s.isNull("heartRateAvgBpm"))
        assertEquals(812, s.getInt("steps"))
    }
    @Test fun writesCaloriesAndKeepsMissingOnesNull() {
        val h = export(listOf(hour().copy(totalCalories = 112, activeCalories = 31))).getJSONArray("hours").getJSONObject(0)
        assertEquals(112, h.getInt("totalCaloriesKcal"))
        assertEquals(31, h.getInt("activeCaloriesKcal"))
        val none = export().getJSONArray("hours").getJSONObject(0)
        assertTrue(none.isNull("totalCaloriesKcal"))
        assertTrue(none.isNull("activeCaloriesKcal"))
    }
    @Test fun acceptsAnHourWithOnlyCalories() {
        val h = export(listOf(hour().copy(steps = null, heartRateMin = null, heartRateAvg = null, heartRateMax = null, totalCalories = 88))).getJSONArray("hours").getJSONObject(0)
        assertEquals(88, h.getInt("totalCaloriesKcal"))
        assertTrue(h.isNull("steps"))
    }
    @Test(expected = IllegalArgumentException::class) fun refusesImplausibleCalories() { export(listOf(hour().copy(totalCalories = 9000))) }
    @Test fun allowsEmptyExports() { assertEquals(0, export(emptyList(), emptyList()).getJSONArray("hours").length()) }
    @Test fun sortsHours() {
        val hours = export(listOf(hour(5), hour(2))).getJSONArray("hours")
        assertEquals("2026-10-12T02:00:00Z", hours.getJSONObject(0).getString("startTime"))
    }
    @Test(expected = IllegalArgumentException::class) fun refusesEmptyHours() { export(listOf(hour().copy(steps = null, heartRateAvg = null))) }
    @Test(expected = IllegalArgumentException::class) fun refusesDuplicateHours() { export(listOf(hour(), hour())) }
    @Test(expected = IllegalArgumentException::class) fun refusesUnalignedHours() { export(listOf(hour().copy(start = start.plusSeconds(60)))) }
    @Test(expected = IllegalArgumentException::class) fun refusesHoursOutsideWindow() { export(listOf(hour(7 * 24))) }
    @Test fun acceptsAYearWindow() { assertEquals(0, JSONObject(activityExport(emptyList(), emptyList(), end.minusSeconds(MAX_EXPORT_DAYS * 86400), end, end, "0.5.0")).getJSONArray("hours").length()) }
    @Test(expected = IllegalArgumentException::class) fun refusesImplausibleHeartRate() { export(listOf(hour().copy(heartRateMax = 400))) }
    @Test(expected = IllegalArgumentException::class) fun refusesOtherSources() { export(rest = listOf(resting().copy(origin = "phone"))) }
    @Test(expected = IllegalArgumentException::class) fun refusesDuplicateRestingIds() { export(rest = listOf(resting(), resting())) }
    @Test(expected = IllegalArgumentException::class) fun refusesExcessiveWindow() { activityExport(emptyList(), emptyList(), end.minusSeconds(MAX_EXPORT_DAYS * 86400 + 3600), end, end, "0.2.0") }
}
