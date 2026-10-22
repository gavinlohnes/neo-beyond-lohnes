package app.beyond.healthbridge

import android.content.ClipData
import android.content.Intent
import android.os.Bundle
import androidx.core.content.FileProvider
import java.io.File
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByDurationRequest
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

class MainActivity : ComponentActivity() {
    private val permissions = setOf(HealthPermission.getReadPermission(SleepSessionRecord::class))
    // GARMIN-002: optional. Sleep still works when these are declined.
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val heartRatePermission = HealthPermission.getReadPermission(HeartRateRecord::class)
    private val restingPermission = HealthPermission.getReadPermission(RestingHeartRateRecord::class)
    private val activityPermissions = setOf(stepsPermission, heartRatePermission, restingPermission)
    // GARMIN-003: optional "Access past data" for READ FULL HISTORY. Without it Health Connect returns about 30 days.
    private val historyPermission = HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY
    /** 7 for the daily read; MAX_EXPORT_DAYS for READ FULL HISTORY. */
    private var windowDays = 7L
    private val client by lazy { HealthConnectClient.getOrCreate(this) }
    private lateinit var status: TextView
    private lateinit var read: Button
    private lateinit var history: Button
    private lateinit var save: Button
    private lateinit var saveActivity: Button
    private lateinit var send: Button
    private var prepared: String? = null // memory only; discarded when this Activity is destroyed
    private var preparedActivity: String? = null
    private var activityGranted: Set<String> = emptySet() // what the prepared activity file was read with
    private var working = false
    private val requestPermission = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        if (granted.containsAll(permissions)) readSleep() else clear("Sleep access was not granted. No export was created.")
    }
    private val saveFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        write(uri, prepared, permissions, "Saved. Open BEYOND → COMMAND → IMPORT HEALTH DATA, choose this file, review, then confirm. The file contains private sleep data; delete it when finished.")
    }
    private val saveActivityFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        write(uri, preparedActivity, activityGranted, "Saved. Open BEYOND → COMMAND → IMPORT HEALTH DATA, choose this file, review, then confirm. The file contains private health data; delete it when finished.")
    }
    private fun write(uri: android.net.Uri?, text: String?, required: Set<String>, done: String) {
        if (uri == null) { status.text = "Save cancelled. No data was imported into BEYOND." }
        else if (text == null) { clear("The prepared export was discarded when the helper restarted. Read again and save a new file. The selected file has no health data.") }
        else lifecycleScope.launch {
            setWorking(true)
            try {
                if (!client.permissionController.getGrantedPermissions().containsAll(required)) {
                    clear("Health access was revoked. Read again after granting access.")
                } else {
                    withContext(Dispatchers.IO) {
                        val output = contentResolver.openOutputStream(uri, "wt") ?: error("Cannot open file")
                        output.bufferedWriter(Charsets.UTF_8).use { it.write(text) }
                    }
                    status.text = done
                }
            } catch (_: Exception) { status.text = "File could not be saved. No data was imported into BEYOND. Try saving again." }
            finally { setWorking(false) }
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val padding = (16 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(padding, padding, padding, padding) }
        fun paragraph(text: String) = TextView(this).apply { this.text = text; textSize = 18f; setPadding(0, 12, 0, 12); layout.addView(this) }
        paragraph("BEYOND Health Bridge").apply { textSize = 26f; ViewCompat.setAccessibilityHeading(this, true) }
        paragraph("Read Garmin sleep, steps and heart rate from the last 7 days, or everything Health Connect has with READ FULL HISTORY. Save a file, then review and confirm it in BEYOND. This helper does not sync automatically.")
        paragraph("Privacy and permission use: read only. Sleep: Garmin record IDs, source, source modification time, session times, UTC offsets and sleep stages. Steps and heart rate (optional): hourly step totals, hourly heart-rate low/average/high and UTC offsets, plus Garmin resting heart rate with its record IDs, source, source modification time and UTC offsets. Each goes into its own file you save, or is sent straight to BEYOND through Android's share sheet. No account, server, Internet permission or other health categories. Your Health Connect data is never changed. Files may be private health information; choose a local folder and delete the file after importing.")
        status = paragraph("Ready. Complete Garmin's sync before reading. Sessions crossing the 7-day window edges are excluded.").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        read = Button(this).apply {
            text = "ALLOW ACCESS AND READ"
            setOnClickListener {
                if (HealthConnectClient.getSdkStatus(this@MainActivity) != HealthConnectClient.SDK_AVAILABLE) {
                    clear("Health Connect is unavailable or needs an update. Open Android Settings → Health Connect, update it, then return.")
                } else lifecycleScope.launch {
                    try {
                        // Ask again only while something is missing; Health Connect stops prompting after repeated declines.
                        windowDays = 7
                        if (client.permissionController.getGrantedPermissions().containsAll(permissions + activityPermissions)) readSleep()
                        else requestPermission.launch(permissions + activityPermissions)
                    } catch (_: Exception) { clear("Health Connect could not be opened. Check sleep access in Android Settings and try again.") }
                }
            }
        }
        layout.addView(read)
        history = Button(this).apply {
            text = "READ FULL HISTORY"
            setOnClickListener {
                if (HealthConnectClient.getSdkStatus(this@MainActivity) != HealthConnectClient.SDK_AVAILABLE) {
                    clear("Health Connect is unavailable or needs an update. Open Android Settings → Health Connect, update it, then return.")
                } else lifecycleScope.launch {
                    try {
                        windowDays = MAX_EXPORT_DAYS
                        val wanted = permissions + activityPermissions + (if (historyAvailable()) setOf(historyPermission) else emptySet())
                        if (client.permissionController.getGrantedPermissions().containsAll(wanted)) readSleep()
                        else requestPermission.launch(wanted)
                    } catch (_: Exception) { clear("Health Connect could not be opened. Check access in Android Settings and try again.") }
                }
            }
        }
        layout.addView(history)
        save = Button(this).apply { text = "SAVE SLEEP FILE"; isEnabled = false; setOnClickListener { saveFile.launch("beyond-sleep-${Instant.now().toString().replace(':', '-')}.json") } }
        layout.addView(save)
        saveActivity = Button(this).apply { text = "SAVE STEPS AND HEART RATE FILE"; isEnabled = false; setOnClickListener { saveActivityFile.launch("beyond-activity-${Instant.now().toString().replace(':', '-')}.json") } }
        layout.addView(saveActivity)
        send = Button(this).apply { text = "SEND TO BEYOND"; isEnabled = false; setOnClickListener { sendToBeyond() } }
        layout.addView(send)
        clearShared()
        val scroll = ScrollView(this).apply { addView(layout) }
        ViewCompat.setOnApplyWindowInsetsListener(scroll) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        setContentView(scroll)
        ViewCompat.requestApplyInsets(scroll)
    }
    override fun onResume() {
        super.onResume()
        if (prepared != null && HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) lifecycleScope.launch {
            try { if (!client.permissionController.getGrantedPermissions().containsAll(permissions)) clear("Sleep access was revoked. No export is ready.") }
            catch (_: Exception) { clear("Sleep access could not be checked. Read again.") }
        }
    }
    private fun setWorking(value: Boolean) {
        working = value; read.isEnabled = !value; history.isEnabled = !value
        save.isEnabled = !value && prepared != null; saveActivity.isEnabled = !value && preparedActivity != null
        send.isEnabled = !value && (prepared != null || preparedActivity != null)
    }
    private fun clear(message: String) {
        prepared = null; preparedActivity = null; save.isEnabled = false; saveActivity.isEnabled = false; send.isEnabled = false; status.text = message
    }
    private fun historyAvailable() = client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_HISTORY) ==
        HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    private fun shareDir() = File(cacheDir, "share")
    /** Shared copies live only in the helper's private cache and are removed on the next launch or send. */
    private fun clearShared() { shareDir().listFiles()?.forEach { it.delete() } }
    /**
     * GARMIN-002 SEND TO BEYOND: hands the prepared files to Android's share sheet. Choosing the installed
     * BEYOND app opens its import preview; nothing is imported until it is confirmed there.
     */
    private fun sendToBeyond() {
        val sleep = prepared; val activity = preparedActivity
        if (working || (sleep == null && activity == null)) return
        lifecycleScope.launch {
            setWorking(true)
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if ((sleep != null && !granted.containsAll(permissions)) || (activity != null && !granted.containsAll(activityGranted))) {
                    clear("Health access was revoked. Read again after granting access."); return@launch
                }
                val stamp = Instant.now().toString().replace(':', '-')
                val uris = withContext(Dispatchers.IO) {
                    clearShared(); shareDir().mkdirs()
                    listOfNotNull(sleep?.let { "beyond-sleep-$stamp.json" to it }, activity?.let { "beyond-activity-$stamp.json" to it }).map { (name, text) ->
                        val file = File(shareDir(), name)
                        file.writeText(text, Charsets.UTF_8)
                        FileProvider.getUriForFile(this@MainActivity, "app.beyond.healthbridge.share", file)
                    }
                }
                val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                    type = "application/json"
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
                    clipData = ClipData.newRawUri(null, uris.first()).apply { uris.drop(1).forEach { addItem(ClipData.Item(it)) } }
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "Send to BEYOND"))
                status.text = "Choose BEYOND in the share sheet. BEYOND shows a preview; nothing is imported until you confirm there."
            } catch (_: Exception) { status.text = "Could not open the share sheet. Save the files instead, then import them in BEYOND." }
            finally { setWorking(false) }
        }
    }
    private fun readSleep() {
        if (working) return
        clear("Reading Garmin sleep…"); setWorking(true)
        lifecycleScope.launch {
            try {
                require(client.permissionController.getGrantedPermissions().containsAll(permissions))
                val end = Instant.now()
                val start = end.minus(windowDays, ChronoUnit.DAYS)
                val records = mutableListOf<ExportSleep>()
                var token: String? = null
                val seenTokens = mutableSetOf<String>()
                do {
                    val response = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(start, end), dataOriginFilter = setOf(DataOrigin(GARMIN_PACKAGE)), pageSize = 500, pageToken = token))
                    response.records.filter { it.startTime >= start && it.endTime <= end }.forEach { r ->
                        records.add(ExportSleep(r.metadata.id, r.metadata.dataOrigin.packageName, r.metadata.lastModifiedTime,
                            r.startTime, r.endTime, r.startZoneOffset?.totalSeconds, r.endZoneOffset?.totalSeconds,
                            r.stages.sortedBy { it.startTime }.map { s -> ExportStage(s.startTime, s.endTime, when (s.stage) {
                                SleepSessionRecord.STAGE_TYPE_AWAKE -> "AWAKE"
                                SleepSessionRecord.STAGE_TYPE_SLEEPING -> "SLEEPING"
                                SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> "OUT_OF_BED"
                                SleepSessionRecord.STAGE_TYPE_LIGHT -> "LIGHT"
                                SleepSessionRecord.STAGE_TYPE_DEEP -> "DEEP"
                                SleepSessionRecord.STAGE_TYPE_REM -> "REM"
                                SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "AWAKE_IN_BED"
                                else -> "UNKNOWN"
                            }) }))
                    }
                    require(records.size <= 2000 && records.sumOf { it.stages.size } <= 60000)
                    token = response.pageToken
                    if (token != null) require(seenTokens.add(token))
                } while (token != null)
                prepared = sleepExport(records, start, end, Instant.now(), BuildConfig.VERSION_NAME)
                val sleepLine = "${if (windowDays > 7) "Full history (up to $windowDays days): " else ""}${records.size} Garmin sleep sessions ready. ${if (records.isEmpty()) "No matching sessions: check Garmin sync and Health Connect sleep entries." else "Save the file, then preview it in BEYOND."}"
                val activityLine = try { readActivity() } catch (_: Exception) {
                    preparedActivity = null
                    "Steps and heart rate could not be read; sleep is unaffected."
                }
                status.text = "$sleepLine $activityLine No data has been imported."
            } catch (_: Exception) { clear("Sleep could not be read safely. Check Health Connect sleep access and Garmin sync, then try again. No partial export was kept.") }
            finally { setWorking(false) }
        }
    }
    /** Hourly Garmin steps and heart rate, plus resting heart rate, for whichever of them were granted. */
    private suspend fun readActivity(): String {
        val granted = client.permissionController.getGrantedPermissions()
        if (granted.intersect(activityPermissions).isEmpty()) return "Steps and heart rate were not allowed; only sleep was read."
        val end = Instant.now().truncatedTo(ChronoUnit.HOURS)
        val start = end.minus(windowDays, ChronoUnit.DAYS)
        val garmin = setOf(DataOrigin(GARMIN_PACKAGE))
        val metrics = buildSet {
            if (stepsPermission in granted) add(StepsRecord.COUNT_TOTAL)
            if (heartRatePermission in granted) { add(HeartRateRecord.BPM_MIN); add(HeartRateRecord.BPM_AVG); add(HeartRateRecord.BPM_MAX) }
        }
        // An implausible value is dropped on its own instead of failing the whole file.
        fun bpm(value: Long?) = value?.takeIf { it in 20..300 }
        // Health Connect aggregates in 30-day slices so a full-history read stays within its query limits.
        val hours = mutableListOf<ExportHour>()
        var sliceStart = start
        while (metrics.isNotEmpty() && sliceStart < end) {
            val sliceEnd = minOf(sliceStart.plus(30, ChronoUnit.DAYS), end)
            client.aggregateGroupByDuration(AggregateGroupByDurationRequest(metrics,
                TimeRangeFilter.between(sliceStart, sliceEnd), Duration.ofHours(1), garmin)).forEach { bucket ->
                val r = bucket.result
                val hour = ExportHour(bucket.startTime, bucket.zoneOffset.totalSeconds, r[StepsRecord.COUNT_TOTAL]?.takeIf { it in 0..100_000 },
                    bpm(r[HeartRateRecord.BPM_MIN]), bpm(r[HeartRateRecord.BPM_AVG]), bpm(r[HeartRateRecord.BPM_MAX]))
                if (hour.steps != null || hour.heartRateAvg != null) hours.add(hour)
            }
            sliceStart = sliceEnd
        }
        val resting = mutableListOf<ExportRestingHeartRate>()
        if (restingPermission in granted) {
            var token: String? = null
            val seenTokens = mutableSetOf<String>()
            do {
                val response = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end), dataOriginFilter = garmin, pageSize = 500, pageToken = token))
                response.records.filter { it.time >= start && it.time < end && it.beatsPerMinute in 20..300 }.forEach { r ->
                    resting.add(ExportRestingHeartRate(r.metadata.id, r.metadata.dataOrigin.packageName, r.metadata.lastModifiedTime,
                        r.time, r.zoneOffset?.totalSeconds, r.beatsPerMinute))
                }
                require(resting.size <= 1000)
                token = response.pageToken
                if (token != null) require(seenTokens.add(token))
            } while (token != null)
        }
        preparedActivity = activityExport(hours, resting, start, end, Instant.now(), BuildConfig.VERSION_NAME)
        activityGranted = granted.intersect(activityPermissions)
        return "${hours.size} hours of steps/heart rate and ${resting.size} resting heart rate readings ready."
    }
}
