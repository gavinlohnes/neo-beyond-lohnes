# GRAYSON-ALERT-QUIET-001 — quiet while you sleep, whatever day it is, and one buzz at a time

- **Authorization:** Gavin, 2026-11-24. Backlog row **E14** (CALM, principle 5): "Partly built: alerts already have
  quiet hours and per-kind off switches (BRIDGE-NOTIFY-001, Nov 15). Left: quiet times that follow your sleep plan and
  days off, and one heads-up at a time" (`/mnt/project-files/grayson/BACKLOG.md`, row 14). 05:23 CT: **"Just keep
  pumping out work."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging
  this brief approves the defaults below.
- **Lane: PROTECTED** (notification delivery). Optional fields on the existing alert settings, no table, event or Dexie
  version; no Health Bridge change. The 3-a-day cap and priorities are unchanged. Independent exact-head review, green
  CI; Gavin merges.
- **Starting commit:** `origin/master` `17cda496` or later, with ALERT-KINDS-001 merged. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-alert-quiet`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#14** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  ALERT-KINDS-001 (#13), since both edit `bridgePlan.ts` and Key-moment alerts.

## Objective and benefit
Quiet hours today are one fixed clock window (`KeyMomentAlertSettings.quietFrom/quietTo`; the screen offers 08:00 to
14:00). That fits his sleep after a night shift, but his sleep moves: on days off he sleeps at night, so 08:00 to
14:00 silences his waking hours and leaves his real sleep open. And two alerts due close together buzz twice (the Bridge
shows one notification per moment, `MomentAlerts.kt`).

After this, quiet hours can **follow his sleep**: alerts stay quiet during his usual sleep for that kind of day,
after a shift or on a day off, read from his own Garmin nights. And alerts due within 15 minutes of each other come as
one buzz.

**Benchmark:** none new. The family calendar already places his usual sleep after each shift from the same rhythm
(`familyCalendar.ts`, `sleepRhythm.ts` groups), so this reuses a reading the app trusts.

## Recommended defaults (approved when Gavin merges this brief)
1. **Quiet hours, three choices** in Key-moment alerts: **Off**, **Set hours** (today's window, unchanged), and
   **Follow my sleep**.
2. **Follow my sleep:**
   - On a lived day after a shift, quiet runs from his usual post-shift sleep start to its end (the `WORK` rhythm
     group). On a day off, from his usual day-off sleep (the `OFF` group).
   - Plus a 30-minute margin each side, his to change (0 to 90 minutes).
   - When a kind of day has too few nights for a rhythm group, that day uses his Set hours if he has them, and
     otherwise isn't quiet. The screen says which days are using which: "After shifts: 07:40 to 14:50, from your
     sleep. Days off: your set hours, until Garmin has more nights."
   - **The wake prompt** ("Up for the shift?") is never silenced by Follow my sleep, since it's meant to wake him.
     It's still silenced by Set hours, as today.
   - Starting choice: whatever he has today. Set hours stays Set hours; Off stays Off. Follow my sleep is one tap.
3. **One buzz at a time:** after the cap and priorities run, moments that remain within 15 minutes of each other merge
   into one. It takes the higher-priority kind's title and tap, and its text names the other: "Shift in 30 minutes ·
   also: Reminder, call the vet." The cap still counts each moment, so merging never lets more through.
4. **Words:** Key-moment alerts shows the next quiet time: "Quiet next: 07:40 to 14:50, after Friday's shift."

## Everything is his to change
Off, set hours or follow my sleep; the margin; the set hours themselves; every kind's switch as today.

## Design principles check (Vision, Nov 24)
- **Built around shift:** quiet follows his real sleep on work days and days off. **Calm:** one buzz for things that
  land together. **Always says why:** the screen says where each quiet time comes from.

## Scope
- `domain/common/types.ts` (`KeyMomentAlertSettings`: `quietMode?`, `sleepMarginMinutes?`), `persistence/
  keyMomentAlertsValidation.ts` (an older row reads as Set hours or Off, as it was), `application/keyMomentAlerts.ts`,
  `application/bridgePlan.ts` (per-day quiet windows from the rhythm, the wake exception, the merge step), the
  Key-moment alerts settings in MORE · Work schedule (`ui/screens/more/KeyMomentAlerts.tsx`) (+ css).
- Tests: Follow my sleep silences a moment inside the post-shift sleep and the day-off sleep, and not outside them;
  the margin edges; a kind of day without a rhythm group falls back to Set hours, or to no quiet; the wake prompt isn't
  silenced by Follow my sleep and is by Set hours; two moments 10 minutes apart become one with the higher title, 20
  minutes apart stay two; the cap counts merged moments; an older settings row reads as it was; the Bridge tests still
  pass; 320 px and axe on the screen in each mode.

## Excluded
Replacing a shown notification with the next one (that's a Health Bridge change). Quiet that follows his sleep plan's
nap window. Changing the cap.

## Acceptance
- Phone check: choose Follow my sleep. The screen shows your next quiet time from your sleep after a shift, and your
  day-off sleep. Update the phone: on your next day off, nothing buzzes during your night's sleep.
- Add a task due 10 minutes after the shift alert: one buzz names both.

## Decision record
- His own Garmin sleep, by kind of day, because a fixed clock window can't fit both work days and days off.
- The wake prompt stays, because silencing it in his sleep would defeat it.
- The merge happens after the cap, so it only ever means fewer buzzes.

## Stop and ask Gavin if
- His rhythm groups put a day-off sleep across 16:30, where the lived day turns (the quiet window then needs to split
  across two lived days).

## Risks
- **Missed alert:** a quiet window from a rhythm that's wrong. SLEEP-WRONG-001 lets him set aside a wrong night, and
  the screen shows the window so he can see it.
