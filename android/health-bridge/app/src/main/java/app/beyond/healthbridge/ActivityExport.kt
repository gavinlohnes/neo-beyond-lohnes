package app.beyond.healthbridge

import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant

/**
 * One clock hour of Garmin measurements. Hourly, not daily, so BEYOND can later total a lived day
 * (16:30–16:30 for a night worker) without the helper guessing where a day starts.
 */
data class ExportHour(val start: Instant, val zoneOffset: Int?, val steps: Long?, val heartRateMin: Long?,
    val heartRateAvg: Long?, val heartRateMax: Long?,
    /** GARMIN-005: Garmin's total (resting + active) and active energy for the hour, whole kilocalories. */
    val totalCalories: Long? = null, val activeCalories: Long? = null)
data class ExportRestingHeartRate(val id: String, val origin: String, val modified: Instant, val time: Instant,
    val zoneOffset: Int?, val bpm: Long)

private fun nullable(value: Any?): Any = value ?: JSONObject.NULL

/**
 * Versioned interchange for steps, heart rate and (schema 2, GARMIN-005) calories burned. Separate from
 * the sleep file, whose format is unchanged. BEYOND still accepts schema 1 files from older helpers.
 */
const val ACTIVITY_SCHEMA_VERSION = 2
const val MAX_HOUR_KCAL = 5000L
fun activityExport(hours: List<ExportHour>, resting: List<ExportRestingHeartRate>, start: Instant, end: Instant,
    exported: Instant, version: String): String {
    require(start < end && Duration.between(start, end).seconds <= MAX_EXPORT_DAYS * 86400 && end <= exported)
    require(hours.size <= MAX_EXPORT_DAYS * 24 && hours.map { it.start }.distinct().size == hours.size)
    require(resting.size <= 1000 && resting.map { it.id }.distinct().size == resting.size)
    val rows = JSONArray()
    hours.sortedBy { it.start }.forEach { h ->
        require(h.start >= start && h.start.plus(Duration.ofHours(1)) <= end && h.start.epochSecond % 3600 == 0L)
        require(h.steps != null || h.heartRateAvg != null || h.totalCalories != null || h.activeCalories != null)
        listOf(h.totalCalories, h.activeCalories).forEach { require(it == null || it in 0..MAX_HOUR_KCAL) }
        require(h.steps == null || h.steps in 0..100_000)
        listOf(h.heartRateMin, h.heartRateAvg, h.heartRateMax).forEach { require(it == null || it in 20..300) }
        rows.put(JSONObject().put("startTime", h.start.toString()).put("endTime", h.start.plus(Duration.ofHours(1)).toString())
            .put("zoneOffsetSeconds", nullable(h.zoneOffset)).put("steps", nullable(h.steps))
            .put("heartRateMinBpm", nullable(h.heartRateMin)).put("heartRateAvgBpm", nullable(h.heartRateAvg))
            .put("heartRateMaxBpm", nullable(h.heartRateMax))
            .put("totalCaloriesKcal", nullable(h.totalCalories)).put("activeCaloriesKcal", nullable(h.activeCalories)))
    }
    val restingRows = JSONArray()
    resting.sortedBy { it.time }.forEach { r ->
        require(r.origin == GARMIN_PACKAGE && r.time >= start && r.time < end && r.bpm in 20..300)
        require(r.id.isNotEmpty() && r.id.length <= 200)
        restingRows.put(JSONObject().put("id", r.id).put("dataOriginPackage", r.origin).put("lastModifiedTime", r.modified.toString())
            .put("time", r.time.toString()).put("zoneOffsetSeconds", nullable(r.zoneOffset)).put("bpm", r.bpm))
    }
    val result = JSONObject().put("format", "BEYOND_HEALTH_CONNECT_ACTIVITY").put("schemaVersion", ACTIVITY_SCHEMA_VERSION)
        .put("producer", JSONObject().put("name", "BEYOND Health Bridge").put("version", version))
        .put("source", GARMIN_PACKAGE).put("exportedAt", exported.toString())
        .put("window", JSONObject().put("startTime", start.toString()).put("endTime", end.toString()))
        .put("hours", rows).put("restingHeartRate", restingRows).toString()
    require(result.toByteArray(Charsets.UTF_8).size <= MAX_EXPORT_BYTES) { "Export exceeds the file limit." }
    return result
}
