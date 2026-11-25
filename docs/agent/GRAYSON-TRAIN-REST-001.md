# GRAYSON-TRAIN-REST-001 — buzz when rest ends

- **Authorization:** Gavin, 2026-11-24. Backlog row **B2** (DELIGHT, ranked 2nd), from the ranked backlog he
  approved. His rule (01:26 CT): **"I should be able to edit and tweak or correct everything in this app."**
  At 01:56 CT: **"Let's get after it."** Merging this brief is his approval of the defaults below; Codex builds
  it once it merges.
- **Lane: FEATURE.** UI only: a vibration at the end of rest, a one-time visual cue and an on/off preference in
  localStorage. No domain event, no stored record, no Engine, persistence schema, Dexie, Android, permission,
  notification or navigation change.
- **Starting commit:** `origin/master` `7e61e02`. Re-fetch before starting.
- **Builder:** Claude Code (TRAIN while Codex is offline; Gavin, 04:38 CT: "Work on finishing train"). Was Codex; no
  Codex branch or PR existed. Branch `claude/grayson-train-rest-001`, from `e43ba36`. Reviewer: Grok Bot.
  **Active PR:** linked in GitHub once opened.
- **Order:** small enough to build alongside or after GRAYSON-TRAIN-RUN-001 (#640). Both touch
  `TrainScreen.tsx`, and so does GRAYSON-TRAIN-EDIT-001 (#642): whichever builds second rebases. Keep the edit
  to `TrainScreen.tsx` to the rest block. While other PRs are open, leave the tracker and checkpoint to the
  oldest open PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

Today rest is silent (Parity Scorecards row H8): the countdown (`TrainScreen.tsx:1146`) flips to
"REST COMPLETE" and nothing tells him, so he watches the phone between sets. After this, the phone buzzes once
when rest reaches zero, while TRAIN is open with the screen on. Gym mode already holds the screen awake
(`GymMode.tsx:320`), so in the gym that is the whole rest.

**Benchmark:** Hevy's rest timer: "Once it counts down to zero, Hevy notifies you it's time for the next set",
with ±15 s during rest; its settings let you pick the timer sound and set its volume to "off, low, normal, or
high" (hevyapp.com/features/workout-rest-timer/ and /features/workout-settings/, read 2026-11-24). Neither page
mentions vibration. We copy the idea (a cue at zero that you can tune or turn off), not any asset. Sound and a
buzz with the phone locked are not in this brief: the locked-phone cue is B3 (Health Bridge).

## Recommended defaults (approved when Gavin merges this brief)

1. **On by default.** One buzz when rest reaches zero, in a pattern that's distinct from the save tap
   (suggested `[200, 100, 200]` ms against the 10–35 ms commit pulses in `feedback.ts`).
2. **Once per rest.** A rest that is skipped never buzzes. If he adds 15 s after zero, the new end buzzes once.
   A rest that ended while the app was closed or the screen was off doesn't buzz late when he comes back.
3. **Live only.** It buzzes only when the end is seen within a few seconds of it happening, with TRAIN open
   and visible. No background timer, no notification.
4. **His to change (principle 1):** an on/off switch, **Buzz when rest ends**, in two places: on the expanded
   rest widget (one tap, so he can silence it mid-workout) and in MORE settings beside the check-in reminder.
   Plus a strength choice, **Short** or **Long** (Long is `[400, 150, 400]`). The preference travels with the
   native backup like the other training preferences.
5. **Reduced motion:** the buzz still fires when the phone asks for reduced motion, because vibration isn't
   on-screen motion and this one is the alert he chose. The visual cue below follows reduced motion. The switch
   is how he silences it.
6. **On screen too (principle 6):** at zero the rest label already reads "REST COMPLETE"; it also gets a single
   short highlight (none under reduced motion), and the `role="status"` line announces it once for screen
   readers.
7. **The PR tag stays quiet:** no buzz, sound or new cue on a personal record.

## Design principles check (Vision, Nov 24)

1. Yours to change: on/off and strength, from the rest widget or MORE.
2. Undo, don't ask: no dialog; the switch takes one tap either way.
3. One tap for the usual: nothing to set up; it just works on the first rest.
4. Built around your shift: not affected.
5. Calm: one buzz per rest, never repeated, never in the background, never for a PR.
6. Always says why: the "REST COMPLETE" label says what the buzz meant.
7. Simple first: the switch sits in the expanded rest widget, not on the compressed line.
8. Tap or say it: not affected.

## Scope

- `src/ui/feel/restEndBuzz.ts` (new): `restEndBuzz(strength)`, best effort through `navigator.vibrate`, never
  throws, no check for reduced motion (default 5). `feedback.ts` stays as it is.
- `src/persistence/restBuzzPreference.ts` (new): `{ enabled: boolean, strength: "SHORT" | "LONG" }` in
  localStorage under `beyond:restBuzzPreference`, read safely like `restMemory.ts`, default `{ enabled: true,
  strength: "SHORT" }`. Read and written through a small application module, as `checkInReminderQueries.ts`
  does for the check-in reminder.
- `src/persistence/settingsTransfer.ts`: add `"beyond:restBuzzPreference": "Rest timer buzz"` to
  `TRAVELLING_SETTINGS`.
- `src/ui/screens/train/TrainScreen.tsx`, rest block only: detect the crossing from resting to complete once
  per `activeRestEndsAt` (a ref holding the last buzzed end), only when `document.visibilityState` is
  `"visible"` and the crossing is within about 3 s of the end; call `restEndBuzz`; the one-time highlight; the
  switch in the expanded widget. The 1 s `nowTick` interval (line 336) stays as the clock.
- `GymMode.tsx`: the same "REST COMPLETE" highlight on its rest line (line 188); no new logic there, the
  crossing is detected once in `TrainScreen.tsx`.
- `src/ui/screens/more/MoreScreen.tsx`: the switch and strength beside the check-in reminder.

## Excluded

Sound; a buzz or alert with the phone locked or TRAIN closed (B3, Health Bridge); a notification; a
per-exercise buzz setting; countdown buzzes before zero; any change to rest length, rest memory or how rest
starts; any cue for personal records.

## Files

- **In scope:** the two new files above, the small application module, `settingsTransfer.ts` (one allowlist
  line), the rest block of `TrainScreen.tsx`, `GymMode.tsx` (rest line only), `MoreScreen.tsx` (one settings
  row), CSS for the highlight in `trainLive.css`, tests, `docs/agent/screenshots/GRAYSON-TRAIN-REST-001/`.
- **Off limits:** `src/domain/**`, `src/engine/**`, `src/persistence/db.ts`, `feedback.ts`, `restMemory.ts`
  (both files), rest commands in `trainCommands.ts`, `android/**`, `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** the absolute `activeRestEndsAt` clock and `nowTick`; the existing "REST COMPLETE" label; the
  localStorage preference pattern of `restMemory.ts` and `checkInReminder.ts`; the `TRAVELLING_SETTINGS`
  allowlist; Gym mode's existing wake lock; the `navigator.vibrate` approach of `feedback.ts`.
- **OWN:** the once-per-rest crossing rule, the buzz patterns, the preference and its two switches.
- **BUILD FROM SCRATCH:** nothing; no library.

## Acceptance

- `tests/restEndBuzz.test.ts`: the crossing fires once per `activeRestEndsAt`; skip never fires; +15 s after
  zero fires once at the new end; a crossing seen more than ~3 s late doesn't fire; a hidden page doesn't fire;
  off means never; Short and Long send their patterns; a missing or throwing `navigator.vibrate` is harmless;
  reduced motion still buzzes but shows no highlight.
- `tests/browser/RestBuzz.test.tsx`: log a set, let rest end (fake timers), see one vibrate call and the
  status announcement; turn it off from the rest widget and see none on the next rest; change it in MORE; the
  preference survives a native backup round trip; keyboard only; 320/360/412 px no overflow; axe clean.
- Existing TRAIN, Gym mode and feedback tests stay green. New tests fail on master. `typecheck`,
  `check:architecture`, `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-REST-001/` at 360 px (key ones also 320 and 412):
  the expanded rest widget with the switch, REST COMPLETE with its highlight in TRAIN and in Gym mode, the MORE
  settings row.
- **Device check (Gavin, Android):** start a workout in Gym mode, log a set, put the phone down and feel the
  buzz at zero; tap +15 after zero and feel it again; switch to Long; turn it off from the rest widget. Then
  KEEP / REFINE / RETHINK.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-TRAIN-REST.md`, as TIMEBOX-001 and C4.1 did
(DEV-FLOW-002, 2026-11-23 amendment).

## Stop and ask Gavin if

- the work needs a notification, a background timer, a service worker change or an Android permission;
- it needs sound;
- it would change rest length, rest memory, how rest starts, or the existing commit pulses in `feedback.ts`;
- it needs a stored record or a domain event;
- the buzz can't be kept to once per rest without changing the 1 s rest tick.

## Risks and checks

- **Vibration support:** Android Chrome supports it; some browsers ignore it. The on-screen cue still shows.
- **Late buzz:** the ~3 s window keeps a rest that ended while the screen was off from buzzing on return.
- **Battery:** no new timer; the existing 1 s tick runs only while resting.
- **Size:** S.
- **Stale facts to recheck at build time:** line numbers above, the `TRAVELLING_SETTINGS` list, and open PRs.
