# LOOP — Ask → Reflect → Try → Remember (campaign)

- **Authority:** Gavin, 2026-10-27: "Go loop", approving the proposed campaign and its first step,
  and confirming ownership: Claude Code owns THE LOOP (including personal experiments and pushback);
  Codex keeps Personal Understanding (PERSONAL-UNDERSTANDING-001) and memory (MEMORY-001, #303).
  Steps 2–4 feed Codex's Personal Understanding view rather than duplicating it.
- **Why:** BEYOND records and explains but does not close the loop. The Decision Journal, Capture,
  Weekly Review, "Why this?", rotation patterns and personal ranges exist separately; you cannot
  ask a question, try something deliberately, push back with a reason, or have a lesson return
  when it would help.
- **Campaign approval is not step approval.** Each step gets its own scope and PR; Protected steps
  get explicit bounded approval before implementation. Every merge is Gavin's.

## Steps

1. **ASK** (DELTA-002 part 3; FEATURE; approved) — question buttons in Whole Picture answered by
   rules from recorded days, every line tapping through to its days; "not enough recorded yet"
   names what is missing. No writes, no Engine input, no AI.
2. **REFLECT** (DELTA-002 part 5 + JOURNAL-002; PROTECTED; approved 2026-10-27, "go reflect") —
   one-tap "Not today / Wrong" with an optional reason, saved as a Decision Journal entry linked to
   the recommendation (the dormant `linkedRecommendationId`), with a later "how did it go?"; a
   30-second shift debrief on the lived day.
3. **TRY** (DELTA-ADVANCED item 1; PROTECTED; approved 2026-10-27, "go try", journal-backed) — a
   bounded personal experiment compared with your usual, with sample sizes and an honest "no clear
   difference"; ends with a lesson in the journal.
4. **REMEMBER** (PROTECTED, advisory; approved 2026-10-27, "go remember") — lessons tied to a
   situation return as quiet, informational notes at that moment; never override a recommendation.

## Step 1 — ASK (#305, merged)

- **Questions:** What changed in my last block? · How did my last flip into nights go? · What's
  normal for me, work days vs days off? · When do I usually train?
- **Rules:** means need `PICTURE_MEAN_FLOOR` (3) days per side; the run cut by the 56-day window is
  left out of shift-number comparisons (as in ROTATION-002); flips and usual times reuse
  ROTATION-003; workout starts reuse ROTATION-004 marks. Patterns, not causes.
- **REUSE:** Whole Picture rows and day inspector; rotation runs/positions/flips; tab pattern.
  **OWN:** `application/askProjection.ts` answer rules. **BUILD FROM SCRATCH:** none.
- **Excluded:** free-text questions, AI, writes, TODAY changes, Engine input.
- **Acceptance:** unit tests for each answer and each "not yet"; browser test of the tab, answers
  and tap-through at phone width with axe; full verify; CI; Gavin's merge.

## Step 2 — REFLECT (#306, merged)

- **Authority:** Gavin, 2026-10-27, "merge 305 and go reflect", approving the proposed scope: no
  Engine or recommendation change, no schema change, the journal's existing commands; stop and ask
  if a new event type is needed (none was).
- **Built:** after "Not doing this" on TODAY's recommendation card, an optional "Why not?" (Not
  today / Wrong for me, plus a note) saved as a journal entry with `linkedRecommendationId`; a
  closed-by-default 30-second shift debrief in the post-shift row (how it felt, what mostly made it
  so, one thing for next shift; one per lived day); and "How did it go?" at the top of the Journal
  from the next lived day (16:30), answered by one tap through the journal's own review.
- **Contract change (bounded):** `createDecisionJournalEntry` accepts `linkedRecommendationId` at
  creation only (not in modify), and `DECISION_JOURNAL_CREATED`'s payload carries it when set. The
  record field and its validation already existed; no schema or backup change.
- **Note:** reviewed entries already feed JOURNAL-001's advisory relevance match, so a lesson
  written here can appear there like any other reviewed decision. Informational only.
- **REUSE:** decline flow and RED override guard; Decision Journal commands, queries and review;
  chip pattern. **OWN:** `application/reflect.ts` (linking, lived-day follow-up rule, debrief
  shape). **BUILD FROM SCRATCH:** none.
- **Excluded:** TRAIN's workout-call "NOT TODAY" (not a Recommendation record), Engine input,
  surfacing follow-ups on TODAY, AI.
