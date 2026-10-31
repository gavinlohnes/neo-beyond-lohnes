package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ShareTargetTest {
    private val beyond = ShareCandidate("BEYOND", "org.chromium.webapk.a1b2c3", "org.chromium.webapk.shell_apk.h2o.H2OMainActivity")
    private val drive = ShareCandidate("Drive", "com.google.android.apps.docs", "com.google.android.apps.docs.Upload")
    private val self = ShareCandidate("BEYOND Health Bridge", "app.beyond.healthbridge", "app.beyond.healthbridge.MainActivity")

    @Test fun sendsStraightToTheOneInstalledBeyond() {
        assertEquals(beyond, pickBeyondTarget(listOf(drive, beyond, self), "app.beyond.healthbridge"))
    }

    @Test fun fallsBackToTheShareSheetWhenItIsMissingOrAmbiguous() {
        assertNull(pickBeyondTarget(listOf(drive, self), "app.beyond.healthbridge"))
        val other = beyond.copy(packageName = "org.chromium.webapk.zzz")
        assertNull(pickBeyondTarget(listOf(beyond, other), "app.beyond.healthbridge"))
    }

    @Test fun neverPicksItselfOrALookalikeLabel() {
        assertNull(pickBeyondTarget(listOf(self, ShareCandidate("BEYOND Notes", "x.notes", "x.notes.Main")), "app.beyond.healthbridge"))
    }
}
