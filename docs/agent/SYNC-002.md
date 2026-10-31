# SYNC-002 — SYNC GARMIN is one tap

- **Authority:** Gavin, 2026-10-31, option A ("Go A. That seems easier."). Recorded in
  `docs/UX_DECISIONS.md` (SYNC-002).
- **Builder / lane:** Claude Code; Protected (amends SYNC-001's preview-before-write; a new Health
  Bridge version), within the owner's go. Branch `ccr-0be4f40f-16m0ja`.

## Finding

The owner's Oct 28 backup: Garmin passed only 16 nights of sleep to Health Connect since Sep 1 (the
newest Oct 27), and resting heart rate stopped Oct 27. BEYOND imported everything it was sent; the
gap is between Garmin Connect and Health Connect, and nothing in BEYOND said so after a sync.

## Scope

1. SYNC GARMIN stores its tap time (`ui/healthSyncRequest.ts`); a share arriving within 15 minutes
   imports straight away (`application/healthSync.ts`, the existing import commands) and opens TODAY.
2. TODAY shows `GarminSyncLine`: what came, or that Garmin itself is behind.
3. Health Bridge 0.8.0: `pickBeyondTarget` sends straight to the one installed BEYOND; else the
   share sheet. Manifest adds a `<queries>` intent only (no permission).
4. BRIDGE-LOOK-001 (owner, 2026-10-31: "I don't like the android app" → how it looks): the helper's
   screen in BEYOND's look (black, one red SEND TO BEYOND, outlined others, saving files and the
   privacy note under MORE). `Look.kt`; dark Material theme. Same reads, sends and permissions.
5. Excluded: background sync, new permissions, Internet, how Garmin sleep is filed into lived days.

## Leverage

- **REUSE:** SYNC-001's link and helper read; GARMIN-002's share target; the existing import
  commands and measured snapshot; Android's package query for share targets.
- **OWN:** the tap window, the result wording, the direct-send choice.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/browser/Sync002.test.tsx` (straight import after a tap, preview otherwise, behind wording,
single-use request); `ShareTargetTest.kt` (direct target, fallback, never itself). Gavin installs
Health Bridge 0.8.0 from the PR's Health Bridge CI artifact.
