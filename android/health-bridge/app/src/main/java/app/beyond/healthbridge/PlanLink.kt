package app.beyond.healthbridge

/**
 * GRAYSON-PLAN-FRESH-001: the plan carried by BEYOND's `beyond-bridge://plan?plan=…` link, ready for
 * [MomentAlerts.save], or null when it's missing or isn't a plan BEYOND would send (nothing is saved then). Pure.
 */
fun planFromLink(raw: String?): String? = if (raw.isNullOrBlank() || parsePlan(raw) == null) null else raw
