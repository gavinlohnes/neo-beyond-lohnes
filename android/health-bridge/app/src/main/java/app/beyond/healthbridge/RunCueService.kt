package app.beyond.healthbridge

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener

/**
 * GRAYSON-TRAIN-RUN-CUES-001: speaks and buzzes the cues BEYOND sent, with the phone locked.
 *
 * A foreground service of type `health` (Android names exercise trackers for it), so it keeps running with the screen
 * off. It holds the payload in memory only: nothing is written to disk, nothing is read from any sensor, and it never
 * restarts by itself (START_NOT_STICKY, no boot receiver). BEYOND stays the one record of the run; this only speaks.
 *
 * Timing: a Handler on the main looper waits for the next cue, and every time it wakes it re-checks the wall clock
 * through [nextRunCue], so a late wake-up says a cue late inside its interval or skips it, never out of order.
 */
class RunCueService : Service(), TextToSpeech.OnInitListener {
    companion object {
        const val ACTION_OP = "app.beyond.healthbridge.RUN_CUES"
        const val EXTRA_OP = "op"
        const val EXTRA_PAYLOAD = "p"
        private const val ACTION_MUTE = "app.beyond.healthbridge.RUN_CUES_MUTE"
        private const val ACTION_STOP = "app.beyond.healthbridge.RUN_CUES_STOP"
        private const val CHANNEL = "run_cues"
        private const val ID = 4201
        private const val ID_PERMISSION = 4202

        private fun channel(context: Context) {
            context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(
                NotificationChannel(CHANNEL, "Run cues", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "While a BEYOND run is going: this interval and the next change"
                })
        }

        /** The run carries on in BEYOND with its on-screen cues; this says why the Bridge didn't start. */
        fun notifyNeedsPermission(context: Context) {
            channel(context)
            val n = Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_launcher_monochrome)
                .setContentTitle("Run cues are off")
                .setContentText("Voice cues need the physical activity permission. Allow it in Health Bridge's settings.")
                .setStyle(Notification.BigTextStyle().bigText("Voice cues need the physical activity permission. Allow it in Health Bridge's settings."))
                .setAutoCancel(true)
                .build()
            try { context.getSystemService(NotificationManager::class.java)?.notify(ID_PERMISSION, n) } catch (e: SecurityException) { /* notifications are off */ }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var payload: RunCuePayload? = null
    private var done = -1
    private var muted = false
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private val waiting = ArrayList<String>()
    private var focus: AudioFocusRequest? = null
    private val speech = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()
    private val tick = Runnable { fire() }
    private val stopper = Runnable { stopCues() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        tts = TextToSpeech(this, this)
    }

    override fun onInit(status: Int) {
        val engine = tts ?: return
        if (status != TextToSpeech.SUCCESS) return
        engine.setAudioAttributes(speech)
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) { handler.post { releaseFocusWhenQuiet() } }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) { handler.post { releaseFocusWhenQuiet() } }
        })
        ttsReady = true
        val lines = waiting.toList()
        waiting.clear()
        lines.forEach { speak(it) }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_MUTE -> { muted = true; tts?.stop(); refresh() }
            ACTION_STOP -> stopCues()
            ACTION_OP -> {
                val op = intent.getStringExtra(EXTRA_OP)
                if (op == "end") { stopCues(); return START_NOT_STICKY }
                // Started with startForegroundService: go foreground before anything else.
                if (!goForeground()) { notifyNeedsPermission(this); stopCues(); return START_NOT_STICKY }
                val next = parseRunCues(intent.getStringExtra(EXTRA_PAYLOAD))
                if (next == null) { if (payload == null) stopCues(); return START_NOT_STICKY }
                // A new run starts fresh; the same run (pause, resume, a changed switch) keeps what's been said.
                if (payload?.id != next.id) { done = -1; muted = false }
                payload = next
                schedule()
            }
            else -> if (payload == null) stopCues()
        }
        return START_NOT_STICKY
    }

    private fun goForeground(): Boolean = try {
        channel(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(ID, notification())
        }
        true
    } catch (e: SecurityException) { false } catch (e: IllegalStateException) { false }

    private fun schedule() {
        handler.removeCallbacks(tick)
        handler.removeCallbacks(stopper)
        val p = payload ?: return
        val now = System.currentTimeMillis()
        val stopAt = runCuesStopAt(p)
        if (now >= stopAt) { stopCues(); return }
        handler.postDelayed(stopper, stopAt - now)
        nextRunCue(p, now, done)?.let { handler.postDelayed(tick, it.delayMs) }
        refresh()
    }

    private fun fire() {
        val p = payload ?: return
        val next = nextRunCue(p, System.currentTimeMillis(), done)
        if (next == null) { schedule(); return }
        if (next.delayMs > 0) { handler.postDelayed(tick, next.delayMs); return }
        done = next.index
        if (!muted) {
            if (next.cue.speak) speak(next.cue.text)
            // Screen on: BEYOND's own buzz already does it, so he never feels two.
            if (next.cue.buzz && !screenInUse()) buzz(next.cue.kind)
        }
        schedule()
    }

    private fun speak(text: String) {
        val engine = tts
        if (engine == null || !ttsReady) { waiting.add(text); return }
        val audio = getSystemService(AudioManager::class.java)
        if (audio != null && focus == null) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(speech).build()
            if (audio.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) focus = request
        }
        engine.speak(text, TextToSpeech.QUEUE_ADD, Bundle(), "cue-${System.nanoTime()}")
    }

    /** Music comes back once nothing is left to say. */
    private fun releaseFocusWhenQuiet() {
        if (tts?.isSpeaking == true) return
        val request = focus ?: return
        getSystemService(AudioManager::class.java)?.abandonAudioFocusRequest(request)
        focus = null
    }

    private fun screenInUse(): Boolean {
        val interactive = getSystemService(PowerManager::class.java)?.isInteractive ?: true
        val locked = getSystemService(KeyguardManager::class.java)?.isKeyguardLocked ?: false
        return interactive && !locked
    }

    private fun buzz(kind: String) {
        val pattern = runCueBuzzPattern(kind) ?: return
        val effect = VibrationEffect.createWaveform(pattern, -1)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getSystemService(VibratorManager::class.java)?.defaultVibrator?.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(effect)
        }
    }

    private fun action(name: String, code: Int): PendingIntent =
        PendingIntent.getService(this, code, Intent(this, RunCueService::class.java).setAction(name),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun notification(): Notification {
        val p = payload
        val now = System.currentTimeMillis()
        val interval = p?.let { runInterval(it, now) }
        val line = when {
            p == null -> "Starting run cues"
            p.pausedAt != null -> "Paused"
            interval == null -> "Run cues"
            else -> runIntervalLine(interval)
        } + if (muted) " · muted" else ""
        val icon = Icon.createWithResource(this, R.drawable.ic_launcher_monochrome)
        val builder = Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle(p?.title ?: "Running")
            .setContentText(line)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
        // Android's countdown chronometer, so the line needn't be posted every second.
        val change = interval?.nextChangeAt
        if (p != null && p.pausedAt == null && change != null && change > now) {
            builder.setUsesChronometer(true).setChronometerCountDown(true).setWhen(change).setShowWhen(true)
        } else builder.setShowWhen(false)
        MomentAlerts.plan(this)?.let { builder.setContentIntent(MomentAlerts.openBeyond(this, it.home, ID)) }
        if (!muted) builder.addAction(Notification.Action.Builder(icon, "MUTE", action(ACTION_MUTE, 1)).build())
        builder.addAction(Notification.Action.Builder(icon, "END CUES", action(ACTION_STOP, 2)).build())
        return builder.build()
    }

    private fun refresh() {
        if (payload == null) return
        try { getSystemService(NotificationManager::class.java)?.notify(ID, notification()) } catch (e: SecurityException) { /* notifications are off */ }
    }

    private fun stopCues() {
        handler.removeCallbacksAndMessages(null)
        payload = null
        done = -1
        waiting.clear()
        tts?.stop()
        releaseFocusWhenQuiet()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        tts?.shutdown()
        tts = null
        focus?.let { getSystemService(AudioManager::class.java)?.abandonAudioFocusRequest(it) }
        focus = null
        super.onDestroy()
    }
}
