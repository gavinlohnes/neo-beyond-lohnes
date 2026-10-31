# BEYOND Health Bridge — phone test build

An isolated Android helper for GARMIN-001. The existing BEYOND PWA keeps its URL,
browser storage and manual records. This app reads only Garmin sleep through the
official AndroidX Health Connect client, then saves a versioned JSON file for an
explicit BEYOND preview/import. GARMIN-002 adds optional steps and heart-rate reads: hourly
step totals, hourly heart-rate low/average/high and Garmin resting heart rate, saved as a
separate `BEYOND_HEALTH_CONNECT_ACTIVITY` file, imported through the same COMMAND → IMPORT HEALTH DATA screen. READ FULL HISTORY (GARMIN-003) reads everything Health Connect has from Garmin, up to 366 days, and asks for the optional "Access past data" permission; without it Health Connect only returns data from up to 30 days before access was first granted. SEND TO BEYOND shares both prepared files to the installed BEYOND app through Android's share sheet, with the same preview and confirmation. No Internet permission, account, server, background
worker, health write permission, analytics or third-party exporter.

SYNC-001 (0.7.0): once access is allowed, the helper reads its 7-day window as soon as it opens and
says how current Health Connect's Garmin sleep and steps are (with a hint to sync Garmin Connect when
they're behind). BEYOND's **SYNC GARMIN** link opens the helper through `beyond-bridge://sync`; it
reads and sends. SYNC-002 (0.8.0): it sends straight to the one installed BEYOND (the share sheet
opens only when there isn't exactly one), and because BEYOND remembers its own SYNC GARMIN tap it
imports those files straight away; any other share still opens BEYOND's preview. Still no
background sync.

BRIDGE-MOMENTS-001 (0.9.0): BEYOND's SYNC GARMIN link also carries a small plan — BEYOND's own
address, Alfred's brief and this week's key moments from the saved schedule (3 hours before each
shift, 30 minutes before, and its end). The Bridge keeps it on the phone, sets one inexact alarm per
moment (re-armed after a restart) and posts a notification that opens BEYOND; "Shift's done" opens
Alfred's debrief. A home-screen widget (BEYOND · Alfred) shows the brief and the next moment. It asks
once to show notifications. Still no Internet permission; nothing leaves the phone.

GARMIN-AUTO-001 (0.10.0, owner go 2026-10-31: "auto sync every few hours"): with Health Connect's
"Access data in background" allowed (asked with ALLOW ACCESS AND READ, where the phone offers it),
a WorkManager job checks every 3 hours for a new Garmin sleep. When one arrives it posts one quiet
notification, "Garmin: slept 7h12 · 8,400 steps today. Tap to send to BEYOND"; the tap runs the usual
sync and BEYOND imports it straight away (BEYOND trusts the Bridge once SYNC GARMIN has been used on
that phone). Android lets no app open BEYOND or write into it from the background, so that one tap
stays. CI allows exactly the WorkManager services and the one background permission; still no Internet.

The packaged manifest allows the official Health Connect SDK's bound
`HealthDataSdkService`, used for platform/client IPC. It is not a scheduled sync
worker. CI rejects other services, other health permissions and Internet access.

## Build and provenance

Java 17, Gradle 8.11.1, Android compile SDK 36 (target 35; minimum 28). Run:

```sh
gradle -p android/health-bridge testDebugUnitTest lintDebug assembleDebug
```

The separate **Health Bridge** GitHub Action attaches the test APK, SHA-256,
source commit and signing-certificate fingerprint to the PR run. The APK is a
debug-signed private test build, not a Play Store release. CI generates the debug
key; a later build may have a different signature. If Android refuses an update,
uninstall **BEYOND Health Bridge** only, then install the new helper and grant
sleep access again. Uninstalling the helper does not remove Garmin's Health
Connect records or BEYOND's browser data. A durable production signing/release
process is a separate decision; no private signing keys are committed here.

## Phone test

1. In the reviewed PR's passing Health Bridge run, download the named artifact,
   unzip it and open `app-debug.apk`. Allow your browser/file manager to install
   this app when Android asks. Turn that install permission off afterward.
2. Open **BEYOND Health Bridge**. Tap **ALLOW SLEEP ACCESS AND READ** and grant
   sleep access only. If none are found, sync Garmin and check that recent Garmin
   sleep appears in Android Settings → Health Connect → Sleep.
3. Tap **SAVE SLEEP FILE** and choose a local folder such as Downloads.
4. In the BEYOND version containing this PR, open COMMAND and search **IMPORT
   HEALTH DATA**. Choose the saved file. Check Garmin source, session times and
   stages. Leave source dates unassigned, or explicitly select an existing lived
   day; the app never guesses a night worker's lived day from midnight.
5. Confirm. Inspect **IMPORTED SLEEP** in BODY. Manual sleep and TODAY guidance
   must be unchanged. Import the same file again: zero new/revised records.
6. Export a BEYOND backup. Test restore in a separate browser profile with no
   valuable records; verify imported evidence and revision history survive.
7. Revoke the helper's sleep permission in Health Connect; a new read must fail
   without preparing a partial export. Cancel a save/preview; no BEYOND import.

Complete sessions fully inside the previous 7 days only; no background/history
permission. Maximum 500 records, 15,000 stages, 2 MiB; oversized/malformed exports
fail as a whole. File absence does not delete previously imported records.
Session span is not an asleep total: BEYOND only derives asleep time when known
stages cover the entire session. No exercises, steps, energy, nutrition, body
measurements, automatic corrections, source deletion reconciliation or Engine
inputs in this version. The transfer file contains private health data: remove
it from Downloads when finished and avoid sharing it publicly.

## Reuse

Uses the official AndroidX Health Connect SDK 1.1.0 (Apache-2.0), AndroidX Activity
and Lifecycle (Apache-2.0), Kotlin coroutines (Apache-2.0). SDK permission and
record APIs follow Android developer documentation. No code from the evaluated
MIT multi-category exporter was copied. PWA interchange/storage is BEYOND-owned.
