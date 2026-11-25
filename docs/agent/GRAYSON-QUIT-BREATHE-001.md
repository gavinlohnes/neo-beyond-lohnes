# GRAYSON-QUIT-BREATHE-001 — a paced breathing guide inside the quit tracker, for the moment an urge hits

- **Authorization:** Gavin, 2026-11-25. At 8:41 PM CT: **"I was just looking at the NHS apps. I think they have a lot
  of good things we could add to the Project... Weight loss, stop smoking, getting active and the stop drinking
  app."** Then: **"Those are all fantastic ideas. I think they are all worth using."** At 8:48 PM CT he said **"Yes"**
  to four briefs, with the breathing guide as a small add-on to the quit tracker. His rule: **"I should be able to
  edit and tweak or correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (one new event type, `URGE_BREATHING_DONE`). No new table, no Dexie version, no Engine or Delta
  change. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `f8762f93` or later. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-quit-breathe`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#8** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  BRISK-001. It shares no files with BRISK-001, so it can go first while BRISK-001 waits on his phone check.

## Objective and benefit
The quit tracker (BODY · LOG · QUIT TRACKER, `ui/screens/body/QuitTracker.tsx`) already logs an urge with one tap by
what set it off, offers UNDO, and shows his own if-then plan for that trigger with PLAN USED or NOT THIS TIME. It has
nothing to do in the minute the urge is actually happening, other than read his plan.

After this, the tracker has **BREATHE**, a paced breathing guide that runs for a few minutes on the screen. It shows
first, right after an urge is logged, and is always there below the urge chips. When he finishes or stops, the tracker
keeps a note that he used it, so over time it can show whether breathing is something he reaches for.

**Benchmark (read 2026-11-25):** NHS Quit Smoking's version history (4.25) adds "a brand new feature to help you
manage your cravings, called 'and breathe!'"
([App Store, NHS Quit Smoking](https://apps.apple.com/gb/app/nhs-quit-smoking/id687298065), version 5.6.1). That page
doesn't say how it works, so the pacing comes from the NHS's own exercise: "Breathe in gently and regularly. Some
people find it helpful to count steadily from 1 to 5", then "let it flow out gently, counting from 1 to 5 again", and
"Repeat for at least 5 minutes"
([NHS, Breathing exercises for stress](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/),
last reviewed 12 June 2026). **What we copy:** a breathing tool for cravings, paced 5 in and 5 out for 5 minutes.
**What we add:** it opens from the urge he just logged, and every count is his to change. **What we keep out:** any
health claim about what it does, badges, streaks, and a score.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** in the quit tracker. Right after an urge is logged, **BREATHE** sits first, above his plan. It also sits
   under the urge chips at all times, so he can use it without logging an urge. Nothing on TODAY, no alert.
2. **The guide:** a full-screen sheet with one circle that grows while it says **Breathe in** and counts 1 to 5,
   then shrinks while it says **Breathe out** and counts 1 to 5. One line under it: "In through your nose, out through
   your mouth." A time left line and **STOP**. At the end: "5 minutes done." with **DONE**.
3. **Pace and length (his numbers):** breathe in 5 seconds and out 5 seconds (each 3 to 8), for 5 minutes (1 to 10).
   They're set from a small **ADJUST** link on the sheet and kept as a device setting in `TRAVELLING_SETTINGS`
   ("Breathing pace"), with reset to the NHS pace.
4. **Reduced motion:** with `prefers-reduced-motion` the circle doesn't move; the words and the count carry the pace.
5. **Buzz:** a short buzz at each switch between in and out, **off by default**, one switch on the sheet. It works
   where the browser can vibrate (Android); elsewhere the switch says "This phone can't buzz from here."
6. **The screen stays on** while the guide runs (Screen Wake Lock where available), and is released at STOP or DONE.
7. **The note:** when he finishes, or stops after at least 30 seconds, one `URGE_BREATHING_DONE` event is written:
   `{ commandId, seconds, urgeEventId? }`, with the urge's id when he opened it from a logged urge. Under 30 seconds
   nothing is kept. It's a routine log, so it shows no UNDO (his Nov 24 undo pick); he can remove it from History
   through the existing removal pattern (`domain/logVoids.ts`), and that removal shows UNDO.
8. **What the tracker shows:** one line under today's urges: "Breathing used 3 times this week." Counted, never
   judged.

## Everything is his to change
The in, out and total times, with reset; the buzz; whether BREATHE shows first after an urge (one switch under ADJUST,
on by default). Every breathing note, removable from History with undo.

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** BREATHE opens from the urge he just logged. **Yours to change:** every count and the
  buzz. **Calm:** inside the tracker only, no alert, buzz off by default. **Always says why:** the pace is the NHS's,
  and ADJUST says so. **Simple first:** one circle, one count.

## Scope
- `domain/common/types.ts` (`URGE_BREATHING_DONE` and its payload), its payload schema, `logVoids.ts` (the event joins
  the removable logs), `application/quitCommands.ts` (`logBreathing`), `application/quitQueries.ts` (the week's
  count), `ui/screens/body/QuitTracker.tsx`, a new `BreathingGuide.tsx` (+ css), `ui/screens/history/historyCopy.ts`.
- Tests: the in, out and total times drive the count and the end; reduced motion keeps the count with no animation;
  STOP under 30 seconds writes nothing and at 30 or more writes one event with its seconds; an urge-opened run carries
  the urge id; the week's count; removal from History and its UNDO; wake lock taken and released (mocked); old events
  parse; native backup round-trip; 320 px and axe on the sheet.

## Excluded
Breathing anywhere else (check-ins, SHIFT DOWN, Delta) for now. Sound or voice. Any claim that it reduces cravings.
Asking whether it helped. Delta reading the note (it would follow DELTA-READS-001's rows if added later).

## Acceptance
- Phone check: log an urge. BREATHE shows first. Open it: the circle and the count run 5 in, 5 out. STOP at about a
  minute: the tracker says "Breathing used 1 time this week."
- ADJUST to 4 in and 6 out for 2 minutes: the guide follows and ends at 2 minutes with "2 minutes done."
- Turn on reduce motion in the phone's settings: the circle stays still and the count still runs.

## Decision record
- The NHS's own 5-in, 5-out, 5-minute exercise, because the quit app's page doesn't describe its own.
- Kept as an event so the tracker can count it, with 30 seconds as the floor so a mis-tap isn't a record.
- Buzz off by default, so the guide is quiet unless he asks for it.

## Stop and ask Gavin if
- Screen Wake Lock isn't available in the installed app and the screen sleeps mid-guide.
- The quit tracker has no habit set up on his phone (BREATHE then has nowhere to show; it should not create one).

## Risks
- **Health claims:** the copy says what to do, never what it will do.
- **Clutter:** one button in a tracker he opens on purpose.
