package app.beyond.healthbridge

/**
 * SYNC-002 (owner go 2026-10-31, one-tap sync): one app that can take the files, as Android lists it.
 * BEYOND is a home-screen web app, so its package name is Android's to choose; its label is "BEYOND".
 */
data class ShareCandidate(val label: String, val packageName: String, val activityName: String)

/**
 * The installed BEYOND to send straight to, without the share sheet, or null when there isn't exactly
 * one (none installed, or two that both look like BEYOND); the share sheet then lets the owner choose.
 */
fun pickBeyondTarget(candidates: List<ShareCandidate>, ownPackage: String): ShareCandidate? =
    candidates.filter { it.packageName != ownPackage && it.label.trim().equals("BEYOND", ignoreCase = true) }
        .distinctBy { it.packageName to it.activityName }
        .singleOrNull()
