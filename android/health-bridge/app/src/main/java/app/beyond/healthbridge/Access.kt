package app.beyond.healthbridge

/** Garmin Connect's package, to open it for a watch sync (a <queries> entry, not a permission). */
const val GARMIN_CONNECT_PACKAGE = "com.garmin.android.apps.connectmobile"

/** BRIDGE-CHECK-001: one kind of Garmin data and whether Health Connect lets the helper read it. */
data class AccessItem(val label: String, val granted: Boolean)

/**
 * BRIDGE-CHECK-001 (owner, 2026-10-31: sleep, resting heart rate and steps never showed after a sync):
 * says plainly which kinds the helper may read, so a missing one is a setting to fix, not a mystery.
 */
fun accessLine(items: List<AccessItem>): String {
    val missing = items.filterNot { it.granted }.map { it.label }
    val list = items.joinToString(" · ") { "${it.label} ${if (it.granted) "✓" else "✗"}" }
    return if (missing.isEmpty()) "Allowed: $list"
    else "Allowed: $list\nNot allowed: ${missing.joinToString(", ")}. Tap HEALTH CONNECT ACCESS to allow it."
}
