# GRAYSON-REST-ALERT-001 — the rest timer alerts with the phone locked

- **Authorization:** Gavin, 2026-11-27. 21:23 CT: **"2 and 6 we can wait until 1.1"**; 21:28 CT: **"Add to 1.1"**, which
  put "Rest alert with the phone locked" on the Launch 1.1 list in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md). 22:28
  CT, on writing the 1.1 briefs: **"You start here and get ready for a builder to start."** The cue channel is his
  2026-11-24 pick: Health Bridge Android voice and buzz. His standing rule: **"I should be able to edit and tweak or
  correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** A Health Bridge (Android) change: a new cue kind with its own buzz, and a new Bridge build he
  installs. Gavin merges after green CI and a fresh-context reviewer's exact-head PASS posted on the PR.
- **Starting commit:** latest `origin/master` after L1 (GRAYSON-MEAL-LOOKUP-001) merges. Re-fetch before starting.
  Written against `9d83d915`.
- **Builder:** Claude Code, TRAIN lane (the "Project GRAYSON TRAIN builder" chat), which built the run cues and the
  Bridge's cue service (GRAYSON-TRAIN-RUN-CUES-001). Branch `claude/grayson-rest-alert-001`. **Reviewer:** a
  fresh-context reviewer.
- **Order:** row L2 in the Launch 1.1 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md). It is the only Health
  Bridge change open while it's built; X5 (also a Bridge change) has merged by then.
- **Dexie:** none.

## Objective and benefit
He taps DONE on a set, locks the phone and rests. When the rest ends, nothing tells him. Checked in code at `9d83d915`:

- TRAIN buzzes once at rest end only while TRAIN is visible (GRAYSON-TRAIN-REST-001; `TrainScreen.tsx`, the
  `restEndBuzz` effect on `activeRestEndsAt` and the 1 s `nowTick`). That brief left the locked-phone cue to Health
  Bridge.
- The lock-screen set notification (`public/lockscreen-sw.js`, GRAYSON-TRAIN-LOCKSCREEN-001) shows "Rest until 9:42"
  as a clock time, because a web notification can't count down or fire on time.
- Health Bridge already speaks and buzzes timed cues with the phone locked: `RunCueService.kt` is a `health`
  foreground service that takes a cue timeline over the `beyond-bridge://run` link (`runCueUrl` in
  `src/application/runCueBridge.ts`), and the stretch player already reuses it (`stretchCuePayload` in
  `src/application/stretchSession.ts`). Its buzz patterns cover only RUN and WALK (`runCueBuzzPattern` in
  `RunCues.kt`), so a rest end would speak but not buzz. That is the Bridge change.

After this, the rest ends with a buzz and a short spoken line, phone locked or not, with music ducked, the same as his
runs.

## Recommended defaults (approved when Gavin merges this brief)
1. **When it fires.** Each rest that starts from a tap in BEYOND (DONE, a rest ±, SKIP REST) hands the Bridge one short
   timeline. BEYOND sends nothing on load or reload. Chrome opens the link only from his tap, as the run cues do.
2. **What he hears.** At rest end: one buzz, then "Rest's up. Bench press, set 3 of 4, 185 for 8." The line uses the
   next set as TRAIN would log it.
3. **A heads-up.** Off. When on, a short buzz 10 seconds before the end.
4. **Changes keep up.** A rest ± or SKIP REST resends the timeline. Ending the workout, or the last set, sends `end`.
5. **No double buzz.** With the screen on and unlocked, the Bridge stays quiet and TRAIN's own buzz does it, as the
   run cues already do (`screenInUse`).
6. **Timed sets too.** A timed set (plank, carry) with the phone locked ends with "Time. Plank done." through the same
   path.
7. **Lock-screen DONE.** A DONE tapped on the lock-screen notification can't open the Bridge link today (no page is
   running). The builder tries opening it from the service worker's notification action on his phone. If Android
   allows it, those rests alert too. If not, the notification keeps its clock time and the settings card says
   "Rests started from the lock screen show their end time but don't alert."
8. **Calm.** One alert per rest, never repeated, no sound but the voice, nothing sent off the phone. The Bridge holds the
   timeline in memory only and stops itself after the rest, as it does after a run.

## Everything is his to change
A REST ALERT card in TRAIN settings, beside the existing rest buzz switch, with **RESET**: alert on or off, voice on or
off, what the voice says (full line, "Rest's up" only, or buzz only), the heads-up (off, 5, 10 or 15 seconds), and
timed sets on or off.

## Scope
- **Health Bridge:** a `REST` cue kind (or a buzz pattern for the rest-end cue; the builder picks the smaller change)
  with its own buzz pattern, and a lock-screen line "Rest 1:12 · next Bench press set 3". Kotlin tests for the new
  kind's parse, buzz and stop time. Bump the Bridge version.
- **BEYOND:** a pure `restCuePayload(session, rest, nextSet, prefs)` beside `stretchCuePayload`; the link opened inside
  the DONE, ±, SKIP REST, timed-set and END handlers through `runCueOpener`; the settings card; the Bridge-missing
  fallback (`watchBridgeOpened`) leaves TRAIN's own buzz as today.
- **Phone check:** install the new Bridge build, start a workout, tap DONE, lock the phone, and confirm the buzz and voice
  at rest end, with and without music playing. Then try a DONE from the lock-screen notification (default 7).

## Design and locks
- FIELD-AUTHORITY-001: TRAIN's one red action stays DONE. The settings card has none.
- NAV-001: no new tab or screen; the card goes in TRAIN's existing settings.
- BRAND-MARK-003: colours from the existing tokens only.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `RunCueService`, the `beyond-bridge://run` link, `runCueOpener` and `watchBridgeOpened`,
  `stretchCuePayload` as the model, `restStartSeconds` and `activeRestEndsAt`, the rest buzz preference. Pattern:
  Strong and Hevy alert at rest end with the phone locked.
- **OWN:** the rest payload, the new cue kind's buzz, the settings card.
- **BUILD FROM SCRATCH:** none.

## Tests
`restCuePayload` for a plain rest, a changed rest, SKIP and a heads-up; the link opens only inside tap handlers; END
sends `end`; nothing is sent with the alert off; the voice line for a bodyweight and a timed set; the settings card at
320, 360 and 412 px with axe; Kotlin tests as in Scope.

## Excluded
Sounds or chimes, a countdown on a watch, alerts for anything but rests and timed sets, a notification that repeats,
and any change to how rests are timed or remembered.

## Acceptance
On his phone, with the new Bridge installed: DONE, lock the phone, and at rest end he feels one buzz and hears the line;
with TRAIN open on screen he feels TRAIN's buzz only, once; with music playing it ducks and comes back.

## Stop and ask Gavin if
- Opening the Bridge link on every DONE visibly flashes another screen or breaks the back button on his phone.
- Android needs a new permission beyond the run cues' existing ones.

## Decision record
Add `docs/decisions/GRAYSON-REST-ALERT-001.md` with the defaults above and Gavin's authorization lines.
