package app.beyond.healthbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.metadata.DataOrigin
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit

/**
 * GARMIN-AUTO-001 (owner go 2026-10-31: "auto sync every few hours"): every 3 hours, with Health
 * Connect's "Access data in background" allowed, the Bridge looks for a new Garmin sleep. When one
 * arrives it posts one notification; a tap runs the usual sync (read, send to BEYOND, hand back).
 * Android lets no app open BEYOND or write into it from the background, so that one tap stays.
 * Nothing is sent anywhere without it; there is still no Internet permission.
 */
object BackgroundSync {
    const val PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
    private const val WORK = "garmin-check"
    private const val CHANNEL = "garmin-sync"
    private const val PREFS = "garmin-sync"
    private const val SEEN = "seen-sleep"

    fun available(client: HealthConnectClient) =
        client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

    fun schedule(context: Context) {
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<GarminCheckWorker>(3, TimeUnit.HOURS).build())
    }

    fun cancel(context: Context) { WorkManager.getInstance(context).cancelUniqueWork(WORK) }

    /** True once per new sleep: remembers the newest one it has told the owner about. */
    fun isNew(context: Context, sleepKey: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getString(SEEN, null) == sleepKey) return false
        prefs.edit().putString(SEEN, sleepKey).apply()
        return true
    }

    fun notify(context: Context, title: String, text: String) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Garmin sync", NotificationManager.IMPORTANCE_LOW).apply {
            description = "When new Garmin sleep is ready to send to BEYOND"
        })
        val open = Intent(context, MainActivity::class.java).setData(Uri.parse("$SYNC_SCHEME://sync")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            .setAutoCancel(true)
            .build()
        try { manager.notify(1001, notification) } catch (e: SecurityException) { /* notifications are off */ }
    }
}

class GarminCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        try {
            if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) return Result.success()
            val client = HealthConnectClient.getOrCreate(applicationContext)
            if (!BackgroundSync.available(client)) return Result.success()
            val granted = client.permissionController.getGrantedPermissions()
            val sleepPermission = HealthPermission.getReadPermission(SleepSessionRecord::class)
            if (BackgroundSync.PERMISSION !in granted || sleepPermission !in granted) return Result.success()
            val now = Instant.now()
            val garmin = setOf(DataOrigin(GARMIN_PACKAGE))
            val sleep = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(now.minus(36, ChronoUnit.HOURS), now), dataOriginFilter = garmin, pageSize = 50))
                .records.filter { java.time.Duration.between(it.startTime, it.endTime).toMinutes() >= 60 }.maxByOrNull { it.endTime }
                ?: return Result.success()
            if (!BackgroundSync.isNew(applicationContext, "${sleep.metadata.id}@${sleep.metadata.lastModifiedTime}")) return Result.success()
            val steps = if (HealthPermission.getReadPermission(StepsRecord::class) in granted) {
                val midnight = now.atZone(ZoneId.systemDefault()).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant()
                client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(midnight, now), garmin))[StepsRecord.COUNT_TOTAL]
            } else null
            BackgroundSync.notify(applicationContext, "Garmin: ${syncSummary(sleep.startTime, sleep.endTime, steps)}", "Tap to send to BEYOND.")
        } catch (e: Exception) {
            // A failed check tries again at the next one; nothing was sent.
        }
        return Result.success()
    }
}
