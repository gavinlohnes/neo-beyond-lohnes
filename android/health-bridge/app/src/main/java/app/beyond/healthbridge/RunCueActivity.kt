package app.beyond.healthbridge

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle

/**
 * GRAYSON-TRAIN-RUN-CUES-001: the no-screen landing for BEYOND's `beyond-bridge://run?op=…&p=…` link. It hands the
 * op and BEYOND's payload to [RunCueService] and finishes at once, so he lands straight back in BEYOND. The first time
 * cues start on Android 14 or later it asks for the physical activity permission, which Android requires for a
 * `health` foreground service; the Bridge reads no activity or sensor data with it.
 */
class RunCueActivity : Activity() {
    private var pending: Intent? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data = intent?.data
        val op = data?.getQueryParameter("op")
        if (op == null || op !in setOf("start", "pause", "resume", "end")) { finish(); return }
        val service = Intent(this, RunCueService::class.java)
            .setAction(RunCueService.ACTION_OP)
            .putExtra(RunCueService.EXTRA_OP, op)
            .putExtra(RunCueService.EXTRA_PAYLOAD, data.getQueryParameter("p"))
        if (op == "end") {
            // Nothing to start: stop the service if it's running (allowed: this activity is in the foreground).
            startService(service)
            finish()
            return
        }
        if (needsPermission()) {
            pending = service
            AlertDialog.Builder(this)
                .setMessage("Android asks for this so the bridge can keep run cues going with the screen locked. It reads nothing.")
                .setPositiveButton("CONTINUE") { _, _ -> requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), REQUEST) }
                .setNegativeButton("NOT NOW") { _, _ -> denied() }
                .setOnCancelListener { denied() }
                .show()
            return
        }
        startForegroundService(service)
        finish()
    }

    /** Only Android 14 and later need it for a `health` foreground service. */
    private fun needsPermission(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE &&
            checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST) return
        val service = pending
        if (service != null && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startForegroundService(service)
            finish()
        } else denied()
    }

    private fun denied() {
        RunCueService.notifyNeedsPermission(this)
        finish()
    }

    private companion object { const val REQUEST = 7 }
}
