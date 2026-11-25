# GRAYSON-TEACH-DEFAULTS-001 — after the same fix three times, Delta offers to change your number

- **Authorization:** Gavin, 2026-11-24. Backlog row **E10** (LEARN): "Corrections teach defaults: after the same fix
  three times, Delta offers to change the default, applied only on your tap" (`/mnt/project-files/grayson/BACKLOG.md`
  row 10). 07:56 CT: **"Lets knock out the hard ones. Do what's best."** 8:18 PM CT: **"What's the next best move?
  ... I want to work in the best possible way."** His rule: **"I should be able to edit and tweak or correct
  everything in this app."** North Star: "know me increasingly well while asking increasingly little." Merging this
  brief approves the defaults below.
- **Lane: PROTECTED** (Delta behaviour; it proposes changes to numbers the Engine reads). It adds no Engine logic. A
  number changes only on his tap, through YOUR-NUMBERS-001's store and its change log. No new table or Dexie version.
  Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` after **YOUR-NUMBERS-001 (both slices) and NOT-RIGHT-001 have merged**. Re-fetch
  before starting.
- **Builder:** Claude Code. Branch `claude/grayson-teach-defaults-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#12** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after NOT-RIGHT-001.
- **Next to it:** C6.5 (#701) already turns three declines with the same reason into a Delta learning that Delta asks
  him about. This brief leaves C6.5 as it is. It covers fixes that point at **one of his numbers**, and offers the
  number itself.

## Objective and benefit
GRAYSON uses about 22 numbers about him (YOUR-NUMBERS-001). Each one can be wrong for him, and today he shows it by
fixing the result again and again: he moves the AFTER SHIFT time on his logs, he does the full workout after TRAIN
offered the shorter one, he bumps the rest timer on every new exercise. Each fix is a small ask the app keeps making.

After this, when the same kind of fix happens three times, Delta offers to change the number behind it once, says
why with the dated fixes, and changes it only on his tap. Then the fix stops being needed.

**Benchmark (read 2026-11-25):** Monarch Money: "A rule widget appears automatically when you make any changes to a
transaction anywhere in Monarch", and nothing is saved until he selects **Create rule** and then **Save**; rules are
kept in Settings > Rules ([Monarch, Creating Transaction Rules](https://help.monarch.com/hc/en-us/articles/360048393372)).
**What we copy:** offering to turn a manual fix into a lasting setting, saved only on a tap, and kept where he can
change it. **What we add:** waiting for three of the same fix so it isn't a prompt after every edit, and showing the
fixes that led to it. **What we keep out:** anything changing by itself; a prompt after a single fix.

## Recommended defaults (approved when Gavin merges this brief)
1. **Four kinds of fix, each tied to one number** (`application/teachDefaults.ts`, pure over stored data):
   - **AFTER SHIFT time moved** → `afterShiftLogMinutes`. A water, protein or meal log placed by AFTER SHIFT (its first
     time is exactly the shift end plus his current number) and then moved by `LOG_RETIMED`. Three within 30 days, on
     three different lived days. Offer: the median of his moved times, as minutes after shift end, rounded to 15 and
     kept inside the number's range.
   - **Did the full workout after TRAIN offered the shorter one** → `shortSleepNights`. The day's issued
     recommendation carries the short-sleep fact (`traceShortSleepStreak`) and the session he finished was STANDARD.
     Three within 30 days. Offer: his number plus one (2 → 3), inside its range.
   - **Rest timer settled away from the starting rest** → `startingRestSeconds`. Three or more exercises in rest
     memory sit 30 s or more from the starting rest, all on the same side. Offer: their median, rounded to 15.
   - **"Doesn't fit me" on a Why that reads one of his numbers** → that number. Three NOT-RIGHT corrections with the
     same `surface` and `key`, chip "Doesn't fit me", within 60 days, on a trace whose `numbers` lists exactly one id.
     Offer: open that number on MORE · Your numbers with its stepper; no value is guessed, because "doesn't fit"
     doesn't say which way.
   - `WhyTrace` gains an optional `numbers?: string[]` (the your-number ids its rule read), passed by the builders that
     read one. A trace without it never makes an offer.
2. **Where it shows:** one row at the top of MORE · Your numbers, "Delta suggests", and one item in the weekly
   "What I think I'm learning" (C6.2), inside that list's existing budget. Nothing on TODAY, no alert.
3. **What it says:** the number, his current value, the offer, and the fixes with dates, for example: "You moved
   AFTER SHIFT later on Nov 12, Nov 18 and Nov 23, to about 90 minutes after your shift. Change AFTER SHIFT from 60
   to 90 minutes?"
4. **His choices:**
   - **CHANGE TO 90** writes through YOUR-NUMBERS-001's store (one entry in its change log, source "Delta suggested")
     and shows **UNDO**, since it's a fix (his Nov 24 undo pick).
   - **NOT NOW** hides it until three more of the same fix land after today.
   - **DON'T ASK ABOUT THIS** stops offers for that number. It's listed on the page under "Delta won't suggest", with
     **ASK AGAIN**.
5. **One at a time:** at most one offer shows per number. When two are ready, the one with the most recent third fix
   shows first.
6. **Delta:** an offer is built from his own records, never from Alfred. Alfred sees nothing new, and the offer works
   with Alfred off.

## Everything is his to change
Every offer (take it, leave it, stop it, ask again), the number itself on its page, and one switch for the whole
thing on MORE · Your numbers, on by default. The thresholds (three fixes, 30 or 60 days) are shown on the page as
"Delta asks after 3 of the same fix in 30 days"; they become his own numbers in YOUR-NUMBERS' next slice, not here.

## Design principles check (Vision, Nov 24)
- **Fix, don't ask:** a repeated fix becomes one offer, then no more fixes. **Always says why:** every offer lists the
  dated fixes. **Yours to change:** applied only on his tap, with undo, and he can stop any offer. **Calm:** no alert,
  nothing on TODAY. **One tap for the usual:** CHANGE TO. **Simple first:** four kinds of fix, each to one number.

## Scope
- `application/teachDefaults.ts` (detect, rank, offer), `persistence/teachDefaultsSettings.ts`
  (`beyond.teachDefaults.v1`: `{ on, notNow: { [numberId]: lastFixAt }, never: string[] }`, in `TRAVELLING_SETTINGS`
  as "Delta suggests your numbers").
- `domain/intelligence/types.ts` (`WhyTrace.numbers?`), the trace builders that read a your-number pass it.
- YOUR-NUMBERS-001's writer gains a `source` on each change ("You", "Delta suggested", "Reset").
- UI: MORE · Your numbers (the row, "Delta won't suggest", the switch), the weekly learning list item.
- Tests: each kind fires on exactly three and not two; fixes on the same lived day count once; the 30-day and 60-day
  windows; the AFTER SHIFT match uses the number in force at the time; offers stay inside each number's range;
  NOT NOW waits for three new fixes; DON'T ASK holds across restarts and backups; CHANGE TO writes one change-log entry
  and UNDO restores it; a trace with no `numbers` or more than one never offers; nothing changes without a tap;
  320 px and axe on the row.

## Excluded
Changing a number without his tap. Offers from C6.5 decline reasons (they stay Delta learnings). Numbers that aren't
on the Your numbers page. Food targets and calorie proposals (they have their own flow). Making the "three fixes"
rule editable (YOUR-NUMBERS' next slice).

## Acceptance
- Phone check: log water with AFTER SHIFT on three days and move each to about 90 minutes after the shift. MORE · Your
  numbers shows the offer with the three dates; CHANGE TO 90 changes it; the next AFTER SHIFT log lands at 90; UNDO
  puts 60 back.
- Do the full workout three times after TRAIN offers the shorter one: the offer is "Short nights in a row: 2 → 3".
- DON'T ASK ABOUT THIS: the offer is gone and listed under "Delta won't suggest".

## Decision record
- Three of the same fix, because one or two can be a one-off, and C6.5 already uses three.
- The value offered comes from his own fixes (median) where they say which way, and is never guessed where they don't.
- It writes through YOUR-NUMBERS' one store, so the page and its history stay the single record.

## Stop and ask Gavin if
- A fix kind can't be told apart from an ordinary edit in the stored data.
- A number's offer would fall outside its range.
- YOUR-NUMBERS-001 or NOT-RIGHT-001 hasn't merged when this is ready to start.

## Risks
- **Wrong match:** an AFTER SHIFT log he moved for another reason counts. Three on different days, and his tap, guard it.
- **Clutter:** one row per number at most, on a MORE page, and one item inside the weekly list's budget.
