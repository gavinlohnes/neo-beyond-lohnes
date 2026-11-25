# GRAYSON-PLAN-FRESH-001 — phone alerts that stay current without a SYNC GARMIN

- **Authorization:** Gavin, 2026-11-24. Backlog row **C7.2** (CONNECT, ranked 14th): "Alerts that stay current
  without a Garmin sync" (campaign plan C7.2, "Plan stays fresh"). At 05:03 CT: **"Yes. Start the next briefs"**; at
  05:23 CT: **"Just keep pumping out work."** His rule: **"I should be able to edit and tweak or correct everything in
  this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** Notification delivery and an Android change (a new exported activity in Health Bridge, a new
  version, and the CI manifest check). No new permission, table, event, Engine input or alert kind; the 3-a-day cap,
  priorities and quiet hours are unchanged.
- **Starting commit:** `origin/master` `92f46cf3` (#667). Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-plan-fresh-001`. **Reviewer:** Claude Code (Codex is offline).
  **Active PR:** pending.
- **Order and overlap:** Grok Bot **#3** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after TODAY-SPLIT-003 and TODAY-CALM-001 and
  **before** FLIP-PLAN-001; FLIP-PLAN's flip days reach the phone through this hand-off when they land. One Health
  Bridge change open at a time: if RUN-CUES-001 is open, wait for it or rebase on it. Health Bridge: GRAYSON-TRAIN-RUN-CUES-001
  (Claude Code) plans 0.12.0 / versionCode 15 and a `RunCueActivity`; take the next free minor version and versionCode
  at build time, and rebase on whichever Bridge change merges first (both edit `AndroidManifest.xml`,
  `build.gradle(.kts)` and `.github/workflows/health-bridge.yml`).
- **Amended by GRAYSON-TODAY-CALM-001 (2026-11-24):** build after it. "Phone alerts are behind your plan." is the quiet-line candidate `PHONE_ALERTS_BEHIND` (default place 4) rendered by `TodayQuietLines`; its TODAY switch is that line's switch in MORE → TODAY.

## Objective and benefit
The phone's key-moment alerts (before the shift, shift's done, task due, up for the shift) come from a plan BEYOND
hands to Health Bridge, and today that only happens on **SYNC GARMIN** (`ui/screens/today/MeasuredSheet.tsx`
`bridgeSyncUrl`, `application/bridgePlan.ts` `helperSyncUrl`). The Bridge re-arms that plan in the background for 28
days, so alerts keep coming, but a task he adds, an alert he turns off, quiet hours he changes or a swapped shift
don't reach the phone until his next SYNC GARMIN. So an alert can fire for a shift he swapped, or miss a task due
tomorrow. After this, the phone gets the new plan when he changes something that affects it, with no extra screen, and
KEY MOMENT ALERTS says how current the phone's plan is.

