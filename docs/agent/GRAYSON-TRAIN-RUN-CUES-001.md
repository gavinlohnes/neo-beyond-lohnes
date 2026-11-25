# GRAYSON-TRAIN-RUN-CUES-001 — spoken run and walk cues, and a buzz, with the phone locked

- **Authorization:** Gavin, 2026-11-24. Backlog row **B3** (DELIGHT, ranked 6th). His pick **1A**: run cues
  through Health Bridge, by voice and buzz. GRAYSON-TRAIN-RUN-001 names this as the next slice ("B3 run cues
  (Health Bridge): consumes `runningCueTimeline()` and the session's `startedAt`/`pausedMs`"). At 04:38 CT:
  **"Now let's start giving Claude stuff to work on. Work on finishing train"**. His rule: **"I should be able
  to edit and tweak or correct everything in this app."** Merging this brief approves the defaults below,
  including the new Android permissions listed under "Permissions".
- **Lane: PROTECTED.** Android change: new permissions, a foreground service, a new Health Bridge intent and a
  new entry in the Health Bridge CI's allowed-services list. No Engine, recommendation, TODAY or Dexie change.
  Independent exact-head review, green CI (both `pr-verify` and `health-bridge`); Gavin merges. No Builder merge.
- **Starting commit:** `origin/master` `e43ba36` (#659 merged). Re-fetch before starting.
- **Builder:** Claude Code (TRAIN while Codex is offline). Branch `claude/grayson-train-run-cues-001`.
  Reviewer: Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#2** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after TRAIN-EDIT-001. It is the first Health
  Bridge change; PLAN-FRESH-001 (Grok Bot) waits for it or rebases on it. It builds **after GRAYSON-TRAIN-RUN-001 is merged** (#666 is), because it consumes RUN-001's
  `runningCueTimeline()`, the running session record and the running screen. If RUN-001 is not on master when
  you start, stop and say so. Android files are touched by no other open brief. The running screen file is
  RUN-001's; if TRAIN-EDIT-001 or STANDARDS-001 is open on the same file, rebase on whichever merges first.
  Tracker and checkpoint go to the oldest open PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

He starts a run in BEYOND, locks the phone, puts it in a pocket or armband, and hears "Run for 1 minute",
"Walk for 90 seconds", "Halfway", "Cool down" at the right moments, with a buzz at each change. Music ducks
under the voice and comes back. He never looks at the screen during a run. That is the last piece TRAIN needs
to replace the Couch to 5K app for running.

**Benchmarks (read 2026-11-24):**
- NHS Couch to 5K app: a voice cue at every run and walk change, a haptic pattern on walk to run, and a visual
  and audible interval timer ([App Store listing](https://apps.apple.com/gb/app/nhs-couch-to-5k/id1082307672);
  SCORECARDS rows C3, C4, C5).
- Plan pattern itself is RUN-001's, from the
  [NHS Couch to 5K running plan](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/).
- Copy the behaviour, not the assets: no NHS audio, coach voices or wording. Speech is the phone's own
  text-to-speech voice reading GRAYSON's cue text.

**Why Health Bridge and not the web app:** a PWA's timers and `speechSynthesis` stop or stall when the screen
locks, so cues from the web app alone can't be trusted in a pocket. Health Bridge is already on his phone, and
an Android foreground service keeps running with the screen off. Its existing moment alarms can't do this job:
they use `AlarmManager.setAndAllowWhileIdle`, which is inexact and can arrive up to an hour late
(`android/health-bridge/README.md`, 0.11.1 notes).

## Recommended defaults (Gavin approves these with the brief)

1. **What speaks:** every cue in RUN-001's timeline (WARMUP, RUN, WALK, HALFWAY, COOLDOWN, FINISH), using the
   timeline's own `text`. No extra countdowns.
2. **Buzz:** on each RUN and WALK change. A long double buzz before RUN, one short buzz before WALK, so he can
   tell them apart without the voice. The bridge buzzes **only while the screen is off or locked**; while the
   screen is on, RUN-001's in-app buzz already does it, so he never gets two.
3. **Music:** ducks under the voice (Android transient audio focus, "may duck"), then returns. Uses media
   volume; no volume setting of its own.
4. **When it's on:** a **VOICE CUES** switch on the running screen, labelled "Voice and buzz with the phone
   locked (Health Bridge)". On by default once BEYOND has ever received data from Health Bridge, because that
   proves the helper is installed. Otherwise off, with one line: "Install Health Bridge 0.12 to hear cues with
   the phone locked." If BEYOND keeps no record of a past Health Bridge import, stop and ask.
5. **Control stays in BEYOND:** start, pause, resume and end happen in BEYOND as now. Each of those taps also
   tells Health Bridge (see "How it works"). The lock-screen notification has two buttons only, **MUTE**
   (silences voice and buzz for this run, keeps the notification) and **END CUES** (stops the bridge). Neither
   changes the run record. Pausing or logging from the lock screen is C7.5, not this slice.
6. **Lock-screen notification:** an ongoing notification while cues run: "Running · Week 3, run 2", then the
   current interval and a countdown to the next change ("Walk · run in 0:42"), using Android's built-in
   countdown chronometer so it doesn't post an update every second.
7. **Stopping by itself:** the bridge stops itself 10 seconds after FINISH, when BEYOND sends end, when he taps
   END CUES, or 4 hours after start, whichever comes first. It never restarts after a reboot.
8. **Not installed or too old:** if the intent can't be handled, nothing breaks. The run carries on with
   RUN-001's on-screen cues, and the switch line says so once.

## Everything is his to change

- **The switch** (default 4) is his, per run and remembered for next time.
- **Buzz on or off** and **voice on or off**, separately, under the switch. He can keep the buzz and drop the
  voice, or the reverse.
- **Cue wording:** RUN-001 left wording to B3 ("the cue wording (B3 owns speech)"). A **CUE WORDS** sheet lists
  the six cue kinds with their default text and lets him rewrite each (for example "Go" for RUN). `{minutes}`
  and `{seconds}` placeholders keep the duration in his own words; a blank field falls back to the default.
  **RESET** restores the defaults. The sheet shows "This is what you'll hear" with a **PLAY** button that speaks
  the line with the phone's voice through the web app's `speechSynthesis` (screen on, a preview only).
- **Which cues speak:** each of the six kinds has its own on or off in the same sheet (HALFWAY off, for example).
- Stored in `localStorage` key `beyond.runCues.v1` (`{ voice, buzz, words: Partial<Record<Cue, string>>,
  speak: Partial<Record<Cue, boolean>> }`), validated on read like the other `beyond.*.v1` preferences, and
  added to `TRAVELLING_SETTINGS` in
  `persistence/settingsTransfer.ts` as "Run cue words and voice", so it moves with his settings and backup. Preferences, not events: nothing about a run
  changes when he edits them.
- **Not editable here, and why:** the voice itself and speech rate belong to Android's text-to-speech settings;
  the sheet links nowhere and says "Voice and speed follow your phone's text-to-speech settings."

## How it works

**BEYOND side.** New `src/application/runCueBridge.ts`:
- `runCuePayload(session, timeline, prefs)` returns `{ v: 1, id, title, startedAt, pausedMs, pausedAt?, cues:
  { at, kind, text, speak, buzz }[] }`. It applies his wording and on or off choices, so the bridge speaks
  exactly what BEYOND sends and holds no wording of its own.
- `runCueUrl(op, payload)` returns
  `intent://run?op=<start|pause|resume|end>&p=<encodeURIComponent(JSON)>#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end`,
  the same shape as `helperSyncUrl()` in `src/application/bridgePlan.ts:185`.
- The running screen opens that URL inside the tap handler for START, PAUSE, RESUME, END and the pain control,
  because Chrome only opens an intent link from a user tap. A reload mid-run sends nothing; the bridge already
  has the timeline.
- Size guard: refuse a payload over 8 KB or over 200 cues (a full Couch to 5K run is well under).

**Health Bridge side (0.12.0, versionCode 15).**
- `RunCues.kt` (pure, no Android types): parse and validate the payload, and `nextCue(payload, nowMs)` that
  works from `startedAt + pausedMs` the same way RUN-001 does, so both apps agree from the same timestamps.
  Pause stops the clock at `pausedAt`; resume carries the new `pausedMs`.
- `RunCueActivity.kt`: a no-display trampoline activity for the `beyond-bridge://run` link. It asks for the
  runtime permission the first time (see "Permissions"), starts or updates the service, and finishes at once so
  he lands back in BEYOND. `excludeFromRecents`, no visible screen.
- `RunCueService.kt`: a foreground service of type `health`. It holds the payload, schedules the next cue with a
  `Handler` on the main looper and re-checks the clock at each cue, speaks through `TextToSpeech` with
  assistance audio attributes and transient duck focus, buzzes through `VibratorManager` (or `Vibrator` below
  Android 12) when `PowerManager.isInteractive` is false or the keyguard is locked, and shows the ongoing
  notification with MUTE and END CUES actions.
- A cue that's more than 5 seconds late (the phone was busy) is spoken anyway if it's still the current
  interval; a cue whose interval has already passed is skipped, never spoken out of order.
- Nothing is written to disk. No Internet permission (the CI check still requires that).

## Permissions (Gavin's approval is merging this brief)

Added to `android/health-bridge/app/src/main/AndroidManifest.xml`:
- `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_HEALTH` (install-time). Android's docs describe the `health` type
  as being for "fitness category such as exercise trackers"
  ([Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types)).
- `ACTIVITY_RECOGNITION` (runtime, asked once, the first time he starts cues). The `health` type requires one
  of its listed runtime permissions; this is the one that fits. The bridge reads **no** activity or sensor
  data with it. The prompt's lead-in line: "Android asks for this so the bridge can keep run cues going with
  the screen locked. It reads nothing."
- `VIBRATE` (install-time).
- A `<queries>` entry for `android.intent.action.TTS_SERVICE`, so the bridge can find the phone's speech engine.
- `.github/workflows/health-bridge.yml`: add `app.beyond.healthbridge.RunCueService` to the `allowed` services
  set, with a comment naming this brief and Gavin's merge. Keep every other assertion as it is (health read
  permissions unchanged, no Internet).

If he denies the runtime permission: the bridge does not start, the notification says "Voice cues need the
physical activity permission. Allow it in Health Bridge's settings.", and BEYOND carries on with on-screen cues.

## Scope
- The BEYOND switch, sub-switches, CUE WORDS sheet and payload builder.
- Health Bridge 0.12.0: trampoline activity, foreground service, pure cue scheduler, permissions, notification.
- README "0.12.0" section in `android/health-bridge/README.md`: what it does, the new permissions and why, and
  that it reads nothing new.

## Excluded
- Pausing, ending or logging from the lock screen (C7.5).
- Lift sets on the lock screen (C7.5 reuses this service later).
- GPS, distance, pace, heart rate during a run. Reading any sensor.
- Cues for anything other than running sessions.
- Any change to RUN-001's timeline function, record or events. If the timeline doesn't carry what this needs,
  stop and ask; don't change its contract here.
- Garmin watch cues.

## Files
- **BUILD:** `src/application/runCueBridge.ts`, `src/application/runCuePrefs.ts` (the `beyond.runCues.v1`
  read and write), the CUE WORDS sheet under `src/ui/screens/train/`, `RunCues.kt`, `RunCueActivity.kt`,
  `RunCueService.kt`, `tests/runCueBridge.test.ts`, `tests/runCuePrefs.test.ts`,
  `android/health-bridge/app/src/test/java/app/beyond/healthbridge/RunCuesTest.kt`.
- **OWN (edit):** RUN-001's running screen (switch and the four tap hooks), `AndroidManifest.xml`,
  `android/health-bridge/app/build.gradle.kts` (0.12.0, versionCode 15), `.github/workflows/health-bridge.yml`
  (one allowlist entry), `android/health-bridge/README.md`, `persistence/settingsTransfer.ts` (one entry).
- **REUSE:** `runningCueTimeline()`, the running session's `startedAt`/`pausedMs`/`pausedAt`, the
  `helperSyncUrl()` intent shape, RUN-001's `feedback()` buzz while the screen is on, the `beyond.*.v1`
  validation pattern.

## Acceptance
- `tests/runCueBridge.test.ts`: payload for week 1 run 1 has every cue at RUN-001's times; his wording replaces
  the default and fills `{minutes}`/`{seconds}`; a blank override falls back; a cue switched off has
  `speak: false`; pause carries `pausedAt`; the URL round-trips through `decodeURIComponent`; oversize payload
  refused. Run under `TZ=UTC` and `TZ=America/Chicago`: same cue times (timestamps are absolute).
- `tests/runCuePrefs.test.ts`: bad stored JSON falls back to defaults; RESET clears overrides; backup round trip.
- `RunCuesTest.kt`: `nextCue` at start, mid-interval, after pause and resume, after FINISH (none); a late cue
  inside its interval is returned, one past its interval is skipped; payload with `v` other than 1, over 200
  cues or over 4 hours is rejected.
- `health-bridge` CI green: unit tests, lint, assemble, and the permission check with the one new service.
- Browser tests: the switch shows the right default with and without a past Health Bridge import; START,
  PAUSE, RESUME and END each open a `beyond-bridge://run` link with the right `op`; a reload mid-run opens none;
  CUE WORDS edit, PLAY and RESET work.
- Screenshots at 360, 320 and 412 px: the running screen with the switch on and off, and the CUE WORDS sheet.
- **Device check (Gavin, his phone, Health Bridge 0.12.0 from the PR's APK):** start week 1 run 1, lock the
  phone with music playing. Each cue is spoken within about a second of the on-screen change and the music ducks
  and returns; the buzz comes only while locked and differs for run and walk; pause in BEYOND, wait 30 seconds,
  resume, and the next cue moves by 30 seconds; MUTE silences, END CUES removes the notification; END in BEYOND
  stops the bridge; tapping START returns him to BEYOND, not Health Bridge's screen. Denying the permission once
  shows the notification line and the run still works on screen.

## Decision record
- Health Bridge over the web app: the web app can't keep time or speak reliably with the screen locked.
- Foreground service of type `health` over `mediaPlayback`: Android names exercise trackers for `health`;
  `mediaPlayback` would avoid the runtime prompt but describes a different job. Ask first if switching.
- BEYOND stays the one source of truth for the run; the bridge only speaks what BEYOND sends and never writes
  the run back. Two-way control is C7.5.
- Buzz from the bridge only with the screen off, so he never feels two buzzes.

## Stop and ask Gavin if
- RUN-001 isn't on master, or its timeline, session fields or running screen differ from what this brief names.
- Android requires any permission beyond the four above, or the `health` type can't start from the trampoline
  activity on his Android version.
- An older Health Bridge (0.11.x) handles the `run` link badly on his phone (opens the store, or opens the sync
  screen) and no quiet fallback exists.
- BEYOND keeps no record that Health Bridge has ever sent data (default 4).
- The CI permission check needs any change beyond adding `RunCueService`.

## Risks
- **Phone makers that kill background apps** (aggressive battery savers) may stop the service. The device check
  covers his phone; if it fails, report what the phone did rather than adding battery-exemption prompts.
- **The intent opens Health Bridge's screen** for a moment on START. The trampoline must finish at once; check on
  the device.
- **A debug APK with a different signature** needs the uninstall-and-reinstall the README already describes.
- **Clock changes mid-run** (time zone or manual): both apps use wall-clock timestamps, the same as RUN-001, so
  they stay in step with each other; a jump moves both.
