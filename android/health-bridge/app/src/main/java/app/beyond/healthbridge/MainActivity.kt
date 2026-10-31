package app.beyond.healthbridge

import android.content.ClipData
import android.content.ComponentName
import android.graphics.Typeface
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
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
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
import java.time.ZoneId
import java.time.temporal.ChronoUnit

class MainActivity : ComponentActivity() {
    private val permissions = setOf(HealthPermission.getReadPermission(SleepSessionRecord::class))
    // GARMIN-002: optional. Sleep still works when these are declined.
    private val stepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val heartRatePermission = HealthPermission.getReadPermission(HeartRateRecord::class)
    private val restingPermission = HealthPermission.getReadPermission(RestingHeartRateRecord::class)
    // GARMIN-005: optional calories burned (Garmin's total and active), read by the hour like steps.
    private val totalCaloriesPermission = HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    private val activeCaloriesPermission = HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)
    private val activityPermissions = setOf(stepsPermission, heartRatePermission, restingPermission, totalCaloriesPermission, activeCaloriesPermission)
    // GARMIN-003: optional "Access past data" for READ FULL HISTORY. Without it Health Connect returns about 30 days.
    private val historyPermission = HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY
    /** 7 for the daily read; MAX_EXPORT_DAYS for READ FULL HISTORY. */
    private var windowDays = 7L
    private val client by lazy { HealthConnectClient.getOrCreate(this) }
    private lateinit var status: TextView
    private lateinit var access: TextView // BRIDGE-CHECK-001
    private lateinit var read: Button
    private lateinit var history: Button
    private lateinit var save: Button
    private lateinit var saveActivity: Button
    private lateinit var send: Button
    private var prepared: String? = null // memory only; discarded when this Activity is destroyed
    private var preparedActivity: String? = null
    private var activityGranted: Set<String> = emptySet() // what the prepared activity file was read with
    private var working = false
    private var newestStepsHour: Instant? = null // SYNC-001: for the freshness line
    private var newestResting: Instant? = null // BRIDGE-CHECK-001: resting heart rate's freshness
    private var handBack = false // BRIDGE-CHECK-001: a sync started from BEYOND closes the helper once sent
    private var pendingSend = false // SYNC-001: a SYNC request that arrived while a read was running
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
        // BRIDGE-LOOK-001 (owner, 2026-10-31: "I don't like the android app" → how it looks): BEYOND's own
        // look — black, one red action, short words, the rarely used buttons under MORE. Same reads and sends.
        val dp = resources.displayMetrics.density
        val padding = (16 * dp).toInt()
        window.statusBarColor = Look.BG; window.navigationBarColor = Look.BG
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(padding, padding, padding, padding); setBackgroundColor(Look.BG) }
        fun text(value: String, size: Float, color: Int, parent: LinearLayout = layout) = TextView(this).apply {
            text = value; textSize = size; setTextColor(color); setPadding(0, (6 * dp).toInt(), 0, (6 * dp).toInt()); parent.addView(this)
        }
        text("BEYOND // HEALTH BRIDGE", 13f, Look.TEXT_3).apply { letterSpacing = 0.18f; typeface = Typeface.MONOSPACE }
        text("Garmin → BEYOND", 28f, Look.TEXT_1).apply { typeface = Typeface.DEFAULT_BOLD; ViewCompat.setAccessibilityHeading(this, true) }
        text("Reads Garmin's sleep, steps and heart rate from Health Connect and hands them to BEYOND. Read only; nothing leaves your phone.", 16f, Look.TEXT_2)
        status = text("Ready. Sync your watch in Garmin Connect first.", 16f, Look.TEXT_1).apply {
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
            background = Look.panel(dp); setPadding(padding, padding, padding, padding)
            layoutParams = Look.spaced(dp, top = 12)
        }
        // BRIDGE-CHECK-001: what Health Connect lets the helper read, and the two places to fix things.
        access = text("", 14f, Look.TEXT_2).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE; visibility = View.GONE }
        send = Look.button(this, "SEND TO BEYOND", primary = true, dp).apply { isEnabled = false; setOnClickListener { sendToBeyond() } }
        layout.addView(send, Look.spaced(dp, top = 16))
        layout.addView(Look.button(this, "OPEN GARMIN CONNECT", primary = false, dp).apply { setOnClickListener { openGarminConnect() } }, Look.spaced(dp, top = 8))
        layout.addView(Look.button(this, "HEALTH CONNECT ACCESS", primary = false, dp).apply { setOnClickListener { openHealthConnect() } }, Look.spaced(dp, top = 8))
        read = Look.button(this, "ALLOW ACCESS AND READ", primary = false, dp).apply {
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
        layout.addView(read, Look.spaced(dp, top = 8))
        history = Look.button(this, "READ FULL HISTORY", primary = false, dp).apply {
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
        layout.addView(history, Look.spaced(dp, top = 8))
        // MORE: saving files and the full privacy note, folded away.
        val more = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        val moreToggle = Look.button(this, "MORE", primary = false, dp).apply {
            setOnClickListener { val open = more.visibility != View.VISIBLE; more.visibility = if (open) View.VISIBLE else View.GONE; text = if (open) "LESS" else "MORE" }
        }
        layout.addView(moreToggle, Look.spaced(dp, top = 24))
        layout.addView(more)
        save = Look.button(this, "SAVE SLEEP FILE", primary = false, dp).apply { isEnabled = false; setOnClickListener { saveFile.launch("beyond-sleep-${Instant.now().toString().replace(':', '-')}.json") } }
        more.addView(save, Look.spaced(dp, top = 8))
        saveActivity = Look.button(this, "SAVE STEPS AND HEART RATE FILE", primary = false, dp).apply { isEnabled = false; setOnClickListener { saveActivityFile.launch("beyond-activity-${Instant.now().toString().replace(':', '-')}.json") } }
        more.addView(saveActivity, Look.spaced(dp, top = 8))
        text("Privacy and permission use: read only. Sleep: Garmin record IDs, source, source modification time, session times, UTC offsets and sleep stages. Steps, heart rate and calories (optional): hourly step totals, hourly heart-rate low/average/high, hourly total and active calories burned and UTC offsets, plus Garmin resting heart rate with its record IDs, source, source modification time and UTC offsets. READ FULL HISTORY reads up to a year and asks for the optional “Access past data” permission; without it, Health Connect only returns data from up to 30 days before you first granted access. SEND TO BEYOND hands the data straight to BEYOND; nothing is written where other apps can read it. Saved files may be private health information; choose a local folder and delete the file after importing. No account, server, Internet permission or other health categories. Your Health Connect data is never changed.", 14f, Look.TEXT_3, more)
        clearShared()
        // SYNC-001: read straight away when access is already allowed; opened from BEYOND, also send.
        // Only a fresh launch sends: a recreated activity (rotation, process restore) must not reopen the share sheet.
        autoRead(sendAfter = savedInstanceState == null && intent?.data?.scheme == SYNC_SCHEME)
        val scroll = ScrollView(this).apply { setBackgroundColor(Look.BG); isFillViewport = true; addView(layout) }
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
        refreshAccess()
        if (prepared != null && HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) lifecycleScope.launch {
            try { if (!client.permissionController.getGrantedPermissions().containsAll(permissions)) clear("Sleep access was revoked. No export is ready.") }
            catch (_: Exception) { clear("Sleep access could not be checked. Read again.") }
        }
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.data?.scheme == SYNC_SCHEME) autoRead(sendAfter = true)
    }
    /** SYNC-001: the daily 7-day read without a tap, only when every needed permission is already granted. */
    private fun autoRead(sendAfter: Boolean) {
        handBack = sendAfter
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) return
        lifecycleScope.launch {
            try {
                if (client.permissionController.getGrantedPermissions().containsAll(permissions)) {
                    // A read already running (e.g. READ FULL HISTORY) keeps its window; the send waits for it.
                    if (!working) windowDays = 7
                    readSleep(sendAfter)
                }
                else status.text = "Tap ALLOW ACCESS AND READ once to allow access. After that the helper reads when it opens."
            } catch (_: Exception) { /* leave the manual buttons; nothing was read */ }
        }
    }
    /** BRIDGE-CHECK-001: re-read on every return, so allowing access in Health Connect shows at once. */
    private fun refreshAccess() {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) return
        lifecycleScope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                access.text = accessLine(listOf(
                    AccessItem("Sleep", granted.containsAll(permissions)),
                    AccessItem("Steps", stepsPermission in granted),
                    AccessItem("Heart rate", heartRatePermission in granted),
                    AccessItem("Resting heart rate", restingPermission in granted),
                    AccessItem("Calories", totalCaloriesPermission in granted),
                ))
                access.visibility = View.VISIBLE
            } catch (_: Exception) { access.visibility = View.GONE }
        }
    }
    private fun openGarminConnect() {
        val launch = packageManager.getLaunchIntentForPackage(GARMIN_CONNECT_PACKAGE)
        if (launch != null) startActivity(launch) else status.text = "Garmin Connect isn't installed on this phone."
    }
    private fun openHealthConnect() {
        try { startActivity(Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")) }
        catch (_: Exception) { status.text = "Open Android Settings → Health Connect → App permissions → BEYOND Health Bridge." }
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
     * GARMIN-002 SEND TO BEYOND: hands the prepared files to BEYOND. SYNC-002 (owner go 2026-10-31): when
     * exactly one installed BEYOND can take them, they go straight to it, and BEYOND imports them right
     * after its own SYNC GARMIN tap; otherwise Android's share sheet opens as before.
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
                val target = pickBeyondTarget(packageManager.queryIntentActivities(intent, 0).map {
                    ShareCandidate(it.loadLabel(packageManager).toString(), it.activityInfo.packageName, it.activityInfo.name)
                }, packageName)
                if (target != null) {
                    startActivity(Intent(intent).setComponent(ComponentName(target.packageName, target.activityName)))
                    status.text = "Sent to BEYOND at ${java.time.LocalTime.now().withNano(0).withSecond(0)}."
                    // BRIDGE-CHECK-001: started from BEYOND's SYNC GARMIN, the helper steps out of the way.
                    if (handBack) { handBack = false; finish() }
                } else {
                    startActivity(Intent.createChooser(intent, "Send to BEYOND"))
                    status.text = "Choose BEYOND in the share sheet."
                }
            } catch (_: Exception) { status.text = "Could not open the share sheet. Save the files instead, then import them in BEYOND." }
            finally { setWorking(false) }
        }
    }
    private fun readSleep(sendAfter: Boolean = false) {
        if (working) { if (sendAfter) pendingSend = true; return }
        pendingSend = sendAfter
        clear("Reading Garmin sleep…"); setWorking(true)
        lifecycleScope.launch {
            var ready = false
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
                val sleepLine = "${if (windowDays > 7) "Full history (up to $windowDays days): " else ""}${records.size} Garmin sleep sessions ready."
                val activityLine = try { readActivity() } catch (_: Exception) {
                    preparedActivity = null
                    "Steps and heart rate could not be read; sleep is unaffected."
                }
                val freshness = freshnessLine(records.maxOfOrNull { it.end }, newestStepsHour, newestResting, Instant.now(), ZoneId.systemDefault())
                status.text = "$freshness\n\n$sleepLine $activityLine"
                ready = true
            } catch (_: Exception) { clear("Sleep could not be read safely. Check Health Connect sleep access and Garmin sync, then try again. No partial export was kept.") }
            finally { setWorking(false) }
            if (ready && pendingSend) { pendingSend = false; sendToBeyond() }
        }
    }
    /** Hourly Garmin steps and heart rate, plus resting heart rate, for whichever of them were granted. */
    private suspend fun readActivity(): String {
        val granted = client.permissionController.getGrantedPermissions()
        newestStepsHour = null; newestResting = null
        if (granted.intersect(activityPermissions).isEmpty()) return "Steps, heart rate and calories were not allowed; only sleep was read."
        val end = Instant.now().truncatedTo(ChronoUnit.HOURS)
        val start = end.minus(windowDays, ChronoUnit.DAYS)
        val garmin = setOf(DataOrigin(GARMIN_PACKAGE))
        val metrics = buildSet {
            if (stepsPermission in granted) add(StepsRecord.COUNT_TOTAL)
            if (heartRatePermission in granted) { add(HeartRateRecord.BPM_MIN); add(HeartRateRecord.BPM_AVG); add(HeartRateRecord.BPM_MAX) }
            if (totalCaloriesPermission in granted) add(TotalCaloriesBurnedRecord.ENERGY_TOTAL)
            if (activeCaloriesPermission in granted) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
        }
        // An implausible value is dropped on its own instead of failing the whole file.
        fun bpm(value: Long?) = value?.takeIf { it in 20..300 }
        fun kcal(value: androidx.health.connect.client.units.Energy?) = value?.inKilocalories?.let { Math.round(it) }?.takeIf { it in 0..MAX_HOUR_KCAL }
        // Health Connect aggregates in 30-day slices so a full-history read stays within its query limits.
        val hours = mutableListOf<ExportHour>()
        var sliceStart = start
        while (metrics.isNotEmpty() && sliceStart < end) {
            val sliceEnd = minOf(sliceStart.plus(30, ChronoUnit.DAYS), end)
            client.aggregateGroupByDuration(AggregateGroupByDurationRequest(metrics,
                TimeRangeFilter.between(sliceStart, sliceEnd), Duration.ofHours(1), garmin)).forEach { bucket ->
                val r = bucket.result
                val hour = ExportHour(bucket.startTime, bucket.zoneOffset.totalSeconds, r[StepsRecord.COUNT_TOTAL]?.takeIf { it in 0..100_000 },
                    bpm(r[HeartRateRecord.BPM_MIN]), bpm(r[HeartRateRecord.BPM_AVG]), bpm(r[HeartRateRecord.BPM_MAX]),
                    kcal(r[TotalCaloriesBurnedRecord.ENERGY_TOTAL]), kcal(r[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]))
                if (hour.steps != null || hour.heartRateAvg != null || hour.totalCalories != null || hour.activeCalories != null) hours.add(hour)
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
        newestStepsHour = hours.filter { it.steps != null }.maxOfOrNull { it.start }
        newestResting = resting.maxOfOrNull { it.time }
        preparedActivity = activityExport(hours, resting, start, end, Instant.now(), BuildConfig.VERSION_NAME)
        activityGranted = granted.intersect(activityPermissions)
        val calorieHours = hours.count { it.totalCalories != null || it.activeCalories != null }
        return "${hours.size} hours of steps/heart rate, $calorieHours with calories, and ${resting.size} resting heart rate readings ready."
    }
}
