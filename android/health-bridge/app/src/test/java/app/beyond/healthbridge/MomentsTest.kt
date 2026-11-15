package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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

    @Test fun armsARollingWindowPastTheMomentThatFired() {
        val many = (1..30).joinToString(",") { "{\"at\":${it * 1000},\"kind\":\"BEFORE_SHIFT\",\"title\":\"t$it\",\"text\":\"\",\"go\":\"\"}" }
        val plan = parsePlan("""{"home":"https://example.test/beyond/","brief":"","moments":[$many]}""")!!
        assertEquals((1..24).map { it * 1000L }, toArm(plan, 0, 24).map { it.at })
        // Moment 5 just fired: the window starts after it and reaches moment 29.
        assertEquals((6..29).map { it * 1000L }, toArm(plan, 5000, 24).map { it.at })
        assertEquals(emptyList<Long>(), toArm(plan, 30_000, 24).map { it.at })
    }
}
