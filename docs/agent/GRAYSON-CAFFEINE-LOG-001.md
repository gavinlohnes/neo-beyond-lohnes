# GRAYSON-CAFFEINE-LOG-001 — an optional one-tap caffeine log, log only

- **Authorization:** Gavin, 2026-11-25. Campaign row **C4.3** "Optional one-tap caffeine log"
  (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Campaign 4). Asked that evening: "The original plan added a monthly comparison of
  your day sleep with and without caffeine. That's the kind of measurement you cut on Nov 20. I'd build the one-tap log
  only. Should I write it as log only?" At 9:08 PM CT he said **"Yes"**. His rule: **"I should be able to edit and
  tweak or correct everything in this app."** Merging this brief approves the defaults below, including the change to
  the "caffeine is never recorded" rule.
- **Lane: PROTECTED** (a new logged event with removal, in backups, and it amends the locked rule in
  `docs/UX_DECISIONS.md` SUIT-ALIVE-003, "Caffeine is still never recorded"). No new table, no Dexie version, no Engine
  or sleep-plan change. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `135e7b9e` or later. Re-fetch before starting. If HABIT-EDIT-001 is open,
  rebase on it once it merges (both add a member to `LOG_VOID_TYPES`).
- **Builder:** Claude Code. Branch `claude/grayson-caffeine-log-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#21** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).

## Objective and benefit
GRAYSON shows his caffeine cut-off (ROUTE's caffeine card, `ui/screens/systems/CaffeineCutoff.tsx`; TODAY's energy
curve marks it), and he sets its hours himself (C4.2a, #595). It can't record a drink: the cut-off card says "BEYOND
does not record your actual caffeine timing, dose or adherence", and the cave file lists "Caffeine: BEYOND doesn't
record it."

After this, he can log a drink in one tap, with when, the same way he logs water. The log only records. It feeds no
advice, no comparison and no suggestion.

**Benchmark:** none new. The campaign plan's own C4.3 row, narrowed by Gavin's Nov 20 C4.2a ruling and his
2026-11-25 "Yes" to log only.

## What is left out, on purpose
The campaign row also said "the cut-off and the curve show what's still in his system" and "a monthly 'caffeine vs your
day sleep' line". Both are automated caffeine measurement, which his Nov 20 ruling removed ("no automated suggestion,
confidence or suppression"; "No sleep evidence is read to choose or recommend a setting"). So neither is built. Any
comparison later would be the separately authorized caffeine experiment that C4.2a defers.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where to log:**
   - **CAFFEINE** in the LOG sheet (`ui/components/RecordSheets.tsx`), beside his other quick logs.
   - **LOG A DRINK** on ROUTE's caffeine card.
   - Nothing new on TODAY's two log buttons (one TODAY change at a time).
2. **One tap:** the sheet shows his drinks as chips and logs on tap, with the existing when-picker (NOW by default; a
   time, a day from the last week, or START / MID / END / AFTER of that day's shift; LOG-WHEN-001).
3. **His drinks:** a starting list of **Coffee**, **Tea**, **Energy drink**, **Energy shot** and **Soda**, and **ADD A
   DRINK** (1 to 40 characters). He can rename, reorder or remove any drink, and the one he logged last comes first.
   No amounts, milligrams or sizes.
4. **Event:** `CAFFEINE_LOGGED {commandId, drink}` on the lived day, USER, at the chosen time. Removal is
   `CAFFEINE_LOG_VOIDED` (a new `LOG_VOID_TYPES` member, payload `loggedEventId`) with UNDO through `LOG_VOID_UNDONE`,
   exactly like water. A wrong time is fixed with the existing log-time editor.
5. **What it shows:**
   - The caffeine card lists tonight's drinks: "Coffee 22:15 · Energy shot 02:10".
   - A drink logged after that night's cut-off says so in plain words: "after your 01:30 cut-off". It's a fact against
     his own setting, with no advice and no colour of alarm.
   - History lists each drink and removal.
6. **What never reads it:** the Engine, the sleep plan and the cut-off (the cut-off stays his number only), the energy
   curve, the alertness read, WHAT-MOVES (`application/whatMoves.ts`), tag patterns, MONTH-PATTERNS, the month recap,
   the year review and any automatic run.
7. **Delta:** it may answer what he logged when he asks ("When was my last coffee?"). It never links caffeine to sleep,
   energy or anything else, and never suggests a change. This is a registry row in DELTA-READS-001, "Caffeine log",
   default **Always**, like water. If DELTA-READS hasn't merged, Delta doesn't read it at all.
8. **Words that change:**
   - The cut-off card's last sentence becomes "BEYOND records only the drinks you log, and doesn't use them to set
     your cut-off."
   - The cave file's line becomes "Caffeine: only the drinks you log."
   - `docs/UX_DECISIONS.md` gets a dated amendment under SUIT-ALIVE-003: caffeine he logs is recorded; nothing reads it
     to advise him.

## Everything is his to change
Every drink in the list; every logged drink, removable with undo and its time fixable; whether CAFFEINE shows in the
LOG sheet (one switch, on by default); Delta's access (its DELTA-READS row).

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** the last drink comes first. **Yours to change:** drinks, logs and times. **Calm:** no
  alert, no advice, no score. **Built around shift:** START / MID / END / AFTER for when.

## Scope
- `domain/common/types.ts` (`CAFFEINE_LOGGED`), `domain/logVoids.ts` (`CAFFEINE_LOG_VOIDED`), `application/commands.ts`
  (`logCaffeine`), `application/logEntries.ts` (removal through `removeLogEntry`), a caffeine query, the drinks list as
  a backed-up setting, `historyCopy.ts`, `caveFile.ts`, the DELTA-READS row.
- UI: `RecordSheets.tsx` (the CAFFEINE row and sheet), `CaffeineCutoff.tsx` (LOG A DRINK, tonight's drinks, the line
  after the cut-off) (+ css).
- Tests: a tap logs at now and at a shift point; removal and UNDO; the time editor moves it; the after-cut-off line
  uses that night's cut-off; drinks list add, rename, reorder, remove and last-first; no reader in point 6 receives
  caffeine (an import or architecture test); Delta context includes it only through its registry row; native backup
  round-trip, and an older backup without the drinks list imports with the starting list; 320 px and axe on the sheet
  and the card.

## Excluded
What's still in his system, half-life or milligrams. Any comparison with sleep, energy or mood. Alerts or a "last
caffeine" nudge (C7.3 stays separate). Changing the cut-off from logs. A TODAY button.

## Acceptance
- Phone check: open LOG, tap CAFFEINE, tap Coffee: it's logged now. Log an Energy shot at MID of tonight's shift: ROUTE's
  caffeine card shows it, and says "after your cut-off" if MID is past it.
- Remove one, UNDO it. Rename a drink and add your own.
- Your cut-off doesn't change after logging.

## Decision record
- Log only, on Gavin's 2026-11-25 "Yes", because the comparison and the "still in your system" estimate are the
  automated measurement he cut on Nov 20.
- No amounts, because an amount only matters for a measurement this brief doesn't make.
- Not on TODAY's log buttons, to keep one TODAY change at a time and TODAY calm.

## Stop and ask Gavin if
- Any reader in point 6 turns out to read every logged event type generically, so caffeine would reach it.
- The LOG sheet isn't where his other quick logs live.

## Risks
- **Quiet creep into advice:** the test that no listed reader receives caffeine is the guard.
