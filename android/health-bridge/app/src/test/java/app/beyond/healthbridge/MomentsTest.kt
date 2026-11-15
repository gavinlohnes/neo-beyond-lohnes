package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MomentsTest {
    private val json = """{"home":"https://example.test/beyond/","brief":"Sleep first.","moments":[
        {"at":3000,"title":"Shift's done","text":"Debrief","go":"?alfred=debrief"},
        {"at":1000,"title":"Shift in 30 minutes","text":"Eat","go":""}]}"""

    @Test fun parsesAndSortsTheMoments() {
        val plan = parsePlan(json)!!
        assertEquals("Sleep first.", plan.brief)
        assertEquals(listOf(1000L, 3000L), plan.moments.map { it.at })
        assertEquals(listOf("Shift's done"), upcoming(plan, 2000).map { it.title })
        assertEquals("https://example.test/beyond/?alfred=debrief", momentUrl(plan, plan.moments[1]))
        assertEquals("https://example.test/beyond/", momentUrl(plan, plan.moments[0]))
    }

    @Test fun refusesAnythingButBeyondsOwnAddress() {
        assertNull(parsePlan(json.replace("https://example.test/beyond/", "javascript:alert(1)")))
        assertNull(parsePlan("not json"))
        assertEquals(0, parsePlan(json.replace("?alfred=debrief", "https://elsewhere"))!!.moments.count { it.go.isNotEmpty() })
    }

    private val home = "https://example.test/beyond/"
    private val hour = 60 * 60 * 1000L

    private fun planOf(vararg moments: Pair<Long, String>) = parsePlan(
        """{"home":"$home","brief":"","moments":[${moments.joinToString(",") { (at, kind) -> "{\"at\":$at,\"kind\":\"$kind\",\"title\":\"$kind\",\"text\":\"\",\"go\":\"\"}" }}]}""",
    )!!

    /** AlarmManager as the Bridge uses it: one alarm per slot; set replaces, cancel removes; delivery is up to Android. */
    private class FakeAlarms : AlarmSlots {
        val slots = sortedMapOf<Int, Moment>()
        var cancels = 0
        override fun cancel(slot: Int) { cancels++; slots.remove(slot) }
        override fun set(slot: Int, moment: Moment) { slots[slot] = moment }
        fun pending() = slots.values.map { it.key }.sorted()
    }

    @Test fun armsARollingWindowPastTheMomentThatWasShown() {
        val many = (1..30).joinToString(",") { "{\"at\":${it * 1000},\"kind\":\"BEFORE_SHIFT\",\"title\":\"t$it\",\"text\":\"\",\"go\":\"\"}" }
        val plan = parsePlan("""{"home":"$home","brief":"","moments":[$many]}""")!!
        assertEquals((1..24).map { it * 1000L }, toArm(plan, 0, emptySet(), 24).map { it.at })
        // Moments 1 to 5 were shown: the window starts after them and reaches moment 29, never more than 24.
        val shown = (1..5).map { "${it * 1000}|BEFORE_SHIFT" }.toSet()
        assertEquals((6..29).map { it * 1000L }, toArm(plan, 5000, shown, 24).map { it.at })
        // Long past (beyond the grace window) and nothing left to come: nothing is armed.
        assertEquals(emptyList<Long>(), toArm(plan, 30_000 + GRACE_MS, emptySet(), 24).map { it.at })
    }

    @Test fun aReArmWhileAndroidStillHoldsALateAlarmKeepsIt() {
        // SHIFT_DONE at 06:00 fired and armed WAKE for 15:00. Android may deliver that up to 16:00. The 3-hourly
        // background check re-arms at 15:30, before the delivery: the 15:00 moment must still be set (it fires at once).
        val wake = 15 * hour
        val plan = planOf(6 * hour to "SHIFT_DONE", wake to "WAKE", 16 * hour to "BEFORE_SHIFT")
        val alarms = FakeAlarms()
        val shown = setOf("${6 * hour}|SHIFT_DONE")
        rearm(alarms, plan, 6 * hour, shown, 24)
        assertEquals(listOf("${wake}|WAKE", "${16 * hour}|BEFORE_SHIFT"), alarms.pending())
        rearm(alarms, plan, wake + 30 * 60 * 1000L, shown, 24)
        assertEquals(listOf("${wake}|WAKE", "${16 * hour}|BEFORE_SHIFT"), alarms.pending())
        assertEquals(48, alarms.cancels) // every slot is cleared on each re-arm, then set again
        // Once shown, it is not set again: no duplicate.
        rearm(alarms, plan, wake + 31 * 60 * 1000L, shown + "${wake}|WAKE", 24)
        assertEquals(listOf("${16 * hour}|BEFORE_SHIFT"), alarms.pending())
        // A moment never delivered for longer than the grace window (phone off) is dropped, not shown hours late.
        rearm(alarms, plan, wake + GRACE_MS + 1, shown, 24)
        assertEquals(emptyList<String>(), alarms.pending().filter { it.endsWith("|WAKE") })
        assertTrue(GRACE_MS >= hour)
    }

    @Test fun theWindowNeverHoldsMoreThanTheCapEvenWithOverdueMoments() {
        val plan = planOf(*(0 until 30).map { it * hour to "TASK_DUE" }.toTypedArray())
        val alarms = FakeAlarms()
        // At 01:30 nothing has been shown: 00:00 and 01:00 are overdue but inside the grace window; still 24 slots at most.
        val armed = rearm(alarms, plan, hour + 30 * 60 * 1000L, emptySet(), 24)
        assertEquals(24, armed.size)
        assertEquals(24, alarms.slots.size)
        assertEquals(0L, armed.first().at)
        assertEquals(armed.map { it.key }.toSet().size, armed.size)
        // No plan: everything is cancelled.
        rearm(alarms, null, 0, emptySet(), 24)
        assertTrue(alarms.slots.isEmpty())
    }

    @Test fun twoMomentsAtTheSameTimeAreTwoAlerts() {
        val at = 16 * hour
        val plan = planOf(at to "BEFORE_SHIFT", at to "TASK_DUE")
        assertEquals(2, plan.moments.size)
        assertNotEquals(plan.moments[0].key, plan.moments[1].key)
        assertNotEquals(plan.moments[0].key.hashCode(), plan.moments[1].key.hashCode())
        val alarms = FakeAlarms()
        rearm(alarms, plan, 0, emptySet(), 24)
        assertEquals(listOf("$at|BEFORE_SHIFT", "$at|TASK_DUE"), alarms.pending())
        // Showing one leaves the other set.
        rearm(alarms, plan, at, setOf("$at|BEFORE_SHIFT"), 24)
        assertEquals(listOf("$at|TASK_DUE"), alarms.pending())
    }

    @Test fun shownKeysArePrunedOnlyPastTheGraceWindow() {
        val now = 100 * hour
        val shown = setOf("${now - hour}|WAKE", "${now - GRACE_MS}|WAKE", "junk")
        assertEquals(setOf("${now - hour}|WAKE"), pruneShown(shown, now))
    }

    @Test fun aNewPlanCarriesAnOldMomentStillWaitingOnAndroid() {
        val now = 20 * hour
        val old = planOf(now - 2 * hour - 1 to "WAKE", now - 30 * 60 * 1000L to "BEFORE_SHIFT", now - 20 * 60 * 1000L to "TASK_DUE", now + hour to "SHIFT_DONE")
        val next = planOf(now + hour to "SHIFT_DONE", now + 5 * hour to "WAKE")
        // BEFORE_SHIFT came due 30 minutes ago and is not shown yet; TASK_DUE was shown; WAKE is too old.
        val merged = carryOver(old, next, now, setOf("${now - 20 * 60 * 1000L}|TASK_DUE"))
        assertEquals(listOf("${now - 30 * 60 * 1000L}|BEFORE_SHIFT", "${now + hour}|SHIFT_DONE", "${now + 5 * hour}|WAKE"), merged.moments.map { it.key })
        assertEquals(next, carryOver(null, next, now, emptySet()))
        // The stored form reads back the same.
        assertEquals(merged, parsePlan(planJson(merged)))
    }
}
