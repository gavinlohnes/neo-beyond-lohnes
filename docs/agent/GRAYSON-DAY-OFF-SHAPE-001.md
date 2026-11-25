# GRAYSON-DAY-OFF-SHAPE-001 — a rough shape for a day off that you accept, change or ignore

- **Authorization:** Gavin, 2026-11-24. Backlog row **C3.3** (CONNECT, SHAPE): "Day-off shape you accept or change"
  (`/mnt/project-files/grayson/BACKLOG.md`, row 16; campaign plan C3.3). 07:02 CT: **"first the hard pieces that
  other features plug into"** (B17, days off with Elle, plugs into this). 05:23 CT: **"Just keep pumping out work."**
  His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves
  the defaults below.
- **Lane: PROTECTED** (TODAY composition). Plan items through the existing path only; no new table, event or Dexie
  version; Engine eligibility unchanged. Independent exact-head review, green CI; Gavin merges. It counts as the one
  TODAY change open at a time.
- **Starting commit:** `origin/master` `9c48e2e7` or later. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-day-off-shape`, or the branch
  name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#15** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after the
  alert briefs (#13, #14), and after COMING-UP-001 (#12), whose lead time it reads.

## Objective and benefit
On RUN OVER, TODAY already offers the recovery contract (`recoveryContract.ts`, `RecoveryContract.tsx`): sleep first,
easy training or rest, a light day, saved as plan items only on CONFIRM. Other days off get "A day off" and what's due
(`orientation.ts`), and "PLAN MY DAY OFF WITH ALFRED" in PLANS (`PlanTodayScreen.tsx`), which needs Delta.

After this, every day off can show one **Shape today?** card with a rough day: recovery when he needs it, one house
thing, something with someone he picks if he turned that on, and the open time left. He keeps it in one tap, takes
items off, or ignores it. Nothing is written until he taps.

**Benchmark:** none new. The campaign plan's own C3.3 row, which keeps open time as "a real block, never a gap to
fill".

## Recommended defaults (approved when Gavin merges this brief)
1. **When:** on a day off's TODAY, once per lived day, until he keeps it or taps NOT TODAY. On RUN OVER it replaces the
   recovery contract card, with the contract as its recovery part, so there's one card, not two.
2. **What it offers** (each a row he can take off):
   - **Recovery:** on the first day off after a run, the recovery contract's three items. On later days off, "Easy
     day or rest" only if the last check-in's energy was 2 or less; otherwise no recovery row.
   - **One house thing:** the soonest due or coming-up home job (COMING-UP-001's lead time), with its name. None when
     nothing is due or coming up.
   - **Training:** "Train: Workout B" with the next workout from TRAIN's programme (`getPlanningTrainingConnection`,
     status READY), when he hasn't trained today. Not on the first day off after a run, where the contract already says
     easy training or rest. The programme doesn't change.
   - **Something with someone:** **off by default.** When he turns it on in MORE · TODAY, he picks the person from
     People, and the row reads "Time with [name]". It reads nothing about that person's schedule (B17 is that).
   - **Open time:** a line, not a task: "About 6 hours open after this." It's worked out from his waking hours on a day
     off (his usual day-off sleep, or 08:00 to 22:00 when there's no rhythm yet) minus each item's estimate.
3. **KEEP THIS:** writes the rows he left on as plan items for today through the existing plan-item path, each with
   plannedAt only (no due date). Home jobs he already has are planned, not copied. UNDO removes them.
4. **NOT TODAY** hides the card for that lived day. **Off for good** in MORE · TODAY.
5. **No Delta needed:** every row comes from his records. PLAN MY DAY OFF WITH ALFRED stays as the deeper option.

## Everything is his to change
Each row on the card; the person, or none; the card on or off; every kept item as a normal plan item.

## Design principles check (Vision, Nov 24)
- **Asks nothing:** the shape is ready when he opens TODAY. **One tap for the usual:** KEEP THIS. **Calm:** one card,
  open time shown as his, never filled. **Yours to change:** every row.

## Scope
- `application/dayOffShape.ts` (pure: the rows from schedule, life state, recovery contract, home jobs, TRAIN's next workout,
  the last check-in, the sleep rhythm), `recoveryContract.ts` (shared items), a `keepDayOffShape` command through the
  existing plan-item path, the TODAY card replacing `RecoveryContract.tsx` on RUN OVER, the MORE · TODAY switches.
- Tests: the card on a day off and not on a work day; once per lived day; on RUN OVER the contract's items; the
  recovery row's energy rule; the house thing is the soonest due or coming up; no person row until he turns it on;
  open time math, with and without a rhythm; KEEP THIS writes plannedAt-only items and UNDO removes them; nothing is
  written without KEEP THIS; Engine eligibility unchanged (a test like SHIFT-SLEEP-PLAN-001's); works with Delta off;
  320 px and axe.

## Excluded
Reading Elle's or anyone's calendar (B17). Booking anything. Changing the training programme. A shape for work days.

## Acceptance
- Phone check: on a day off, TODAY shows Shape today? with a house thing that's due and the open time. KEEP THIS:
  PLANS lists them for today. UNDO: they're gone.
- On the first day off after a run, the card holds the recovery contract and there's no second card.

## Decision record
- One card on RUN OVER, so the contract and the shape never compete.
- Open time is shown, never filled, as the campaign plan set.
- The person row is off by default and reads no one's data.

## Stop and ask Gavin if
- TODAY-CALM-001's card order has no place for the card without moving a locked card.

## Risks
- **A day that feels planned for him:** every row is his to take off, and NOT TODAY hides it all.
