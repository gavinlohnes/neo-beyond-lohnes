# GRAYSON-HOME-PEOPLE-EDIT-001 — fix or remove a home job, a person's date, or a fact, right where he sees it

- **Authorization:** Gavin, 2026-11-24. Backlog row **E6** (YOURS): "Edit or remove People dates and Home items"
  (`/mnt/project-files/grayson/BACKLOG.md` row 6). His rule: **"I should be able to edit and tweak or correct
  everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief approves the defaults
  below.
- **Lane: PROTECTED** (the backlog said FEATURE; it moves up because undoing a removal needs a released reminder to
  reopen, which the intent rules don't allow today). No new table, no Dexie version. Independent exact-head review,
  green CI; Gavin merges.
- **Starting commit:** `origin/master` `e7160c68` or later. Re-fetch before starting. If HOME-LASTDONE-001 is open,
  rebase on it once it merges (both edit `HomePanel.tsx`).
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-home-people-edit`, or the
  branch name its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#10** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  HOME-LASTDONE-001 (#4) and HABIT-EDIT-001 (#9).

## Objective and benefit
MORE · Home and MORE · People only add (`ui/components/HomePanel.tsx`, `PeoplePanel.tsx`). A home job ("Home: change
the furnace filter", every 3 months) and a person's yearly date are ordinary repeating reminders
(`application/homeCommands.ts`, `peopleCommands.ts`), and the facts beside them (for example, a filter size) are
memories with topic HOME or PEOPLE. On both pages the facts are a plain list and the reminders have no edit. A wrong
birthday or a filter size that changed means asking Delta, or living with it.

After this, each home job, each person's date and each fact has **EDIT** and **REMOVE** on the page where it shows.
Every change saves at once and shows UNDO.

**Benchmark:** none new. This is the Vision's "yours to change" rule applied to Home and People.

## Recommended defaults (approved when Gavin merges this brief)
1. **Home jobs:** EDIT opens the add form filled with the job: name, details, every N weeks or months, next due date,
   alert time. SAVE CHANGES goes through `modifyObligation` (title keeps the "Home: " prefix, recurrence rebuilt from
   the new repeat and next due date). It changes this job and every later one; past done ones stay as they were.
2. **People dates:** EDIT opens the date form filled with person, occasion, month, day and note, and saves the same
   way. Renaming a person here changes this date only; the person page groups by the new name.
3. **REMOVE a job or date** releases it (`releaseObligation` with the note "Removed in Home" or "Removed in People"),
   so no next one is made. It shows **UNDO**.
4. **UNDO after a removal** needs a released reminder to reopen. A new command, `reopenReleasedObligation`, puts it
   back to OPEN with its old due date and recurrence. It's allowed only for a release made from these pages, only
   while it's the reminder's latest change, and it writes `OBLIGATION_REOPENED` so History shows both. Nothing else
   can reopen a released reminder.
5. **Facts:** each fact on Home and People gets EDIT (rewords it through `recordMemory` CORRECTED, 1 to 280
   characters, topic kept) and REMOVE (IRRELEVANT, so it leaves Delta's context but stays restorable). REMOVE shows
   UNDO (RESTORED). An old Delta entry not yet reviewed (ONE-MEMORY-001) converts first, then changes, in one write.
6. **Words stay plain:** "Removed. It won't come round again." with UNDO. No "Are you sure".

## Everything is his to change
Every home job, date and fact: edit, remove, undo. What's already happened stays in History.

## Design principles check (Vision, Nov 24)
- **Yours to change:** everything on both pages. **Fix, don't ask:** saves at once with undo. **Simple first:** the
  forms he already knows, filled in. **Calm:** nothing new on TODAY.

## Scope
- `ui/components/HomePanel.tsx`, `ui/components/PeoplePanel.tsx` (and the person page) (+ css): EDIT, REMOVE, UNDO.
- `application/homeCommands.ts` (`editHomeItem`), `application/peopleCommands.ts` (`editPersonDate`), both
  rebuilding the recurrence with the existing `repeatRule` helpers.
- `application/intentCommands.ts` (`reopenReleasedObligation`), `domain/intent` (the `OBLIGATION_REOPENED` event and
  its guard), `historyCopy.ts`.
- Memory edits through `application/memory.ts` `recordMemory` and ONE-MEMORY's conversion.
- Tests: an edit changes this and later occurrences only; the "Home: " prefix stays; a removal makes no next one and
  UNDO reopens it with its due date and recurrence; reopen is refused for a release made elsewhere or after a later
  change; fact edit, remove and undo; an unreviewed old entry converts and changes in one write; native backup
  round-trip; 320 px and axe on both pages with a form open.

## Excluded
Deleting anything for good. Editing past done reminders. Merging two people. Changing how Delta reads home or people
facts (that's DELTA-READS-001).

## Acceptance
- Phone check: on Home, EDIT a job's repeat from 3 to 2 months: the next due date follows. REMOVE it: it's gone from
  Home and the week ahead. UNDO: it's back with its date.
- On People, fix a birthday's day: the week ahead shows the new date.
- EDIT a fact's words; REMOVE another and UNDO.

## Decision record
- Remove is a release, not a delete, so History keeps it and undo can bring it back.
- Reopen is narrow (only these pages' releases, only while latest) so the one-way rule for everything else holds.

## Stop and ask Gavin if
- A home job or a date has no recurrence the existing helpers can rebuild.
- Reopening a released reminder would also need its next occurrence removed (it shouldn't, since release makes none).

## Risks
- **Intent rule change:** the reopen guard tests are the guard.
- **Duplicate reminders:** an edit must change the open reminder, never add a second.
