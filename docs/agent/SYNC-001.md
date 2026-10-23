# SYNC-001 — current in two taps

- **Authority:** Gavin, 2026-10-23: "go SYNC-001", after a night where last night's sleep and today's
  steps never reached BEYOND (Garmin hadn't passed them to Health Connect yet, and nothing said so).
- **Builder / lane / branch:** Claude Code; FEATURE (a new capability and a web-reachable entry point,
  per DEV-FLOW-002's 2026-10-23 clarification; no new permission or data category); `claude/sync-001`
  from `4d38b3a`.
- **REUSE:** the helper's existing Health Connect reads and SEND TO BEYOND share path; BEYOND's
  existing share-target import preview and confirm; the "Garmin as of" line and stale note.
- **OWN:** the `beyond-bridge://sync` link between BEYOND and the helper; the freshness wording.
- **BUILD FROM SCRATCH:** `freshnessLine` (pure Kotlin) and the SYNC GARMIN link component.
- **Scope:** the helper reads its 7-day window when it opens (only when access is already allowed),
  says how current Health Connect's Garmin sleep and steps are, and tells you to sync Garmin Connect
  when they're behind; opened from BEYOND's SYNC GARMIN link it also opens the share sheet. BEYOND
  shows SYNC GARMIN on Android in the Garmin detail sheets and in TODAY's old-data note.
- **Excluded:** background sync, auto-confirmed imports (preview-before-write stays), new
  permissions, Internet access, changes to how Garmin sleep is filed into lived days, Engine.
- **Acceptance:** Kotlin unit tests for `freshnessLine`; Health Bridge CI (manifest check, tests,
  lint, APK); BEYOND browser test for the link; full verify; independent exact-head review; Gavin
  installs helper 0.7.0 and merges.
