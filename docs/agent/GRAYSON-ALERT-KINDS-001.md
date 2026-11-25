# GRAYSON-ALERT-KINDS-001 — two new phone alerts: something coming up, and the caffeine cut-off

- **Authorization:** Gavin, 2026-11-24. Backlog row **C7.3** (CONNECT): "New alert kinds: caffeine cut-off, plan to
  confirm, lead time" (`/mnt/project-files/grayson/BACKLOG.md`, row 37; campaign plan C7.3, "inside the 3-a-day cap
  and its priority order"). 07:02 CT: **"first the hard pieces that other features plug into."** 05:23 CT: **"Just keep
  pumping out work."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging
  this brief approves the defaults below.
- **Lane: PROTECTED** (new alert kinds and notification delivery, as BRIDGE-NOTIFY-001 set). Two values added to
  `KeyMomentKind`; no new table, event or Dexie version; no Health Bridge change (the Bridge shows any kind it's
  handed, `MomentAlerts.kt`). The 3-a-day cap and quiet hours are unchanged. Independent exact-head review, green CI;
  Gavin merges.
- **Starting commit:** `origin/master` `17cda496` or later, with GRAYSON-COMING-UP-001 merged (it adds the lead time
  this reads). Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-alert-kinds`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#13** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  COMING-UP-001 (#12). ALERT-QUIET-001 (#14) edits the same files and goes after it.

## Objective and benefit
The phone's alerts today are five kinds (`bridgePlan.ts`: up for the shift, shift in 30 minutes, shift's done, task
due, eating window open). Two things that matter don't reach him unless he's looking at BEYOND:
- **Something coming up.** COMING-UP-001 lets a task, home job or person's date show early, but only on screen. A
  birthday two weeks out is exactly the thing he'd want one buzz about.
- **The caffeine cut-off.** The sleep plan's CAFFEINE card and TODAY's runway give a cut-off time (`shiftSleepPlan.ts`
  `caffeineAt`), but it usually falls in the middle of a shift, when he isn't looking at the app.

After this, both can reach the phone, inside the same cap and switches as every other alert.

**Plan to confirm** (the backlog row's third kind) is left out: nothing in the app today is a plan waiting for his
confirm, so there's nothing for it to alert about. It can be its own brief once there is.

**Benchmark:** none new. This is the campaign plan's own C7.3 row, under BRIDGE-NOTIFY-001's contract.

## Recommended defaults (approved when Gavin merges this brief)
1. **COMING_UP:**
   - Fires once, on the day an item enters its lead time (COMING-UP-001's `leadDays`), at 16:00 that day, the same
     default time a task alert uses (`taskAlertAt`).
   - At most one a lived day. Two or more items entering on the same day make one alert: "2 things coming up" with the
     soonest named. Tapping it opens PLANS · Coming up.
   - Text: "Coming up: Elle's birthday on Dec 9." Items without a lead time never make one.
   - **On by default,** since he chose each lead time himself. Off with its own switch.
2. **CAFFEINE_CUTOFF:**
   - Fires at the cut-off instant for each shift in the 28-day plan, computed by the same rule as the CAFFEINE card
     (his own hours or the 6-hour default, before his usual sleep after that shift). The builder pulls that rule into
     one pure helper both use, so the card and the alert can't disagree.
   - Text: "Caffeine cut-off: from now it's likely to cut into your sleep after the shift." Nothing in it reads the
     caffeine log (CAFFEINE-LOG-001 keeps the log out of every advice path).
   - **Off by default** (the campaign plan: "if he turned it on"). On with its own switch.
   - It's the only kind allowed during a shift, because that's where the cut-off falls. Quiet hours still silence it.
3. **Priority** (`KIND_PRIORITY`, highest first): before the shift, shift's done, task due, **caffeine cut-off**, up
   for the shift, **coming up**, eating window open. The cut-off sits above the wake prompt because he turned it on
   himself; coming up sits low because TODAY and PLANS already show it.
4. **Settings:** Key-moment alerts lists both kinds with their switches, in that priority order, each with one line
   saying when it fires.

## Everything is his to change
Each kind on or off; quiet hours as today; the cut-off hours (on the CAFFEINE card, as today); each item's lead time
(COMING-UP-001).

## Design principles check (Vision, Nov 24)
- **Calm:** inside the 3-a-day cap; one coming-up alert a day at most; the cut-off off until he turns it on.
  **Always says why:** each alert says what it's for. **Yours to change:** every switch.

## Scope
- `domain/common/types.ts` (`KeyMomentKind`), `persistence/keyMomentAlertsValidation.ts` (`KEY_MOMENT_KINDS`; an older
  saved setting still parses), `application/bridgePlan.ts` (both kinds' moments, `KIND_PRIORITY`, the cut-off's
  on-shift exception in `applyAlertContract`), `application/shiftSleepPlan.ts` (the shared cut-off helper), the
  Key-moment alerts settings in MORE · Work schedule (`ui/screens/more/KeyMomentAlerts.tsx`) (+ css).
- Tests: a coming-up alert on the day an item enters its lead time and not on the next; two items make one alert;
  none without a lead time; the cut-off alert matches the CAFFEINE card's instant for the same shift, default and his
  own hours; it's dropped when off, inside quiet hours, or past the cap by priority; it's the only kind kept on the
  clock; the priority order with all seven kinds; an older settings row still parses with both new kinds in their
  defaults; the Bridge tests still pass with the new kind strings; 320 px and axe on Key-moment alerts.

## Excluded
Plan to confirm. A coming-up alert more than once per item. Changing the 3-a-day cap. Any Health Bridge change.

## Acceptance
- Phone check: give a task due in 8 days a 1 week lead time, then update the phone. Tomorrow at 16:00 the phone says
  "Coming up: …".
- Turn on Caffeine cut-off in Key-moment alerts and update the phone. On the next shift it buzzes at the time the
  CAFFEINE card shows.

## Decision record
- Plan to confirm is left out until there's a plan waiting on his confirm.
- One cut-off rule for the card and the alert.
- The cut-off is off by default and the one kind allowed on the clock, because it's only useful there.

## Stop and ask Gavin if
- Health Bridge refuses or drops a kind it doesn't know (then this needs a Bridge change, and the one-Bridge-change
  rule applies).

## Risks
- **Too many buzzes:** the cap, priority and per-kind switches are unchanged and tested with all seven kinds.
