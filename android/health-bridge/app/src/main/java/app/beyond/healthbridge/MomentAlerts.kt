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
    private const val SHOWN = "shown"

    @Synchronized
    fun save(context: Context, json: String) {
        val next = parsePlan(json) ?: return
        val now = System.currentTimeMillis()
        // BRIDGE-NOTIFY-001 review fix: keep an old moment that is due but still waiting on Android (see carryOver).
        val plan = carryOver(plan(context), next, now, shown(context, now))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, planJson(plan)).apply()
        arm(context, now)
        BriefWidget.refresh(context)
    }

    fun plan(context: Context): BridgePlan? = parsePlan(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null))

    /** BRIDGE-NOTIFY-001 review fix: the keys of moments already shown, so a re-arm never cancels one still to show. */
    private fun shown(context: Context, now: Long = System.currentTimeMillis()): Set<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.contains(SHOWN)) return prefs.getStringSet(SHOWN, null)?.toSet() ?: emptySet()
        // FOLLOWUPS-001 (N1): first run after upgrading from 0.11.0, which kept no shown set; see seedShown.
        val seeded = seedShown(plan(context), now)
        saveShown(context, seeded)
        return seeded
    }

    private fun saveShown(context: Context, shown: Set<String>) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putStringSet(SHOWN, HashSet(shown)).apply()
    }

    @Synchronized
    fun arm(context: Context, now: Long = System.currentTimeMillis()) {
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        val shown = pruneShown(shown(context, now), now)
        saveShown(context, shown)
        rearm(object : AlarmSlots {
            override fun cancel(slot: Int) {
                alarms.cancel(alarm(context, slot, null))
            }

            override fun set(slot: Int, moment: Moment) {
                // Inexact on purpose: no exact-alarm permission; Android may deliver it up to an hour late (GRACE_MS).
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, moment.at, alarm(context, slot, moment))
            }
        }, plan(context), now, shown, MAX)
    }

    private fun alarm(context: Context, index: Int, moment: Moment?): PendingIntent {
        val intent = Intent(context, MomentReceiver::class.java).setAction("app.beyond.healthbridge.MOMENT.$index")
        if (moment != null) intent.putExtra("at", moment.at).putExtra("key", moment.key)
        return PendingIntent.getBroadcast(context, index, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun openBeyond(context: Context, url: String, code: Int): PendingIntent =
        PendingIntent.getActivity(context, code, Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    /**
     * Shows the moment named by [key] (an alarm set by 0.11.0 carries only [at]) once, if it came due within GRACE_MS
     * ([shouldShow]), then rolls the window on.
     */
    @Synchronized
    fun notify(context: Context, key: String?, at: Long) {
        val plan = plan(context) ?: return
        val moment = plan.moments.firstOrNull { if (key != null) it.key == key else it.at == at } ?: return
        val now = System.currentTimeMillis()
        val shown = shown(context, now)
        if (moment.key in shown) return
        // FOLLOWUPS-001 (N2): an alarm delivered more than GRACE_MS late is dropped, as a re-arm would drop it.
        if (!shouldShow(moment, now, shown)) { arm(context, now); return }
        saveShown(context, pruneShown(shown + moment.key, now))
        val manager = context.getSystemService(NotificationManager::class.java)
        if (manager != null) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "Key moments", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Before and after each shift, from BEYOND's schedule"
            })
            // One notification per moment: two moments at the same time (different kinds) are two notifications.
            val id = moment.key.hashCode()
            val notification = Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_launcher_monochrome)
                .setContentTitle(moment.title)
                .setContentText(moment.text)
                .setContentIntent(openBeyond(context, momentUrl(plan, moment), id))
                .setAutoCancel(true)
                .build()
            try { manager.notify(id, notification) } catch (e: SecurityException) { /* notifications are off */ }
        }
        // BRIDGE-NOTIFY-001: roll the alarm window forward; the moment just shown is now in the shown set.
        arm(context, now)
        BriefWidget.refresh(context)
    }
}

class MomentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) { MomentAlerts.arm(context); return }
        val at = intent.getLongExtra("at", -1)
        if (at > 0) MomentAlerts.notify(context, intent.getStringExtra("key"), at)
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
