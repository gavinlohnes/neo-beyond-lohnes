package app.beyond.healthbridge

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * BRIDGE-MOMENTS-001: keeps BEYOND's plan on the phone, sets one alarm per upcoming moment, posts the
 * notification when it comes, and re-arms after a restart. The widget (BriefWidget) shows the brief and
 * the next moment; a tap on either opens BEYOND.
 */
object MomentAlerts {
    private const val PREFS = "moments"
    private const val KEY = "plan"
    private const val CHANNEL = "moments"
    private const val MAX = 24

    fun save(context: Context, json: String) {
        if (parsePlan(json) == null) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
        arm(context)
        BriefWidget.refresh(context)
    }

    fun plan(context: Context): BridgePlan? = parsePlan(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null))

    fun arm(context: Context) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        for (i in 0 until MAX) alarms.cancel(alarm(context, i, null))
        val plan = plan(context) ?: return
        upcoming(plan, System.currentTimeMillis()).take(MAX).forEachIndexed { i, m ->
            // Inexact on purpose: no exact-alarm permission; Android may shift it a few minutes.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, m.at, alarm(context, i, m))
        }
    }

    private fun alarm(context: Context, index: Int, moment: Moment?): PendingIntent {
        val intent = Intent(context, MomentReceiver::class.java).setAction("app.beyond.healthbridge.MOMENT.$index")
        if (moment != null) intent.putExtra("at", moment.at)
        return PendingIntent.getBroadcast(context, index, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun openBeyond(context: Context, url: String, code: Int): PendingIntent =
        PendingIntent.getActivity(context, code, Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    fun notify(context: Context, at: Long) {
        val plan = plan(context) ?: return
        val moment = plan.moments.firstOrNull { it.at == at } ?: return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Key moments", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Before and after each shift, from BEYOND's schedule"
        })
        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle(moment.title)
            .setContentText(moment.text)
            .setContentIntent(openBeyond(context, momentUrl(plan, moment), (at / 1000).toInt()))
            .setAutoCancel(true)
            .build()
        try { manager.notify((at / 1000).toInt(), notification) } catch (e: SecurityException) { /* notifications are off */ }
        BriefWidget.refresh(context)
    }
}

class MomentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) { MomentAlerts.arm(context); return }
        val at = intent.getLongExtra("at", -1)
        if (at > 0) MomentAlerts.notify(context, at)
    }
}

class BriefWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = draw(context, manager, ids)

    companion object {
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            draw(context, manager, manager.getAppWidgetIds(ComponentName(context, BriefWidget::class.java)))
        }

        private fun draw(context: Context, manager: AppWidgetManager, ids: IntArray) {
            if (ids.isEmpty()) return
            val plan = MomentAlerts.plan(context)
            val next = plan?.let { upcoming(it, System.currentTimeMillis()).firstOrNull() }
            val time = SimpleDateFormat("EEE HH:mm", Locale.US)
            val views = RemoteViews(context.packageName, R.layout.widget_brief).apply {
                setTextViewText(R.id.widget_brief, plan?.brief?.ifBlank { null } ?: "Open BEYOND and tap SYNC GARMIN to bring Alfred's brief here.")
                setTextViewText(R.id.widget_next, next?.let { "NEXT · ${time.format(Date(it.at))} · ${it.title}" } ?: "")
                if (plan != null) setOnClickPendingIntent(R.id.widget_root, MomentAlerts.openBeyond(context, momentUrl(plan, null), 0))
            }
            manager.updateAppWidget(ids, views)
        }
    }
}
