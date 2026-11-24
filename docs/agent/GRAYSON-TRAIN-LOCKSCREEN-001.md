# GRAYSON-TRAIN-LOCKSCREEN-001 — current set on the lock screen, with DONE

- **Authorization:** Gavin, 2026-11-24. Backlog row **C7.5** (DELIGHT, ranked 50th), campaign plan C7.5: "Ongoing
  notification with current set and rest timer during a live workout. Done when: starts and ends with the workout;
  set done from the notification logs through the existing command" (`docs/GRAYSON_CAMPAIGN_PLAN.md:831`). At 04:38
  CT: **"Now let's start giving Claude stuff to work on. Work on finishing train"**. His rule: **"I should be able to
  edit and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** A new notification kind, a two-way path from a notification into a logged set, and a new
  service-worker handler. No Engine, recommendation, TODAY, Dexie version or Android change. Independent exact-head
  review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `e43ba36`. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-train-lockscreen-001`. Reviewer: Grok Bot. **Active PR:** pending.
- **Order and overlap:** last in Claude Code's TRAIN queue, after TRAIN-EDIT-001 (so a set logged from the lock
  screen can be corrected like any other) and NOTES-001. Shares `TrainScreen.tsx`; rebase on whichever merges first.

## Objective and benefit
Between sets his phone is locked in his hand or pocket. The lock screen shows "Leg Press · set 2 of 3 · 180 × 10"
with **DONE** and **SKIP**. One tap logs it exactly as the LOG button would, and the notification moves on to "Rest
until 3:44 PM · next: Leg Press 180 × 10". He opens BEYOND only to change a weight.

**Benchmarks:** Hevy offers Wear OS logging and "Customize automatic rest timers" on Android
([Hevy on Google Play](https://play.google.com/store/apps/details?id=com.hevy), read 2026-11-24; SCORECARDS H24);
its listing says nothing about a phone lock-screen workout, so GRAYSON's own campaign plan sets this one. Chrome
lets a web app's notification carry action buttons that "don't have to open up a new window", read through
`event.action` in `notificationclick`, with "only ... two actions on each notification"
([Chrome notification actions](https://developer.chrome.com/blog/notification-actions), 2016, older guidance).

## Why the web app and not Health Bridge
BEYOND is a PWA. Health Bridge has no way to write a set into BEYOND except the share sheet, and every share opens a
preview that waits for confirmation ("nothing imports by itself", `public/share-target-sw.js`). A notification shown
by BEYOND's own service worker can record the tap inside BEYOND itself, so no second app and no new Android
permission. Run cues stay in Health Bridge (RUN-CUES-001) because speech and timing need a foreground service; a set
list doesn't.

## Recommended defaults (approved when Gavin merges this brief)
1. **Off until he turns it on:** a **LOCK SCREEN** switch in Gym mode / the live workout, "Show the current set on
   your lock screen". The first time, it asks for notification permission with the existing helper
   (`persistence/checkInReminder.ts:71`). Remembered for next time.
2. **What it shows:** exercise, set number of total, the planned weight × reps (what the LOG button would save), and
   during rest "Rest until 3:44 PM" (a clock time, because a web notification can't count down by itself).
3. **Two buttons:** **DONE** logs the planned set; **SKIP** records it skipped. Tapping the notification body opens
   BEYOND at that set. No weight or rep editing on the lock screen.
4. **How a tap is logged:** the service worker parks the tap (`{ sessionId, exerciseId, setNumber, weight, reps,
   kind: "DONE" | "SKIP", tappedAt }`) in Cache Storage, the same way share-target parks files, advances its own copy
   of the plan, and shows the next set. When BEYOND next runs (opened, or already open in the background and woken by
   a service-worker message), it applies parked taps in order through the existing `logSet` and skip commands
   (`application/trainCommands.ts:142`), then clears them. So every set still goes through the one command, with its
   validation.
5. **Rest after DONE:** starts from `tappedAt`, the same rest length the app would use, written to the session as the
   app would.
6. **Ends with the workout:** COMPLETE or abandoning the workout closes the notification; so does a workout older
   than 4 hours with no taps.
7. **Gate on his phone:** if the device check shows the buttons can't be used without unlocking, the notification
   stays as a read-only "what's next" line with the body tap, and the PR says so plainly. No workaround.

## Everything is his to change
- The switch, per device. DONE and SKIP are on by default; he can hide SKIP.
- Any set logged from the lock screen shows in the workout like a set logged in the app and is corrected the same
  way (TRAIN-EDIT-001). A note "from lock screen" stays on the set so he can tell.
- Preference in `localStorage` `beyond.lockScreenSets.v1` (`{ on, showSkip }`), validated, in `TRAVELLING_SETTINGS`.

## Design principles check (Vision, Nov 24)
- **Yours to change:** switch, SKIP button, every logged set correctable. **One tap for the usual:** DONE.
- **Built around shift:** works in any gym, offline. **Calm:** off until he turns it on; one ongoing notification, no
  sound (`silent: true`), replaced in place by `tag`. **Always says why:** "Rest until 3:44 PM" names what it's
  waiting for. **Simple first:** two buttons.

## Scope
- `public/lockscreen-sw.js` (new, loaded with `importScripts` beside `share-target-sw.js`): shows and replaces the
  notification, handles `notificationclick` and `notificationclose`, parks taps, messages open clients.
- `src/application/lockScreenSets.ts` (new): builds the plan snapshot the worker shows, and `applyParkedTaps()`.
- `src/ui/screens/train/` (GymMode / live workout): the switch; sends the snapshot on start, after each in-app log,
  and on finish; calls `applyParkedTaps()` on open and on `visibilitychange`.
- `vite.config.ts`: add the new script to `importScripts`.

## Excluded
- Editing weight or reps on the lock screen, rest countdown that ticks, sound, Wear OS, Garmin, runs (RUN-CUES-001),
  Health Bridge changes. Push from a server: everything stays on the phone.

## Acceptance
- `tests/lockScreenSets.test.ts`: snapshot for workout A lists every planned set; parked DONE and SKIP apply in tap
  order through `logSet`/skip and clear; a tap for a finished or other session is dropped, never logged; a tap twice
  for the same set logs once; rest starts at `tappedAt`. Run under `TZ=UTC` and `TZ=America/Chicago`.
- A worker test (vitest with a fake `self.registration`) covers show, replace by tag, DONE advancing to the next set,
  and close on finish.
- Browser tests: switch off by default; on asks permission once; finishing closes the notification; parked taps show
  as sets when the page becomes visible.
- Screenshots at 360/320/412: the switch, and a set marked "from lock screen".
- **Device check (Gavin):** lock the phone mid-workout, tap DONE twice and SKIP once without unlocking, open BEYOND:
  three sets in order with the right times; finishing clears the notification. Record whether Android asked to
  unlock before the buttons worked.

## Decision record
- Web app notification over Health Bridge, so a tap lands in BEYOND without a confirm screen and with no new Android
  permission.
- Parked taps applied through `logSet`, so the lock screen never has its own way of writing a set.

## Stop and ask Gavin if
- `logSet` can't be called with the original tap time without changing its signature.
- His phone needs unlocking for the buttons (default 7 decides what ships; ask if he wants a different fallback).
- `Notification.maxActions` is below 2 on his phone.

## Risks
- **Older guidance:** Chrome's actions page is from 2016; behaviour may have changed. The device check settles it.
- **Plan drift:** if he changes the plan in the app while the notification is up, the app must resend the snapshot;
  a tap against an old snapshot is still checked against the live session before logging.
