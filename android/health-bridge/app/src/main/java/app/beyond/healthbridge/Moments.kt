package app.beyond.healthbridge

import org.json.JSONArray
import org.json.JSONObject

/**
 * BRIDGE-MOMENTS-001 (owner go 2026-10-31): BEYOND's SYNC GARMIN link carries a small plan: its own
 * address, Alfred's brief, and this week's key moments (before and after each shift) from the saved
 * schedule. The Bridge turns the moments into notifications and shows the brief in its widget.
 */
data class Moment(val at: Long, val title: String, val text: String, val go: String, val kind: String = "") {
    /**
     * BRIDGE-NOTIFY-001 review fix: a moment's identity is its time *and* kind, so two moments at the same minute (a
     * 16:00 "Shift in 30 minutes" and a 16:00 "Due today") are two distinct alerts, each shown once. BEYOND never sends
     * two moments with the same time and kind.
     */
    val key: String get() = "$at|$kind"
}
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
            else Moment(m.getLong("at"), m.getString("title").take(60), m.optString("text", "").take(160), go, m.optString("kind", "").take(20))
        }
        BridgePlan(home, o.optString("brief", "").take(400), moments.sortedBy { it.at })
    }
} catch (e: Exception) { null }

fun upcoming(plan: BridgePlan, now: Long): List<Moment> = plan.moments.filter { it.at > now }

/**
 * BRIDGE-NOTIFY-001 review fix: how long a moment that came due but has not been shown stays eligible to be set again.
 * The alarms are inexact (no exact-alarm permission): Android may deliver one up to an hour after its time, and Doze can
 * hold it a little longer. A re-arm inside that window must not cancel such an alarm for good, so every moment that is
 * not yet shown and came due less than [GRACE_MS] ago is set again (a time in the past fires at once). Older ones are
 * dropped rather than shown hours late (for example after the phone was off): a re-arm no longer sets them, and an alarm
 * Android delivers after the window is not shown ([shouldShow]).
 */
const val GRACE_MS = 2 * 60 * 60 * 1000L

/** The moment's time from a [Moment.key], or null for anything else. */
fun keyTime(key: String): Long? = key.substringBefore('|').toLongOrNull()

/**
 * BRIDGE-NOTIFY-001: the alarms to set now. BEYOND's plan reaches four weeks ahead (already capped at 3 a day, with
 * the owner's kinds off and quiet hours applied in BEYOND); the phone holds at most [max] alarms, so each re-arm
 * (after a moment fires, at each background check when Auto sync is allowed, after a restart, at each SYNC GARMIN)
 * rolls the window forward. The window is every moment not yet [shown] that is still in the future or came due within
 * [GRACE_MS]: a moment is dropped only once it has actually been shown (or is too old), never because a re-arm ran
 * while Android was still holding its alarm.
 */
fun toArm(plan: BridgePlan, now: Long, shown: Set<String>, max: Int): List<Moment> =
    plan.moments.filter { it.at > now - GRACE_MS && it.key !in shown }.take(max)

/**
 * FOLLOWUPS-001 (N2): whether a fired alarm's moment is shown now. Same window as [toArm]: not yet [shown] and came due
 * less than [GRACE_MS] ago. An alarm Android delivers later than that is dropped rather than shown hours late.
 */
fun shouldShow(moment: Moment, now: Long, shown: Set<String>): Boolean =
    moment.key !in shown && moment.at > now - GRACE_MS

/**
 * FOLLOWUPS-001 (N1): the shown set to start from when none was ever stored (the first run after upgrading from 0.11.0,
 * which kept none). Every moment of the stored plan already due within the grace window counts as shown: 0.11.0 most
 * likely showed it already, so it is not shown a second time. The cost is one-off and bounded: a moment whose 0.11.0
 * alarm Android was still holding at that instant is not shown.
 */
fun seedShown(plan: BridgePlan?, now: Long): Set<String> =
    plan?.moments?.filter { it.at <= now && it.at > now - GRACE_MS }?.map { it.key }?.toSet() ?: emptySet()

/** The shown keys worth keeping: anything older than the grace window can never be armed again. */
fun pruneShown(shown: Set<String>, now: Long): Set<String> =
    shown.filter { (keyTime(it) ?: Long.MIN_VALUE) > now - GRACE_MS }.toSet()

/** Where the Bridge sets and cancels its alarm slots; AlarmManager on the phone, a fake in the tests. */
interface AlarmSlots {
    fun cancel(slot: Int)
    fun set(slot: Int, moment: Moment)
}

/** Clears every slot, then sets one per moment from [toArm]. Returns what was set. */
fun rearm(slots: AlarmSlots, plan: BridgePlan?, now: Long, shown: Set<String>, max: Int): List<Moment> {
    for (i in 0 until max) slots.cancel(i)
    val armed = if (plan == null) emptyList() else toArm(plan, now, shown, max)
    armed.forEachIndexed { i, m -> slots.set(i, m) }
    return armed
}

/**
 * A new plan from SYNC GARMIN replaces the old one. BEYOND only sends moments still to come, so a moment of the old plan
 * that came due moments ago and whose alarm Android is still holding would vanish with it; it is carried into the new
 * plan (within [GRACE_MS], not yet shown, not already in the new plan).
 */
fun carryOver(old: BridgePlan?, next: BridgePlan, now: Long, shown: Set<String>): BridgePlan {
    if (old == null) return next
    val keys = next.moments.map { it.key }.toSet()
    val due = old.moments.filter { it.at <= now && it.at > now - GRACE_MS && it.key !in shown && it.key !in keys }
    return if (due.isEmpty()) next else next.copy(moments = (due + next.moments).sortedBy { it.at })
}

/** The plan as the JSON [parsePlan] reads. */
fun planJson(plan: BridgePlan): String {
    val moments = JSONArray()
    plan.moments.forEach { m ->
        moments.put(JSONObject().put("at", m.at).put("kind", m.kind).put("title", m.title).put("text", m.text).put("go", m.go))
    }
    return JSONObject().put("home", plan.home).put("brief", plan.brief).put("moments", moments).toString()
}

/** The page a moment opens: BEYOND's home, plus its query (e.g. ?alfred=debrief). */
fun momentUrl(plan: BridgePlan, moment: Moment?): String = plan.home + (moment?.go ?: "")