**Why not fully silent:** Chrome on Android won't open an app link without a tap: "Chrome won't launch an external
app for a given Intent URI if … The Intent URI is initiated without user gesture"
([Chrome for Developers: Android Intents with Chrome](https://developer.chrome.com/docs/android/intents), updated
2023-12-12, read 2026-11-24), and Chromium's design notes list "Launching an app without user activation" among blocked
flows ([components/external_intents](https://chromium.googlesource.com/chromium/src/+/main/components/external_intents),
read 2026-11-24). So the hand-off rides on taps he's already making, and when nothing else is happening it's one
quiet tap. The campaign plan anticipated this ("where Android allows").

**Benchmark:** phone-native apps on the scorecards (rows S10, P4) send their reminders from the phone itself, so they
always match what's saved. GRAYSON's alerts come from a plan BEYOND hands to the Bridge, so the gap is ours to close;
there's no app feature to copy here.

## Recommended defaults (approved when Gavin merges this brief)
1. **A fingerprint of the plan:** `planFingerprint(plan)` hashes the moments (time, kind, title, text) and the brief
   from `buildBridgePlan`. BEYOND remembers the fingerprint and time of the last plan it handed over
   (`beyond.bridgePlan.sent.v1`, `{ hash, at }`), written when a SYNC GARMIN or an update link is tapped.
2. **The hand-off rides on taps he already makes**, on Android only, when the fingerprint differs from the last one
   sent:
   - **SAVE in KEY MOMENT ALERTS** (any change to a kind or quiet hours),
   - **SAVE on a schedule change or a confirmed schedule exception**,
   - **MARK WORK ENDED** and **START SHIFT DOWN** are *not* used: those taps shouldn't open another app.
   On those SAVE taps the page opens the update link right after the save succeeds, in the same tap, so Chrome
   allows it.
3. **A new no-screen activity in Health Bridge:** `PlanActivity`, filtered on `beyond-bridge://plan?plan=…`. It saves
   the plan with the existing `MomentAlerts.save`, re-arms the moments, and `finish()`es at once with no layout and
   `Theme.NoDisplay` (or `Theme.Translucent.NoTitleBar` where NoDisplay is refused), so he lands back in BEYOND. It
   doesn't read Health Connect, send anything back or ask for permissions; the notification permission request stays
   in MainActivity's SYNC flow. The URL form matches the sync one: `intent://plan?plan=…#Intent;scheme=beyond-bridge;
   package=app.beyond.healthbridge;end`.
4. **When nothing else is happening:** if the plan has changed since the last hand-off and he hasn't tapped any of the
   above, TODAY's quiet line area shows (Android only, at most once a lived day, muted): "Phone alerts are behind your
   plan. UPDATE ALERTS" — one tap hands it over. It's hidden while an operation, workout, RESET or SHIFT DOWN is
   active, and never shows inside a shift (the same "quiet on the clock" rule as the alerts themselves).
5. **KEY MOMENT ALERTS shows how current the phone is:** "Phone has your plan from Mon 06:12." and, when it differs,
   "Changed since: UPDATE ALERTS." Without a hand-off on record: "The phone gets your plan at the next SYNC GARMIN or
   UPDATE ALERTS."
6. **Older Bridge versions:** a Bridge without `PlanActivity` won't resolve the link; the intent gets an
   `S.browser_fallback_url` back to BEYOND's KEY MOMENT ALERTS screen with "Update Health Bridge to send alerts without
   a sync. SYNC GARMIN still works." No retries.

## Everything is his to change
In KEY MOMENT ALERTS:
- **Update the phone when I save here** on or off (default on).
- **Show "Phone alerts are behind" on TODAY** on or off (default on).
Stored in `beyond.bridgePlan.settings.v1` and added to `TRAVELLING_SETTINGS`. The sent fingerprint is device state
and doesn't travel.

## Design principles check (Vision, Nov 24)
- **Yours to change:** both hand-off paths can be turned off; SYNC GARMIN is unchanged.
- **Fix, don't ask:** the phone is updated on taps he's already making.
- **One tap for the usual:** UPDATE ALERTS is one tap, and only when something changed.
- **Built around shift:** never shown during a shift.
- **Calm:** muted, once a lived day at most, no badge or count.
- **Always says why:** KEY MOMENT ALERTS says when the phone last got the plan.
- **Simple first:** reuses the plan, the cap and the Bridge's own alarm code.
- **Tap or say it:** no change.

## Scope
- `application/bridgePlan.ts`: `planFingerprint`, `helperPlanUrl(plan)` (the `plan` host), the sent-state read/write.
- `ui/screens/more/KeyMomentAlerts.tsx`: the hand-off after SAVE, the status line, the two switches.
- The schedule SAVE and schedule-exception confirm screens: the same post-save hand-off (one shared helper,
  `handPlanToPhone()` in `ui/bridgeHandoff.ts`).
- `ui/screens/today/TodayScreen.tsx`: the "behind" line in the existing quiet-lines area.
- `MeasuredSheet.tsx`: SYNC GARMIN writes the sent state too.
- Health Bridge: `PlanActivity.kt`, the manifest entry and intent filter, version bump, `MomentAlerts` reuse; unit test
  for parsing; `.github/workflows/health-bridge.yml` allowlist only if its activity check needs it (no new service).
- `persistence/settingsTransfer.ts`: the settings key.

## Excluded
- Any background web-to-app channel, push messaging, a server, Web Push, new alert kinds (C7.3), changing the cap,
  priorities or quiet hours, the Bridge's 3-hour background check, Health Connect reads, auto-opening on app launch.

## Acceptance
- `tests/bridgePlanFresh.test.ts`: the fingerprint changes when a moment, its text or the brief changes and not when
  the order of equal moments changes; the URL round-trips the plan; sent state read/write; the "behind" line is due
  only on Android, outside shifts, once a lived day (06:10 belongs to the night before), and not when off. Run under
  `TZ=UTC` and `TZ=America/Chicago`.
- `tests/settingsTransfer.test.ts`: the settings key travels; the sent state doesn't.
- Health Bridge unit test (`PlanActivityTest.kt` or a pure parser test): a valid plan is saved; a missing or bad plan
  saves nothing and still finishes.
- CI: the Health Bridge workflow passes with the new activity; the manifest still has no Internet permission and only
  the allowed services.
- Browser tests (Android user agent): change quiet hours, SAVE, the link to `intent://plan…` is opened after the save;
  the status line updates; turning the switch off stops it; the TODAY line shows when behind and UPDATE ALERTS opens
  the link; non-Android shows none of it; keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-PLAN-FRESH-001/` at 360 px: KEY MOMENT ALERTS status, the TODAY line.
- **Device check (Gavin):** install the new Bridge; turn off "Up for the shift", SAVE, see BEYOND come straight back;
  that alert doesn't fire. Add a task due tomorrow, tap UPDATE ALERTS from TODAY, and get its 16:00 alert. If the
  screen flashes the Bridge for more than a moment, say so: that decides whether the SAVE hand-off stays on by default.

## Decision record
- Ride on existing taps: Chrome needs a tap to open an app, and these taps already mean "I changed something that
  affects alerts".
- A separate no-screen activity, not MainActivity: MainActivity reads Health Connect and shows a screen; this must
  only save and return.
- Not on MARK WORK ENDED or SHIFT DOWN: those are the leave-work ritual, and switching apps there would be a surprise.
- A fingerprint, not a timer: the phone is only "behind" when the plan actually changed.

## Stop and ask Gavin if
- `PlanActivity` can't return to BEYOND without showing a screen on his phone.
- The plan URL is too long for an intent on his phone with 28 days of moments.
- The CI manifest check would need a new permission or service.

## Risks
- **App switch flash:** a no-display activity should return instantly; the device check decides the default.
- **Two Bridge changes in flight:** RUN-CUES-001 and this both bump the Bridge; versions are taken at build time.
- **Wrong plan on the phone:** the fingerprint compares exactly what's sent, and SYNC GARMIN still overwrites it.
