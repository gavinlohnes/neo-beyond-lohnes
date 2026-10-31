package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Test

class AccessTest {
    @Test fun saysAllAllowed() {
        assertEquals("Allowed: Sleep ✓ · Steps ✓", accessLine(listOf(AccessItem("Sleep", true), AccessItem("Steps", true))))
    }

    @Test fun namesWhatIsMissingAndHowToFixIt() {
        assertEquals(
            "Allowed: Sleep ✓ · Resting heart rate ✗\nNot allowed: Resting heart rate. Tap HEALTH CONNECT ACCESS to allow it.",
            accessLine(listOf(AccessItem("Sleep", true), AccessItem("Resting heart rate", false))),
        )
    }
}
