package app.beyond.healthbridge

import android.app.Activity
import android.os.Bundle

/**
 * GRAYSON-PLAN-FRESH-001 (C7.2): the no-screen landing for BEYOND's update link (`beyond-bridge://plan?plan=…`), opened
 * on a SAVE or UPDATE ALERTS tap. It saves the plan with the same [MomentAlerts.save] SYNC GARMIN uses (which re-arms
 * the moments) and finishes at once with no layout, so he lands straight back in BEYOND. It reads nothing, sends
 * nothing back and asks for nothing; the notification permission request stays in MainActivity's SYNC flow. A missing
 * or bad plan saves nothing, and it still finishes.
 */
class PlanActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            planFromLink(intent?.data?.getQueryParameter("plan"))?.let { MomentAlerts.save(this, it) }
        } finally {
            finish()
        }
    }
}
