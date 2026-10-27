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
2. **REFLECT** (DELTA-002 part 5 + JOURNAL-002; PROTECTED) — one-tap "Not today / Wrong" with an
   optional reason, saved as a Decision Journal entry linked to the recommendation (the dormant
   `linkedRecommendationId`), with a later "how did it go?"; a 30-second shift debrief on the lived
   day. Needs its own approval.
3. **TRY** (DELTA-ADVANCED item 1; PROTECTED, new record kind) — a bounded personal experiment
   compared with your usual, with sample sizes and an honest "no clear difference"; ends with a
   lesson in the journal. Needs its own approval.
4. **REMEMBER** (PROTECTED, advisory) — lessons tied to a situation return as quiet, informational
   notes at that moment; never override a recommendation. Needs its own approval.

## Step 1 — ASK (this PR)

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
