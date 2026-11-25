package app.beyond.healthbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PlanLinkTest {
    private val plan = """{"home":"https://example.test/beyond/","brief":"Sleep first.","moments":[
        {"at":1000,"kind":"BEFORE_SHIFT","title":"Shift in 30 minutes","text":"Eat","go":""}]}"""

    @Test fun aValidPlanIsSaved() {
        assertEquals(plan, planFromLink(plan))
        assertEquals(1, parsePlan(planFromLink(plan))!!.moments.size)
    }

    @Test fun aMissingOrBadPlanSavesNothing() {
        assertNull(planFromLink(null))
        assertNull(planFromLink(""))
        assertNull(planFromLink("not json"))
        assertNull(planFromLink(plan.replace("https://example.test/beyond/", "javascript:alert(1)")))
    }
}
