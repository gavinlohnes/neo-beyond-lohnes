package app.beyond.healthbridge

import org.json.JSONObject

/**
 * BRIDGE-MOMENTS-001 (owner go 2026-10-31): BEYOND's SYNC GARMIN link carries a small plan: its own
 * address, Alfred's brief, and this week's key moments (before and after each shift) from the saved
 * schedule. The Bridge turns the moments into notifications and shows the brief in its widget.
 */
data class Moment(val at: Long, val title: String, val text: String, val go: String)
data class BridgePlan(val home: String, val brief: String, val moments: List<Moment>)

fun parsePlan(json: String?): BridgePlan? = try {
    val o = JSONObject(json ?: "")
    val home = o.getString("home")
    // Only BEYOND's own https address (or a local dev server) may be opened from a notification.
    if (!(home.startsWith("https://") || home.startsWith("http://localhost"))) null
    else {
        val list = o.optJSONArray("moments")
        val moments = (0 until (list?.length() ?: 0)).mapNotNull { i ->
            val m = list!!.getJSONObject(i)
            val go = m.optString("go", "")
            if (go.isNotEmpty() && !go.startsWith("?")) null
            else Moment(m.getLong("at"), m.getString("title").take(60), m.optString("text", "").take(160), go)
        }
        BridgePlan(home, o.optString("brief", "").take(400), moments.sortedBy { it.at })
    }
} catch (e: Exception) { null }

fun upcoming(plan: BridgePlan, now: Long): List<Moment> = plan.moments.filter { it.at > now }

/**
 * BRIDGE-NOTIFY-001: the alarms to set now. BEYOND's plan reaches four weeks ahead (already capped at 3 a day, with
 * the owner's kinds off and quiet hours applied in BEYOND); the phone holds at most [max] alarms, so each re-arm
 * (after a moment fires, at each background check, after a restart) rolls the window forward. `after` keeps a
 * moment that has just fired from being set again.
 */
fun toArm(plan: BridgePlan, after: Long, max: Int): List<Moment> = upcoming(plan, after).take(max)

/** The page a moment opens: BEYOND's home, plus its query (e.g. ?alfred=debrief). */
fun momentUrl(plan: BridgePlan, moment: Moment?): String = plan.home + (moment?.go ?: "")
