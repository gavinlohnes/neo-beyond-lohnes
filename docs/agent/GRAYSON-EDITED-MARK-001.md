# GRAYSON-EDITED-MARK-001 — the same "edited" mark on every fixed value, with what it was one tap away

- **Authorization:** Gavin, 2026-11-24. Backlog row **E4** (YOURS): "Partly built: History already marks a fixed
  check-in as edited. Left: the mark on every other corrected value"
  (`/mnt/project-files/grayson/BACKLOG.md` row 4). His rule: **"I should be able to edit and tweak or correct
  everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief approves the defaults
  below.
- **Lane: FEATURE** (display only: it reads correction chains the app already keeps). No new event, table, Dexie
  version, Engine or Delta change. Green CI and a fresh-context reviewer's PASS; self-merge allowed under the Nov 19
  charter.
- **Starting commit:** `origin/master` `135e7b9e` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-edited-mark-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#19** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It shares no files with
  the rows before it except `historyCopy.ts`, so it can go whenever the next one waits on a merge.

## Objective and benefit
Most of this is built. BODY's lists and the day record already say "· corrected 2x" (`BodyScreen.tsx`,
`DailyHealthRecord.tsx`), Health sources shows the original value (`HealthSources.tsx`), body measurements say
"originally" (`BodyComposition.tsx`), and a fixed set shows "Was 145 lb × 12, now 150 lb × 12" (`trainCopy.ts`
`describeSetFix`). What's left:
- **History** marks only a fixed check-in (`HistoryScreen.tsx` " · edited"). A fixed sleep, weight, protein, water,
  meal, measurement, run or photo shows its original row unmarked, with the fix as a separate row.
- **The words differ:** "edited", "corrected 2x", "Corrected 2×", "originally".
- **The original** is one tap away only in Health sources and for sets.

After this, every fixed value says **edited** wherever it's listed, and a tap shows what it was and each change.

**Benchmark:** none new. This is the Vision's "always says why" rule applied to his own fixes.

## Recommended defaults (approved when Gavin merges this brief)
1. **One word:** "· edited" after every value that has at least one fix, in History and in every list that shows the
   value today (BODY lists, the day record, body measurements, Health sources, TRAIN history sets and runs). The count
   goes ("corrected 2x" becomes "· edited").
2. **One tap to the story:** tapping "edited" (a button, named "What changed in this ‹kind› log") opens a short list,
   oldest first: "Logged 7 h 10 min · 06:12", "Changed to 6 h 30 min · 08:40". Sets keep `describeSetFix`'s words.
3. **History:** a fixed root row shows "· edited" like a check-in does; its fix rows stay where they are.
4. **One helper:** `domain/editedMark.ts` builds the list from the chains the queries already walk
   (`walkCorrectionChain`, `checkInChains`, the meal and hydration chains in `nutritionQueries.ts`, `runningQueries.ts`,
   the measurement and photo chains), so every screen says the same thing.
5. **Not marked:** an entry removed and put back (History already shows PUT IT BACK), Garmin's own updates to a filled
   sleep entry (source SYSTEM; only his fixes count), and a set's lock-screen log.

## Everything is his to change
Nothing new to set: every value stays fixable where it is today.

## Design principles check (Vision, Nov 24)
- **Always says why:** each fixed value says so and shows what it was. **Simple first:** one word, details a tap away.
  **Calm:** no new screen.

## Scope
- `domain/editedMark.ts` (pure), its use in `HistoryScreen.tsx`, `historyCopy.ts`, `BodyScreen.tsx`,
  `DailyHealthRecord.tsx`, `BodyComposition.tsx`, `HealthSources.tsx`, `ProgressPhotos.tsx`, `review/BodyAnswers.tsx`,
  and TRAIN history (`trainCopy.ts`, the running entry line in `RunningSession.tsx`), plus a small shared
  `EditedMark` component (+ css).
- Tests: each kind's fix shows "edited" in History and in its list; the story lists every fix in order with the
  original first; a SYSTEM (Garmin) correction alone doesn't mark; a put-back entry isn't marked; the old "corrected
  Nx" wording is gone (a copy test); 320 px and axe on History with a story open.

## Excluded
Undoing a fix from the story (fix it again where it lives). Editing History rows. A count of fixes.

## Acceptance
- Phone check: fix a weigh-in and a meal. Both read "· edited" in BODY and in History. Tap one: it shows the original
  and the change with times.
- A Garmin-filled sleep you never touched has no mark.

## Decision record
- One word everywhere, because "corrected 2x" and "edited" read as two different things.
- Only his own fixes count, since Garmin following its newer data isn't an edit of his.

## Stop and ask Gavin if
- A kind of fix has no chain the helper can read without a new stored field.

## Risks
- **Copy drift:** the copy test that no screen still says "corrected" is the guard.
