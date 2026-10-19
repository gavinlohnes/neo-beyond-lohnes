package app.beyond.healthbridge

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

const val GARMIN_PACKAGE = "com.garmin.android.apps.connectmobile"
data class ExportStage(val start: Instant, val end: Instant, val type: String)
data class ExportSleep(val id: String, val origin: String, val modified: Instant, val start: Instant, val end: Instant,
    val startOffset: Int?, val endOffset: Int?, val stages: List<ExportStage>)

/** Versioned interchange. No source titles, notes, patient identifiers or unrelated types. */
fun sleepExport(records: List<ExportSleep>, start: Instant, end: Instant, exported: Instant, version: String): String {
    require(start < end && java.time.Duration.between(start, end).seconds <= 7 * 86400 && end <= exported)
    require(records.size <= 500 && records.map { it.id }.distinct().size == records.size)
    require(records.sumOf { it.stages.size } <= 15000)
    val rows = JSONArray()
    records.forEach { r ->
        require(r.origin == GARMIN_PACKAGE && r.start >= start && r.end <= end && r.start < r.end)
        require(r.id.isNotEmpty() && r.id.length <= 200 && r.stages.size <= 1500)
        val stages = JSONArray()
        var previous = r.start
        r.stages.forEach { s ->
            require(s.start >= previous && s.start < s.end && s.end <= r.end)
            require(s.type in setOf("AWAKE", "SLEEPING", "OUT_OF_BED", "LIGHT", "DEEP", "REM", "AWAKE_IN_BED", "UNKNOWN"))
            previous = s.end
            stages.put(JSONObject().put("startTime", s.start.toString()).put("endTime", s.end.toString()).put("type", s.type))
        }
        rows.put(JSONObject().put("id", r.id).put("dataOriginPackage", r.origin).put("lastModifiedTime", r.modified.toString())
            .put("startTime", r.start.toString()).put("endTime", r.end.toString())
            .put("startZoneOffsetSeconds", r.startOffset ?: JSONObject.NULL).put("endZoneOffsetSeconds", r.endOffset ?: JSONObject.NULL).put("stages", stages))
    }
    val result = JSONObject().put("format", "BEYOND_HEALTH_CONNECT_SLEEP").put("schemaVersion", 1)
        .put("producer", JSONObject().put("name", "BEYOND Health Bridge").put("version", version))
        .put("exportedAt", exported.toString()).put("window", JSONObject().put("startTime", start.toString()).put("endTime", end.toString()))
        .put("records", rows).toString(2)
    require(result.toByteArray(Charsets.UTF_8).size <= 2 * 1024 * 1024) { "Export exceeds the file limit." }
    return result
}
