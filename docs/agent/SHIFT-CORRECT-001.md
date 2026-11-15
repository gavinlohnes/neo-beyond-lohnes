# SHIFT-CORRECT-001 — explicit corrections of a recorded shift start or end

- **Authorization:** Gavin, 2026-11-15, after his screenshot: WORK ENDED had been recorded at 04:20, then at 04:21 he
  typed "Im still working till 0600. Fix my log" and Alfred said he couldn't. Approved by card at 04:26 CT: "Yes, amend
  WORK TRANSITION to allow explicit shift start/end corrections." and "Start with missions 1 and 2 (tool registry +
  shift correction)." This is mission 2.
- **Builder:** Grok Bot. Branch `codex/shift-correct-001`, **stacked on `codex/alfred-tools-001`** (mission 1,
  [ALFRED-TOOLS-001](ALFRED-TOOLS-001.md)) because the Alfred card is a registry entry. PR: pending; it should merge
  after mission 1 (or be retargeted onto master once mission 1 lands).
- **Lane: Protected.** Domain event types, an Engine input (the day ledger's work end, post-shift resolution, the sleep
  draft anchor), an amendment of a locked Decision Register rule, and a new Alfred write proposal. Independent
  exact-head review, green CI; Gavin merges. No Dexie schema version, migration, dependency or provider change.

## The amendment

WORK TRANSITION (Drop 02b, 2026-08-19): "Shift end is never inferred from time, schedule, GPS, inactivity, or other
hidden signals", with exactly one effective work-ended fact per day. **Still true.** What changes: the operator may now
*explicitly* correct a recorded mark, and "effective" is defined by the corrections:

- `WORK_PERIOD_RETIMED { commandId, markEventId, mark: STARTED|ENDED, occurredAt }` — when the mark really happened.
  Latest retime wins. `causationId` = the original mark.
- `WORK_PERIOD_VOIDED { commandId, markEventId, mark }` — that mark shouldn't count. A voided end **reopens** the
  shift: TODAY offers WORK ENDED again and a later explicit WORK ENDED records a new end (markWorkEnded's
  idempotence now reads the *effective* end).
- Effective mark (pure `src/engine/workMarks.ts`, shared by the Engine ledger and the queries): the latest
  WORK_PERIOD_STARTED/ENDED in write order that no void names, at its latest retimed time; otherwise none. Nothing is
  inferred. Originals are never edited; HISTORY shows the mark and each correction.

**Validation** (`retimeWorkMark`, `voidWorkMark` in `application/commands.ts`): the time stays inside the mark's lived day
(16:30 → 16:30, LOG-TIME-001's `placeInDay`); never later than now (a shift that hasn't ended yet is *reopened*, then
marked ended when it does — so "still working till 0600" at 04:21 is a reopen, not an end at 06:00); start before end;
a no-op writes nothing. Reopen and remove-start only on the active work day (like markWorkEnded); a start can be removed
only while no end is recorded.

**Readers moved to the effective mark:** `getWorkPeriodStarted/Ended` (and so every screen and brief built on them:
TODAY, shift change, handoff, CAVE brief/route, boot mode, operator context, the timeline), `hasUnresolvedPostShift`, the
sleep-draft anchor (`getSleepDraftEvidence`), the Engine day ledger's `workEndedAt`. The two new types count as
corrections in the ledger's manual-entry tally.

**Not undone:** anything an automation already did. When the IFTTT "work ended" automation is on, the card and the sheet
say it already ran when the end was marked and a correction can't take it back. A reopen followed by a new WORK ENDED
fires it again (that is the real end).

## Surfaces

- **Timeline:** the WORK mark on TODAY's "THE NIGHT SO FAR" list offers EDIT ›, also when only an end is recorded
  ("Work ended at 04:20"); a corrected mark reads "(corrected)". It opens a **SHIFT** sheet (`ShiftMarkSheet`): CHANGE
  TIME on the start and the end (LOG-TIME-001's editor, writing a WORK_PERIOD_RETIMED), REOPEN SHIFT behind a
  REOPEN SHIFT / KEEP IT confirm, the automation note, "(marked 04:20)" beside a corrected time.
- **Alfred `shift_fix` card** (registry entry): `move_end`, `move_start`, `reopen` (optional `until` he says he works
  till, shown on the card only), `remove_start`. BEYOND fills the day, the mark and its current time from the records;
  an impossible request (an end later than now, nothing to reopen, wrong order) goes back to Alfred in words that name
  the way forward. Card lines: "Shift end 04:20 → 03:50", "Shift start 18:02 → 17:45", "Reopen shift (marked ended
  04:20) · working till 06:00", "Remove shift start (18:02)", plus a second line (new registry `note`): what HISTORY
  keeps and, when on, that the automation already ran. Guard: the mark must be exactly as when the card was made.
  No UNDO button (the correction is itself the undo path; HISTORY keeps both).
- **Free helper** (no key, no network): read whole, before the negation check — "still working (till 0600)", "haven't
  clocked out", "not off yet", "my shift isn't over", "reopen my shift" → Reopen shift when an end is recorded;
  "got off / clocked out / finished work at 03:50", "shift end was 0400" → move the end (a time not reached yet →
  reopen); "clocked in / started work at 17:45" → move the start. A bare "6" is refused, never guessed. "still working
  on the fence" is not about the shift.

## Backup and migrations

Events are exported and restored wholesale; there is no event-type allowlist and no table change, so no Dexie version
bump or migration. An older build reading a newer backup ignores the two types (the original mark then counts as
recorded). Proven by an export → clear → restore round trip.

## Leverage gate

- **REUSE:** LOG-TIME-001's lived-day placement and time editor; the append-only correction model (LOG_RETIMED, voids);
  ALFRED-TOOLS-001's registry, resolve-before-card, guard-in-transaction and plain-error mapping; the free helper's clock
  reading (lifted to `clockOf`/`parseClock`); `LogSheet`; the IFTTT config reader.
- **OWN:** the two event types, the effective-mark rule, the shift sheet and the shift phrases.
- **BUILD FROM SCRATCH:** none.

## Tests and evidence

- `tests/engine/workMarks.test.ts`: none without an explicit mark; latest retime wins; a void reopens; a later end is
  effective and an old retime doesn't follow it.
- `tests/integration/shiftCorrect.test.ts`: **the screenshot** (04:20 end, 04:21 "Im still working till 0600. Fix my
  log" → Reopen shift card → confirmed → no end, post-shift unresolved false, sleep anchor not WORK_ENDED, HISTORY
  linked; 06:00 WORK ENDED records the one effective end, the ledger reads 06:00); Alfred's refusal and reopen card; the
  automation note; move end (queries, ledger, sleep anchor, HISTORY line) and start (stale card refused); validation
  (ahead, outside the day, order, no-op, plain error); reopen only on the active work day; shift-down interplay; backup
  round trip.
- `tests/shiftFixHelper.test.ts`: the phrases, refusals and unchanged "off work"/"at work".
- `tests/livedDayMap.test.ts`: shift ref, "(corrected)", end-only mark.
- `tests/browser/ShiftCorrect001.test.tsx`: timeline EDIT → SHIFT sheet; a future end refused in words; end moved to
  03:50; REOPEN SHIFT with KEEP IT; timeline follows; 320 px, ≥16 px text, axe clean. The screenshot words in Alfred's
  sheet with no key → Reopen card with the automation note → SAVE.
- Updated pins: DayMap003 (the work row now offers EDIT ›), Alfred001 (tool list gains `shift_fix`).