- **Acceptance:** integration tests for linking, the lived-day rule, review and debrief; browser
  tests of the TODAY decline path, debrief and Journal follow-up at phone widths with axe; full
  verify; CI; Gavin's merge.

## Step 3 — TRY (#309, merged)

- **Authority:** Gavin, 2026-10-27, "Merge it and go try", approving the proposed journal-backed
  version (no schema change, no new event type, no Engine input).
- **Built:** Journal → Experiments → TRY SOMETHING: what you'll try, 7/14/28 days starting with the
  current lived day, on work days / days off / every day, and an optional expectation. A running
  experiment shows as one quiet line under TODAY's mode ("Trying: … · day 3 of 14"). Its card shows
  results so far and at the end: main sleep, check-in energy and training on the experiment's days
  against your usual days of the same kind in the Whole Picture window, with day counts on each
  side; gaps under 15 min of sleep or 0.3 energy read "about the same"; fewer than 3 days a side
  says what is missing. Closing it (It helped / No clear difference / It didn't help + lesson) is
  the journal's own review.
- **Storage:** an ordinary journal entry titled "Try: …" whose context starts with one fixed window
  line (`Window YYYY-MM-DD for N days · WORK|OFF|ALL`) written and read by
  `application/tryExperiment.ts`. Editing that line away turns it back into a plain entry.
- **Not in scope:** per-day "did I do it" marking, reminders, Engine input, AI, causal claims.
- **REUSE:** Decision Journal commands/review, Whole Picture rows and `PICTURE_MEAN_FLOOR`, the
  lived-day boundary, REFLECT's chip pattern. **OWN:** the window line, the comparison rule and its
  "about the same" thresholds. **BUILD FROM SCRATCH:** none.

## Step 4 — REMEMBER (#310, merged)

- **Authority:** Gavin, 2026-10-27, "go remember".
- **Built (structural matches only, never keywords or inference):**
  - TODAY's recommendation card: the most recent *reviewed* reason you gave for declining an
    earlier recommendation of the same kind ("Last time (Oct 20) you said “Wrong for me”. Looking
    back: should have done it. Your lesson: …"). Loaded in TODAY's own refresh with the existing
    "Previous result", so nothing appears late; a failed read leaves it out.
  - Under the mode in PREP: your last debrief's "one thing for next shift", from the next lived
    day, with how it went once answered.
  - TRY SOMETHING: lessons from closed experiments (up to three, newest first).
- **Boundaries:** informational only; never changes, ranks, suppresses or re-words a
  recommendation; not an Engine input; no new record, event or schema. Codex's MEMORY-001
  preferences and JOURNAL-001's keyword advisory are untouched and separate.
- **REUSE:** REFLECT links and debriefs, TRY entries, the journal's review fields, TODAY's existing
  refresh and recommendation card. **OWN:** `application/remember.ts` (which conclusion applies
  when). **BUILD FROM SCRATCH:** none.

## LOOP-002 — one post-shift moment, follow-ups where they belong

- **Authority:** Gavin, 2026-10-27, "go LOOP-002", after Claude's review of the finished loop found
  the follow-ups buried in the Journal and the debrief duplicating NOTES-HANDOFF-001.
- **Changed:**
  - The separate 30-second debrief card is removed. The existing handoff prompt after MARK WORK
    ENDED now asks "How was it?" (Rough / OK / Good, optional) above "Note for next shift?"; the
    note is the debrief's plan. Feeling only saves just the debrief and closes the prompt.
  - The next shift's "From last shift" row asks "Did this happen?" (Did it / Didn't get to it /
    Changed my mind); one tap answers the debrief and puts the note away. GOT IT alone still works.
  - A reason given for declining advice is asked about ("Looking back?") on the next
    recommendation card of the same kind; once answered, REMEMBER's lesson line takes its place.
  - REMEMBER's PREP debrief line is removed: "From last shift" already carries the note.
  - The Journal's "How did it go?" stays as the fallback list.
- **Boundaries:** no new TODAY row (Command Center rule 4): everything rides on the existing
  handoff and recommendation card. No Engine, schema, event-type or recommendation change; the
  handoff events are unchanged.
- **REUSE:** NOTES-HANDOFF-001 prompt/state/events and SKIP, REFLECT/REMEMBER modules, the journal
  review. **OWN:** `closeShift`, `debriefForNote`, `pendingForKind`. **BUILD FROM SCRATCH:** none.
