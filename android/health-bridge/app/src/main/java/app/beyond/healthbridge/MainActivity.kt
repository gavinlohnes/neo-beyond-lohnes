package app.beyond.healthbridge

import android.os.Bundle
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
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.temporal.ChronoUnit

class MainActivity : ComponentActivity() {
    private val permissions = setOf(HealthPermission.getReadPermission(SleepSessionRecord::class))
    private val client by lazy { HealthConnectClient.getOrCreate(this) }
    private lateinit var status: TextView
    private lateinit var read: Button
    private lateinit var save: Button
    private var prepared: String? = null // memory only; discarded when this Activity is destroyed
    private var working = false
    private val requestPermission = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        if (granted.containsAll(permissions)) readSleep() else clear("Sleep access was not granted. No export was created.")
    }
    private val saveFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val text = prepared
        if (uri == null) { status.text = "Save cancelled. No data was imported into BEYOND." }
        else if (text == null) { clear("The prepared export was discarded when the helper restarted. Read again and save a new file. The selected file has no sleep data.") }
        else if (text != null) lifecycleScope.launch {
            setWorking(true)
            try {
                if (!client.permissionController.getGrantedPermissions().containsAll(permissions)) {
                    clear("Sleep access was revoked. Read again after granting access.")
                } else {
                    withContext(Dispatchers.IO) {
                        val output = contentResolver.openOutputStream(uri, "wt") ?: error("Cannot open file")
                        output.bufferedWriter(Charsets.UTF_8).use { it.write(text) }
                    }
                    status.text = "Saved. Open BEYOND → COMMAND → IMPORT HEALTH DATA, choose this file, review, then confirm. The file contains private sleep data; delete it when finished."
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
        paragraph("Read Garmin sleep from the last 7 days. Save a file, then review and confirm it in BEYOND. This helper does not sync automatically.")
        paragraph("Privacy and permission use: sleep access only, read only. Garmin record IDs, source, source modification time, session times, UTC offsets and sleep stages go into your chosen file. No account, server, Internet permission or other health categories. Your Health Connect data is never changed. Files may be private health information; choose a local folder and delete the file after importing.")
        status = paragraph("Ready. Complete Garmin's sync before reading. Sessions crossing the 7-day window edges are excluded.").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        read = Button(this).apply {
            text = "ALLOW SLEEP ACCESS AND READ"
            setOnClickListener {
                if (HealthConnectClient.getSdkStatus(this@MainActivity) != HealthConnectClient.SDK_AVAILABLE) {
                    clear("Health Connect is unavailable or needs an update. Open Android Settings → Health Connect, update it, then return.")
                } else lifecycleScope.launch {
                    try {
                        if (client.permissionController.getGrantedPermissions().containsAll(permissions)) readSleep()
                        else requestPermission.launch(permissions)
                    } catch (_: Exception) { clear("Health Connect could not be opened. Check sleep access in Android Settings and try again.") }
                }
            }
        }
        layout.addView(read)
        save = Button(this).apply { text = "SAVE SLEEP FILE"; isEnabled = false; setOnClickListener { saveFile.launch("beyond-sleep-${Instant.now().toString().replace(':', '-')}.json") } }
        layout.addView(save)
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
    private fun setWorking(value: Boolean) { working = value; read.isEnabled = !value; save.isEnabled = !value && prepared != null }
    private fun clear(message: String) { prepared = null; save.isEnabled = false; status.text = message }
    private fun readSleep() {
        if (working) return
        clear("Reading Garmin sleep…"); setWorking(true)
        lifecycleScope.launch {
            try {
                require(client.permissionController.getGrantedPermissions().containsAll(permissions))
                val end = Instant.now()
                val start = end.minus(7, ChronoUnit.DAYS)
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
                    require(records.size <= 500 && records.sumOf { it.stages.size } <= 15000)
                    token = response.pageToken
                    if (token != null) require(seenTokens.add(token))
                } while (token != null)
                prepared = sleepExport(records, start, end, Instant.now(), BuildConfig.VERSION_NAME)
                status.text = "${records.size} Garmin sleep sessions ready. ${if (records.isEmpty()) "No matching sessions: check Garmin sync and Health Connect sleep entries." else "Save the file, then preview it in BEYOND."} No data has been imported."
            } catch (_: Exception) { clear("Sleep could not be read safely. Check Health Connect sleep access and Garmin sync, then try again. No partial export was kept.") }
            finally { setWorking(false) }
        }
    }
}
