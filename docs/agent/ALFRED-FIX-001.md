# ALFRED-FIX-001 — Alfred and the free helper fix a logged entry

- **Authorization:** Gavin, 2026-11-15: "It would be nice if I could find something that was logged wrong and have
  Alfred or the free helper edit it and update it." Plan approved ("Approved."), then "Go" for the completion plan (this
  is step 4). His screenshot: Alfred said he "can't edit or move an existing meal entry".
- **Builder:** Claude Code. Branch `ccr-88f5c085-alfred-fix`, from master `d51017f8` (after #540, TIMELINE-EDIT-001).
- **Lane: Protected.** Alfred gains a new write proposal. Independent exact-head review, green CI; Gavin merges.

## What changes

- **Alfred** gets a read, `day_entries` (the current and previous lived day's meal, water and protein entries with
  their ids, times and amounts), and one proposal, `fix_entry` (move to an `HH:MM`, correct the amount, or remove).
- **BEYOND fills the card from the record, never Alfred.** Before a card shows, the entry is found by id and the new
  time is placed in its lived day. The card reads *Move Butter Chicken and Rice · 19:15 → 23:00*, *Correct … · 560 →
  600 kcal*, or *Remove … (560 kcal · 46 g protein · 19:15)*. An unknown id, an impossible time or nothing to change
  goes back to Alfred as a read result; no card appears.
- **The free helper** does the same with no AI call: "move the butter chicken to 23:00 / 2300 hours / 11pm", "butter
  chicken was at 11:30 pm", "the butter chicken was 600 kcal", "remove the butter chicken", "delete the water". A fix
  names a logged entry whole, before the message is split ("Butter Chicken **and** Rice"). Anything that isn't an
  entry falls through to the other readers as before ("move the dentist to 23:00" isn't a fix).
- **SAVE** re-reads the entry and refuses if it changed or was removed since the card was made, then runs
  TIMELINE-EDIT-001's own fixes (existing `LOG_RETIMED`, correction chains, VOIDED facts). HISTORY keeps the original.

## Rules

- Confirmed only; nothing is written before SAVE. Only the current and previous lived day's entries.
- A time is a real clock time (00:00–23:59) placed in the entry's own lived day (16:30 to 16:30), later than now
  included, as LOG-TIME-001 already allows. "25:00" is refused, never rolled over.
- No Engine, schema, command or event change; no new provider or dependency.

## Leverage gate

- **REUSE:** `application/logEntries.ts` (TIMELINE-EDIT-001's move/correct/remove), `resolveWhen` (LOG-TIME-001),
  Alfred's proposal cards and read tools, the free helper's matcher.
- **OWN:** `application/alfred/fixEntryRules.ts` (pure card rules shared with the helper) and `fixEntries.ts`
  (resolution against the records and the guarded confirm).
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/alfredFix.test.ts`: the read lists ids; a move resolves to the real before/after and confirms through the
retime; unknown id / 25:00 / 23:60 / nothing to change go back to Alfred; a card refused after its entry changed or
was removed; the helper's phrasings including "Butter Chicken and Rice" whole, 2300 hours, 11pm, 600 kcal, remove;
tasks and logs unaffected. `tests/browser/AlfredFix001.test.tsx`: Gavin's case end to end through Alfred (read, card,
nothing before SAVE, axe, SAVE moves it), a wrong id never becomes a card, and the free helper with no AI call.
`Alfred001`'s pinned tool list now includes the two tools.
