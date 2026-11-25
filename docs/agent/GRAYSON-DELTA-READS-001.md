# GRAYSON-DELTA-READS-001 — one page that says what Delta may read, and keeps the rest out

- **Authorization:** Gavin, 2026-11-24. Campaign row **C5.5** "Sensitive-data controls": "One screen: which inner-day
  data Alfred may read, which stays out of backups-to-cloud, and delete-all for a category. Done when: per-category
  switches enforced in `operatorContext.ts`; Drive backup option to exclude" (`docs/GRAYSON_CAMPAIGN_PLAN.md`,
  Campaign 5); backlog row 44, "You decide what the AI sees". 07:02 CT: **"first the hard pieces that other features
  plug into."** 8:18 PM CT: **"What's the next best move? ... I want to work in the best possible way."** His rule:
  **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves the
  defaults below.
- **Lane: PROTECTED** (privacy, Delta's context, backup). No new table or Dexie version, no Engine change. Two slices,
  each its own PR. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `3b7497e3` or later. Re-fetch before each slice. If ONE-MEMORY-001 is open,
  rebase on it once it merges (both touch what Delta reads about memories).
- **Builder:** Claude Code. Branches `claude/grayson-delta-reads-001-a` and `-b`. **Reviewer:** a fresh-context
  reviewer.
- **Order:** Claude Code **#12** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It doesn't depend on
  ONE-MEMORY-001, so if NOT-RIGHT-001 (#11) is still waiting on ONE-MEMORY, build this first.
- **What plugs in later:** Delta reading the work record (WORK-RECORD-001 leaves that for here), C5.4's monthly pattern
  review ("Alfred sees it only with personal opt-in"), and every new kind of record Delta reads. Each adds one row to
  this page.

## Objective and benefit
Today Delta reads about 25 kinds of record (`application/operatorContext.ts`), and there's one switch: whether a
conversation includes his "personal" records (his statements, daily notes, calendar, note-based learnings). That
switch resets every time the Delta sheet opens. Everything else is always sent, including his check-ins (energy,
stress, mood, soreness, alcohol urge), his quit tracker and what he asked Delta to remember. He can't keep one of them
out. MORE · Memory already lists what Delta would get (`OperatorContextPanel`, "Operator context"), but it can't
change any of it.

After this, the same page says, for each kind of record, **Always**, **When I include personal** or **Never**, and
Delta's context follows it. Nothing changes until he changes a row: the defaults are exactly what Delta reads today.
Slice B lets him keep the most private kinds out of the Google Drive backup.

**Benchmark (read 2026-11-24, already cited in ONE-MEMORY-001):** ChatGPT lets people "view and delete specific
memories or clear all memories in settings" and turn memory off
([OpenAI, Memory and new controls for ChatGPT](https://openai.com/index/memory-and-new-controls-for-chatgpt/)).
**What we copy:** controls over what the AI keeps and reads, on one settings page. **What we add:** a switch per kind
of record, three states, and the page shows what each one would send. **What we keep out:** any default that shares
more than today; deleting his records from this page (he removes items where they live).

## Recommended defaults (approved when Gavin merges this brief)
1. **One registry,** `domain/deltaReads.ts`: each kind Delta reads, with an id, a label, one plain sentence of what
   it sends, its group, and its default. Every `read(...)` call in `operatorContext.ts` names a registry id. A test
   fails if a call has none, so a new kind can't be sent without a row.
2. **Groups and defaults** (the default is today's behaviour, row by row):
   - **Today and plans** (Always): current day, what TODAY shows, work marks, the current recommendation, open tasks
     and reminders, routines, projects, recent lived days, open notes.
   - **Shift and schedule** (Always): schedule, today's shift forecast, next seven days.
   - **Food and body** (Always): food today, saved meals, targets and weight.
   - **Sleep and Garmin** (Always): Garmin measurements, sleep comparison.
   - **Check-ins** (Always): the latest check-in.
   - **Quit tracker** (Always): quit records.
   - **What you told Delta** (Always for the memory list; When I include personal for his statements).
   - **Notes and calendar** (When I include personal): daily notes, Google Calendar events.
   - **What Delta has learned** (Always for measured learnings; When I include personal for note- and journal-based
     ones, as `deltaFacts.ts` does today).
   - **Automatic runs** keep their existing preparation and recovery allowance, shown as its own row (Always).
3. **Three states per row:** **Always** sends it in every conversation and automatic run. **When I include personal**
   sends it only when he turns on the personal switch in the Delta sheet (today's switch, unchanged, still off each
   time the sheet opens). **Never** keeps it out everywhere; it shows in that list as "Off by you".
4. **Never is enforced at the read:** a Never row isn't queried, and its coverage entry is `excluded` with reason
   `OWNER`. The local list on MORE · Memory still shows everything, marked with what Delta would and wouldn't
   get. Delta's own prompt is told which kinds are off, so it says "you've kept check-ins out" instead of guessing.
5. **Delta's actions don't widen it:** a Delta tool that reads records (for example finding a meal) respects the same
   rows. A Never row's records can't be read through a tool either.
6. **The page:** a new **MORE · What Delta reads** (linked from the top of MORE · Memory's context list) shows
   the switches beside each kind, grouped as above, with one line on top:
   "Delta reads these when you talk to it. Nothing here leaves your phone unless you send a message." The change shows
   at once in the same list. Each change shows **UNDO** (his Nov 24 undo pick).
7. **Slice B, the Drive backup:** a "Keep out of Google Drive backup" switch on four groups only: Check-ins, Quit
   tracker, What you told Delta, Notes and calendar. Off by default. When on:
   - The Drive backup leaves those tables out and says so in the backup's manifest.
   - The phone's own backup (share sheet and automatic) always keeps everything.
   - Turning one on asks once: "A restore from Google Drive won't bring back your check-ins. Your phone's own backup
     still has them." with **KEEP OUT OF DRIVE**.
   - The restore check and a Drive restore name what the backup left out.

## Everything is his to change
Every row's state, with undo; the Drive switches; the personal switch in the Delta sheet stays as it is.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every kind of record Delta reads. **Always says why:** each row says what it sends, and Delta
  says what he kept out. **Calm:** nothing on TODAY, no prompt. **Simple first:** grouped, with today's behaviour as the
  default, so he only touches what he wants to change. **Fix, don't ask:** one tap per row.

## Scope
- Slice A: `domain/deltaReads.ts`, `application/deltaReadsSettings.ts` (`beyond.deltaReads.v1`:
  `{ rows: { [id]: "ALWAYS" | "PERSONAL" | "NEVER" } }`, only changed rows stored; in `TRAVELLING_SETTINGS` as "What
  Delta may read"), `operatorContext.ts` (every read names a registry id and checks it), `deltaFacts.ts`, the Delta
  tools that read records, `ui/screens/more/DeltaReadsScreen.tsx` (+ css) and its MORE row, a link from
  `OperatorContextPanel.tsx`, the Alfred prompt line that names what's off.
- Slice B: `application/driveBackup/driveBackupService.ts` (tables left out, manifest), restore check copy, the four
  Drive switches.
- Tests: with no setting saved, Delta's context is byte-for-byte what master builds today (conversation, automatic and
  local); each state per row; Never isn't queried; a Never row can't be read through a tool; every `read(...)` has a
  registry id; UNDO; the prompt names what's off; settings travel in the native backup; Slice B: the Drive backup
  leaves out exactly the chosen tables, the phone's backup leaves out nothing, the manifest and restore say what's
  missing, a Drive backup made before this restores as today; 320 px and axe on the page.

## Excluded
Deleting records from this page. Sharing anything new by default. Changing the personal switch's behaviour in the
Delta sheet. The phone's own backup (always complete). Encrypting single tables differently (the Drive backup is
already encrypted as a whole).

## Acceptance
- Phone check (slice A): MORE · What Delta reads, set Check-ins to Never. Ask Delta "how was my energy today?": it
  says you've kept check-ins out. Set it back to Always: it answers from the check-in. UNDO works.
- Set Quit tracker to When I include personal: Delta doesn't see it until the personal switch is on in the sheet.
- Slice B: turn on Keep out of Drive for Notes and calendar, back up to Drive, run the restore check on that file: it
  says notes and calendar were left out.

## Decision record
- Defaults copy today exactly, so merging this changes nothing Delta knows; only his taps do.
- Three states, because the existing personal switch already gives "only when I say so", and Never is the new piece.
- Delete-all per kind is left out: removing records is done where they live, with their own undo, not from a privacy
  page where a mis-tap can't be seen.
- Only the four most private groups get a Drive switch, so a Drive restore can't quietly lose his training or food.

## Stop and ask Gavin if
- A read in `operatorContext.ts` can't be matched to one row.
- A Delta tool reads records without going through `operatorContext.ts` and can't be gated the same way.
- Leaving tables out of the Drive backup breaks its encryption or restore format.

## Risks
- **Context drift:** the byte-for-byte test with no setting saved is the guard.
- **Restore surprise:** the one-time warning, the manifest, and the phone's backup staying complete.
