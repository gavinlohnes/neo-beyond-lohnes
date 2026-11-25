# GRAYSON-CHECKIN-WORDS-001 — an optional feeling word on the check-in, and how you want Delta to help today

- **Authorization:** Gavin, 2026-11-24. Backlog rows **C5.1** (LEARN): "Optional feeling word on the check-in" and
  **C5.2** (SHAPE): "Help mode: just listen, help me understand, decide, or minimum version"
  (`/mnt/project-files/grayson/BACKLOG.md`, rows 34 and 35; campaign plan C5.1 and C5.2). 05:23 CT: **"Just keep
  pumping out work."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging
  this brief approves the defaults below.
- **Lane: PROTECTED** (check-in event shape, sensitive data, backup, and Delta's behaviour). Optional fields on the
  check-in, no new table or Dexie version. Two slices, each its own PR: **A** the feeling word, **B** help mode.
  Independent exact-head review, green CI; Gavin merges each.
- **Starting commit:** `origin/master` `9c48e2e7` or later. Re-fetch before starting. Rebase on TELL-DELTA-FIX-001
  if it's open (both touch check-in corrections and Delta's tools).
- **Builder:** Claude Code. Branches `claude/grayson-checkin-words-001-a` and `-b`. **Reviewer:** a fresh-context
  reviewer.
- **Order:** Claude Code **#24** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  TELL-DELTA-FIX-001 (#22). MONTH-PATTERNS-001 (#18) can read the word later; nothing here changes it.

## Objective and benefit
The check-in is five numbers (`checkInFields.ts`: energy, stress, mood, soreness, alcohol urge). A 2 for mood can mean
flat, irritable or worn out, and those want different things from Delta. Delta also answers every hard day the same
way, when some days he wants someone to listen and others he wants the smallest plan.

After this, two optional rows sit after the numbers:
- **A word for it** (slice A): one word from a short list, and what's behind it.
- **What would help today** (slice B): how Delta should answer him today.

Skipping both keeps today's check-in exactly as it is, ALL GOOD included.

**Benchmark (read 2026-11-25):** How We Feel "helps people find the right word to describe how they feel", and its
check-in tags now include physical sensations such as "heavy shoulders, fluttering stomach, tight chest"
([App Store listing, How We Feel](https://apps.apple.com/us/app/id1562706384)). **What we copy:** naming the feeling
with a word, and tagging what's behind it. **What we add:** a short list sized for a tired thumb, and a help choice
that changes how Delta answers. **What we keep out:** colour-coded quadrants, and any score or label made from the
word.

## Recommended defaults (approved when Gavin merges this brief)
**Slice A: the feeling word**
1. **Words** (one, optional): Calm, Good, Proud, Flat, Tired, Wired, Irritable, Anxious, Heavy, Low. His list to
   edit: rename, remove, add up to 16 in all, from a WORDS link
   under the row.
2. **What's behind it** (any, optional, shown once a word is picked): Sleep, Work, Home, Body, Nothing in
   particular. His list to edit too.
3. **Stored:** `StateCheckIn.feeling?: string` and `feelingWhy?: string[]`, optional and unindexed. A correction
   (`correctCheckIn`, CHECKIN-EDIT-001) can change or clear them.
4. **Never read** by `engine/capacity.ts`, the Engine, the draft carried forward (`draft` stays numbers only), recaps,
   patterns or any automatic run. History shows "Check-in · Flat (work)".
5. **Delta:** a new DELTA-READS-001 row, **Feeling words**, defaulting to **Today's only**: Delta sees today's word
   and reasons, and nothing older. He can widen it or turn it off there. If DELTA-READS-001 isn't merged, Delta reads
   only today's, with no setting yet.

**Slice B: help mode**
6. **Choices** (one, optional): **Just listen**, **Help me understand**, **Help me decide**, **Smallest version**.
7. **Stored:** `StateCheckIn.helpMode?`, for that lived day. In the Delta sheet, the same four chips set it for that
   conversation only, with nothing stored.
8. **What it changes:** one line added to Delta's instructions for the day (`alfredClient.ts`, after PERSONA):
   - Just listen: reflect back and ask at most one question; no advice unless he asks.
   - Help me understand: explain what his own records show, citing them; no plan.
   - Help me decide: lay out two or three options, with what each costs.
   - Smallest version: offer the Minimum Day plan he already has (`MinimumDaySection.tsx`), and nothing more.
9. **Never changes** the Engine's recommendation, TODAY's plan or any record. Delta never picks a mode for him.

## Everything is his to change
Both word lists; every check-in's word, reasons and help choice through a correction; the DELTA-READS row; the chip in
Delta for that conversation.

## Design principles check (Vision, Nov 24)
- **Simple first:** both rows optional, and skipping them keeps today's two taps. **Calm:** no score, no label,
  nothing inferred. **Yours to change:** both lists and every answer.

## Scope
- Slice A: `domain/common/types.ts` (`StateCheckIn`), `checkInFields.ts` (the optional rows are kept out of
  `isCheckInComplete`), `CheckInSheet.tsx` / `useCheckInForm.ts`, `application/commands.ts` (`submitCheckIn`),
  `checkInCorrectionCommands.ts`, `historyCopy.ts`, a word-list setting, `alfredContext.ts` behind the DELTA-READS row.
- Slice B: the same check-in files, `alfredClient.ts` (the day's line), the Delta sheet's chips (+ css).
- Tests: skipping both submits the same row as today; ALL GOOD unchanged; capacity, the Engine and the draft ignore
  both fields; a correction changes and clears them; Delta's context has today's word only by default and none when
  the row is off; each help mode adds its one line and changes no record; the Delta chip stores nothing; native
  backup round-trip and an older backup imports; 320 px and axe on the check-in with both rows open.

## Excluded
Any score, trend or label from the words (MONTH-PATTERNS-001 decides any later read, with its own floors). Delta
choosing a help mode. Physical-sensation tags.

## Acceptance
- Phone check: check in, pick Flat and Work. History says "Check-in · Flat (work)". Ask Delta "how am I doing?": it
  mentions today's word and nothing older.
- Check in with Just listen and tell Delta about the shift: it reflects back and doesn't give advice.

## Decision record
- Optional and after the numbers, so the fast check-in stays fast.
- Kept out of capacity and the Engine, so a word never changes what he's told to do.
- Delta sees today's word by default, because the word only helps if Delta can answer it, and older words wait for his
  say.

## Stop and ask Gavin if
- Any reader besides the check-in, History, corrections and Delta's context would need the new fields.

## Risks
- **Sensitive data:** the DELTA-READS row and the never-read list are the guards, each with a test.
