# GRAYSON-ONE-MEMORY-001 — one place Delta remembers, with where each memory came from

- **Authorization:** Gavin, 2026-11-24. Campaign row **C6.7** "One memory store": "Finish moving legacy
  `alfredMemories` into MEMORY_RECORDED, each conversion confirmed, so Delta has one memory. Done when: no unconverted
  rows after his review; backup round-trip test" (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Campaign 6). Backlog row 42: "One
  place Delta remembers, with sources". 07:02 CT: **"first the hard pieces that other features plug into."** 07:56 CT:
  **"Lets knock out the hard ones. Do what's best."** His rule: **"I should be able to edit and tweak or correct
  everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (data migration, Delta's context). One optional field added to the `MEMORY_RECORDED` payload; no
  new table, no Dexie version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `2370d0f4` or later. Re-fetch before starting.
- **Builder:** Claude Code session `ccr-380c4225` (reassigned by Gavin's direct go, 2026-11-25: "Both are good to go", for C6.6 and C6.7), branch `ccr-380c4225-memory`. **Reviewer:** an independent Claude Code session (any qualified reviewer, DEV-FLOW-002).
- **Order:** Claude Code **#6** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after
  YOUR-NUMBERS-001. No shared files with the TRAIN briefs.
- **What plugs in later:** E8 ("That's not right" on every Why, kept as a correction) and E10 (corrections teach
  defaults) save into this one store with their own `via`. C5.5 (what Delta may read) filters this one store.

## Objective and benefit
Delta's memory lives in two places today. Old entries sit in the `alfredMemories` table with no history ("These
entries have no correction history. Forget deletes the local entry", `ui/components/AlfredMemoryList.tsx`). Everything
newer is a `MEMORY_RECORDED` fact with full history (`application/memory.ts`). MORE · Memory shows two lists, the
Delta sheet has a third, and none of them says where a memory came from. Converting an old entry takes a form with a
source ID, a topic dropdown and a textarea, one entry at a time.

After this there is one list. Each memory says where it came from ("You told Delta, Nov 3", "Home: garage door",
"People: Mom's birthday", "Old Delta entry, kept Nov 24"). Old entries are cleared in one short review: **KEEP** in one
tap, **FIX** to reword, **DON'T KEEP** to stop using it, and each choice can be undone. Nothing old is ever
physically deleted.

**Benchmark (read 2026-11-24):** ChatGPT lets people "view and delete specific memories or clear all memories in
settings", and since September 2024 "ChatGPT now lets you know when memories are updated"
([OpenAI, Memory and new controls for ChatGPT](https://openai.com/index/memory-and-new-controls-for-chatgpt/)).
OpenAI's memory FAQ refused our reader, so nothing here relies on it. **What we copy:** one list he can review, and
saying when something was remembered. **What we add:** where each memory came from, and history he can undo.
**What we keep out:** anything Delta remembers on its own; every memory here is still his words, saved on his tap.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where it came from, from now on:** an optional `via` on new `MEMORY_RECORDED` payloads:
   `"DELTA" | "HOME" | "PEOPLE" | "MEMORY" | "GUIDED" | "OLD_ENTRY"`, set by the one command that saved it
   (`alfredTools.ts` remember → DELTA, `homeCommands.ts` → HOME, `peopleCommands.ts` → PEOPLE, `MemoryPanel` →
   MEMORY, `GuidedOverview` → GUIDED, `convertLegacyMemory` → OLD_ENTRY). It is copied forward on every revision of
   that fact. The `snapshot` schema in `memory.ts` stays `.strict()` and accepts it as optional, so every existing
   event still parses. Facts saved before this show "Saved in BEYOND" with the date, never a guessed source.
2. **One list:** MORE · Memory shows one `MemoryPanel` list that includes the unconverted old entries, marked "Old
   Delta entry, not reviewed". `AlfredMemoryList` is removed once its jobs move into the review below. The Delta
   sheet's **Memory** link opens MORE · Memory instead of its own list. LifeScreen's Memory tab uses the same panel.
3. **The review:** when old entries remain, the top of MORE · Memory says "4 old Delta entries to review" with
   **REVIEW**. The review shows each entry's words, topic and date, one per row:
   - **KEEP** converts it as written through `convertLegacyMemory` (one tap, one confirmed conversion).
   - **FIX** opens the existing correction form with the words and topic prefilled.
   - **DON'T KEEP** converts it and marks it stopped (`IRRELEVANT`) in one atomic write, so it leaves Delta's
     context but stays restorable from "Stopped". This replaces today's Forget, which deletes the row for good.
   - An entry over 280 characters can't be kept as written; its row shows FIX and DON'T KEEP only and says why.
   - **KEEP THE REST AS WRITTEN** appears only after he has scrolled to the end of the list, converts every entry
     still showing that fits in 280 characters, and asks once: "Keep 4 entries as written?"
   - UNDO appears after a FIX or a DON'T KEEP (his Nov 24 undo pick): FIX undoes with a correction back to the old
     words, DON'T KEEP with RESTORED.
4. **Delta reads one store:** `getMemories()` keeps returning both kinds until none are unconverted, then reads facts
   only. Unreviewed old entries keep going to Delta exactly as today until he reviews them, so nothing Delta knows
   changes without his tap.
5. **The old table stays** as retained evidence (the existing design: "A converted source is retained evidence, never
   a second active fact"). No row is deleted, no Dexie version changes.
6. **"Remembered" tells him:** when Delta saves a memory from the sheet, its confirmation line reads "Remembered" with
   **OPEN** to the fact in MORE · Memory.

## Everything is his to change
Every memory: words, topic, kind, stop, restore, history. Each old entry's review choice, undoable. The `via` label is
shown, not editable, because it records what happened.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every memory, with history. **Fix, don't ask:** nothing changes until he reviews; KEEP is one
  tap. **One tap for the usual:** KEEP. **Always says why:** each memory says where it came from. **Calm:** one line on
  MORE · Memory, nothing on TODAY, no alert. **Simple first:** one list instead of three.

## Scope
- `domain/memory.ts`: `MemoryVia` type and labels. `application/memory.ts`: optional `via` in `snapshot`, carried
  forward in `recordMemory`. `application/alfred/alfredMemory.ts`: `via` on `rememberFact` and `convertLegacyMemory`;
  new `declineLegacyMemory` (convert + IRRELEVANT, one `writeAtomically`); `forgetFact` no longer reachable from the UI.
- Callers set `via`: `alfredTools.ts`, `homeCommands.ts`, `peopleCommands.ts`, `MemoryPanel.tsx`, `GuidedOverview.tsx`.
- UI: `MemoryPanel.tsx` (source line, old-entry rows, review), `MoreScreen.tsx`, `LifeScreen.tsx`, `AlfredSheet.tsx`
  (Memory link). Remove `AlfredMemoryList.tsx` and its css once unused.
- Tests: old events without `via` parse and project unchanged; `via` survives every action; KEEP, FIX, DON'T KEEP and
  each UNDO; KEEP THE REST skips entries over 280 characters; Delta's context is identical before and after a review
  that keeps every entry as written; native backup round-trip with converted, declined and unreviewed entries
  (export, clear, import, same list); an older backup without `via` imports.

## Excluded
Any memory Delta saves without his tap. Reading other stores (journal lessons, Delta's learnings, rest memory) into
this list; those stay where they are and are not memories of what he said. What Delta may read (C5.5). Corrections
(E8).

## Acceptance
- Phone check: MORE · Memory shows one list; each fact says where it came from; old entries show as "not reviewed".
- REVIEW with three entries: KEEP one, FIX one, DON'T KEEP one; UNDO the last; the list then shows no old entries to
  review and the declined one under Stopped.
- Ask Delta about something kept: the answer still uses it. Ask about the declined one: Delta no longer has it.
- Backup export and import keeps all of it.

## Decision record
- Decline converts and stops instead of deleting, so every choice in the review is undoable and the old words stay as
  evidence.
- `via` is recorded going forward only; no source is guessed for older facts.
- The old table is kept, not dropped, so old backups and the evidence rule keep working.

## Stop and ask Gavin if
- Any existing `MEMORY_RECORDED` event fails to parse with the new schema.
- Removing `AlfredMemoryList` would take away something it does that the review doesn't.
- The number of old entries on his phone is over 50 (the review may need paging or a search first).

## Risks
- **Event schema:** an optional field on a strict schema; the parse test on real exported events is the guard.
- **Delta context drift:** the context test before and after a keep-all review must match exactly.
