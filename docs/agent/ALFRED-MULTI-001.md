# ALFRED-MULTI-001 — several actions in one message

- **Authorization:** wave 2 of the overnight plan Gavin approved on 2026-11-15 ("Approved. If you have anything you
  want to change ask me and I'll decide."). Builds on ALFRED-TOOLS-001 (#552, merged) and ALFRED-ACT-001 (#560).
- **Builder:** Grok Bot. Branch `codex/alfred-multi-001` from `origin/codex/alfred-act-001` `365d2a45` (stacked on
  #560). PR targets `codex/alfred-act-001`; **it merges after #560** and is then retargeted to `master`.
- **Lane: PROTECTED** (AI autonomy surface stacked on #560; classify-risk). Independent exact-head review, green CI;
  Gavin merges. No Engine, schema, migration, dependency, provider, alert or low-risk-definition change.

## Behaviour

- One message ("drank 16 oz water, weighed 181, slept 7h and remind me to call mum tomorrow") already yields one
  registry card per part from both the free helper (`clauses`/`interpret`) and Alfred (one tool call each). This
  objective makes that dependable and visible:
  - **Order kept.** Cards stay in the order he said them; the at-once ones run in that order.
  - **At once, unchanged rule.** ALFRED-ACT-001's four conditions decide which cards run at once (registry
    `immediate-undo`, whole message understood, not repeated word for word, the kind's `clear` rule). Nothing new
    counts as low-risk. Every other card (sleep, reminders, tasks, notes, …) waits for SAVE as before.
  - **Cap: at most 5 at once per message** (`MAX_AT_ONCE`). More than that is likelier a paste or slip than a report,
    so **none** run at once, every card waits for SAVE, and he is told ("That's more than 5 logs in one message…").
    Confirm cards don't count toward the cap, so planning replies with many cards are unaffected.
  - **Unclear parts are asked about, never guessed.** The free helper keeps an unclear part word for word and, as
    before, then runs nothing at once (rule 2); with Alfred reachable the message goes to him whole, and his persona now
    says: one tool per thing in order, never merge or repeat, and ask one short question about the unclear part only
    while still proposing the clear parts.
  - **No silent failure.** If one at-once write is refused or the records changed mid-message, the run stops there (as
    in #560, so order holds); the earlier writes stay with their UNDO, the card that stopped says why ("Not logged: …"),
    and the ones after it say they wait for SAVE. If BEYOND can't check the cards at all, it says nothing was saved at
    once. The free helper's one line counts what ran ("Logged all 3…", "Logged 2 at once…").
  - **No double writes.** Each at-once write runs through `confirmContextProposal`'s guarded transaction against the
    context as read; a replay of the same message against old records is refused (`CONTEXT_CHANGED`) and writes nothing.
- **UNDO design: one UNDO per card, not UNDO ALL.** Each at-once write is already its own append-only record with its
  own reversal (CARD-UNDO-001) and its own 10 s window that holds on hover/focus. UNDO ALL would need a multi-record
  undo with partial states (one already undone, one expired, one changed since) for little gain; per-card is simpler
  and exactly correct. He undoes only the part that was wrong.
- Also fixes #560 review note 1: the `alfredAct.ts` header said "a saved or fully-stated meal"; only saved meals run at
  once. The persona's at-once list now also names a set in the workout in progress (already in the rule).

## Leverage gate

- **REUSE:** the registry, `immediateCards`/`runImmediate`/`undoAct` (ALFRED-ACT-001), the helper's clause splitter,
  `describeConfirmError`, the existing card UI; the batch-with-per-item-undo pattern of Gmail/Todoist quick add.
- **OWN:** the per-message cap, the held-card notes and the one-line summary.
- **BUILD FROM SCRATCH:** none.

## Tests and evidence

- `tests/integration/alfredMulti.test.ts` (TZ=UTC and TZ=America/Chicago): multi-part parsing keeps order; an unclear
  part is kept word for word and stops at-once runs; summary lines; held notes (pure); water + weight run at once with
  separate UNDO while sleep and reminder wait and still save; cap at 5 (6 → none; confirm cards not counted); a
  mid-message refusal stops in order with notes and the waiting card still saves; a replayed message writes nothing.
- `tests/browser/AlfredMulti001.test.tsx` at 320 px, axe clean: free helper logs two waters at once with separate
  UNDO (undo one, the other stays) while sleep and the reminder wait; six waters → none at once and the note; Alfred's
  six cards keep their order and get the note.

## Deferred

- Running the clear parts of a partly understood message at once would change #560's rule 2; not done (ask Gavin).
- The free helper doesn't parse protein ("30g protein"); it goes to Alfred or is listed as not understood.
