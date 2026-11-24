# GRAYSON-WORK-RECORD-001 — training hours, certifications, work dates and his two-year mark

- **Authorization:** Gavin, 2026-11-24. Backlog row **B16** (CONNECT, SHAPE), source "Your ask": "Work record:
  training hours, certifications, fitness standards, court and training dates, your two-year mark (Jan 9, 2027),
  beside swaps and OT" (`/mnt/project-files/grayson/BACKLOG.md` row 17); campaign row **C2.7**, added on his "yes to
  PR". 07:02 CT: **"first the hard pieces that other features plug into."** 07:56 CT: **"Lets knock out the hard
  ones. Do what's best."** His rule: **"I should be able to edit and tweak or correct everything in this app."**
  Merging this brief approves the defaults below.
- **Lane: PROTECTED** (new stored records, one Dexie version, a new TODAY quiet line). No Engine input, no
  recommendation change, no notification. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `2370d0f4` or later. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-work-record-001`. **Reviewer:** Claude Code.
- **Order:** Grok Bot **#5** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after DICTATE-001 and
  before CARRY-001. It needs TODAY-CALM-001 merged (its TODAY line is a quiet line). Takes the next Dexie version
  after master's latest (27 today); if ASKS-COUNT-001 or another table lands first, rebase and take the next one.
- **What plugs in later:** phone reminders through PLAN-FRESH's hand-off; Delta reading upcoming work dates once C5.5
  lets him choose what Delta may read; DICTATE's TALK ("I did 4 hours of defensive tactics today").

## Objective and benefit
His work has dates and totals no app tracks for him: yearly training hours, certifications that expire, court and
training days that land on days off, and his two-year mark on Jan 9, 2027. Today they live in his head or on paper,
and GRAYSON plans his week around shifts, swaps and OT (SCHEDULE-EXCEPTIONS-001) without knowing about any of them.

After this, **MORE · Work record** keeps them in one place beside his swaps and OT, and a due date shows on TODAY as
one quiet line ("Court Thursday 9:00 AM", "CPR card expires in 21 days") before he has to remember it.

**Benchmark:** none. No app he uses covers this; the row is his own ask, so his words set it. Fitness standards are
already TRAIN's job (STANDARDS-001) and are shown here, not stored twice.

## Recommended defaults (approved when Gavin merges this brief)
1. **One table,** `workRecords`: `id, kind, date, status, updatedAt`, following the schedule-exception pattern (stable
   `id`, `status: ACTIVE | REMOVED`, append-only `history` of `{ at, action: ADDED | CHANGED | REMOVED | RESTORED,
   before? }`). Local only, in native backups. Kinds:
   - `TRAINING`: title, date, hours (0.25 steps), optional note. Counts toward his yearly hours.
   - `CERTIFICATION`: name, earned date (optional), expiry date (optional), remind-before days.
   - `WORK_DATE`: title, date, optional time, type `COURT | TRAINING_CLASS | OTHER`, remind-before days.
   - `MILESTONE`: title, date, remind-before days.
2. **Yearly hours goal:** blank until he sets it ("Set your yearly goal"). The year starts Jan 1 unless he picks
   another month. With a goal: "26 of 40 hours this year, 14 to go by Dec 31". Without: "26 hours this year".
3. **The two-year mark:** the first time he opens Work record, one row offers "Add your two-year mark, Jan 9, 2027?"
   with **ADD**. Nothing is saved until he taps; the title and date are his to change.
4. **Reminder defaults, per item, editable:** court and training-class dates 7 days before; certifications 60 days
   before expiry; milestones 30 days before. "Remind me" can be OFF per item.
5. **On TODAY:** one quiet line `WORK_DUE` added to TODAY-CALM's list (last by default; he reorders it there). It
   names the nearest item inside its reminder window: "Court Thursday 9:00 AM", "CPR card expires Dec 15, in 21
   days", "Two-year mark in 30 days". Tapping opens the item. **DONE** on a past work date or **RENEWED** on a
   certification (asks for the new expiry) clears it. More than one due shows "+1 more" inside the line.
6. **On the work schedule:** a work date shows on its day in MORE · Work schedule. When it lands on a day off, the
   item offers **MARK AS WORK** once, which opens the existing OT confirmation (`confirmScheduleException`) prefilled
   for that day, so the sleep plan knows. His tap confirms it, as today.
7. **The screen:** MORE · Work record, four sections: Coming up (next 60 days, all kinds), Training hours (this year,
   newest first, with the goal line), Certifications (soonest expiry first; expired ones say "expired Nov 2"),
   Fitness standards (last result per test from STANDARDS-001, with **OPEN IN TRAIN**). A "Swaps and OT" link shows
   the next three exceptions and opens Work schedule. **ADD** at the top picks a kind.
8. **Fixing and removing:** every field is editable; REMOVE marks it removed and shows UNDO (his Nov 24 undo pick);
   removed items are under "Removed" and can be restored.

## Everything is his to change
Every item and field; reminder days per item and the per-kind defaults; the yearly goal and the month the year
starts; whether `WORK_DUE` shows on TODAY and where (TODAY-CALM's order); the two-year mark's title and date.

## Design principles check (Vision, Nov 24)
- **Yours to change:** all of it, with undo. **Built around shift:** work dates on days off become OT with one tap, so
  the sleep plan follows. **Calm:** one quiet line inside TODAY-CALM's budget, no alert. **Always says why:** the line
  names the item and the date. **Simple first:** four kinds, typed in a few taps. **One tap for the usual:** DONE and
  RENEWED.

## Scope
- `domain/workRecords.ts`, `application/workRecords.ts` (add, change, remove, restore, due items, yearly hours),
  `persistence/workRecordValidation.ts`, `db.ts` (next version, `workRecords` table), backup table list and compat.
- `ui/screens/more/WorkRecordScreen.tsx` (+ css), a MORE row "Work record" beside Work schedule.
- TODAY: the `WORK_DUE` quiet line through TODAY-CALM's slot (after SPLIT-003, in its section file, not
  `TodayScreen.tsx` directly). Work schedule: a marker on the day.
- Settings: per-kind reminder defaults, goal and year start in `beyond.workRecord.v1`, in `TRAVELLING_SETTINGS` as
  "Work record".
- Tests: each kind added, changed, removed, restored, with history; yearly total across the year start; due order and
  windows; past dates drop off after DONE; MARK AS WORK opens the OT confirmation and saves nothing by itself;
  native backup round-trip; an older backup without the table imports with it empty.

## Excluded
Phone notifications (later, through PLAN-FRESH). Delta reading the record (after C5.5). Importing from an agency
system or a training portal. Any pass/fail or score on training hours. Case details: the title field says "a short
title, like Court".

## Acceptance
- Phone check: add a court date on a day off for next Thursday; TODAY shows "Court Thursday 9:00 AM" from 7 days
  before; MARK AS WORK opens the OT confirmation for that day.
- Add 4 hours of training and a 40-hour goal: "4 of 40 hours this year".
- Add a certification expiring in 50 days: it shows on TODAY now (60-day default); change its reminder to 30 days and
  it leaves TODAY.
- The two-year mark offer appears once and saves only on ADD.

## Decision record
- Its own table, like schedule exceptions, because these are records he keeps, not events of a lived day.
- Fitness standards are read from TRAIN, not stored again.
- Court and training dates become OT only on his tap, through the existing confirmation.

## Stop and ask Gavin if
- His agency's training year doesn't start on the first of a month.
- He wants training hours split by category with separate goals (for example firearms, CPR, in-service).
- A work date needs a time range rather than a start time.

## Risks
- **Dexie version race** with ASKS-COUNT-001 or any other new table: whoever merges second takes the next number.
- **TODAY crowding:** the line lives inside TODAY-CALM's budget, so it can't add a block.
