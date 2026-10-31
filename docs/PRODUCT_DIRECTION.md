# BEYOND — Product Direction

Owner ruling, 2026-10-09. This is the concise reference for product vision and creative approach.
DEV-FLOW-002 remains the workflow authority; operator doctrine, locked UX decisions and the
engineering contract govern behavior and safeguards. This direction grants no standing approval
for product implementation, protected changes, purchases or merges.

**Build boldly. Verify carefully. Let the owner judge the experience.**

## Build an exceptional application for one operator

BEYOND is a private, local-first, offline-first personal operating system. Connect health,
nutrition, training and recovery with work, sleep, capacity, goals, habits, accomplishments and
history. Become more useful through trustworthy information, transparent rules and meaningful
context. Make everyday operation cohesive, responsive, polished and enjoyable; require less
attention rather than accumulating features or a cluttered dashboard. Preserve BEYOND's
distinctive identity while allowing its design to evolve.

## Contribute judgment and creative initiative

AI collaborators research, invent, challenge weak assumptions, simplify workflows and recommend
ambitious improvements beyond the roadmap. Translate informal feedback into useful objectives;
explain tradeoffs and recommend the strongest option rather than merely agreeing. Gavin decides
product direction, priorities, protected boundaries, material costs and every merge.

Within an approved objective, resolve routine design and engineering choices independently and
correct reasonable quality problems before presenting the result. Historical implementation
choices are starting points, not permanent constraints. Locked decisions remain binding until
Gavin approves a specific revision; explain its benefit and tradeoff, then record the amendment
in the existing authority document. Do not silently override doctrine or expand scope. Offer
valuable out-of-scope ideas concisely for later consideration.

## Research first. Reuse intelligently.

Use the existing AGENTS.md leverage gate, not a second research process. Consider BEYOND's own
components, native platform capabilities, proven interactions and maintained open-source work
before custom code. Learn from excellent commercial applications without copying restricted
source, assets or identity. Check applicable laws, licensing, attribution, access restrictions, privacy, security,
compatibility, performance and total maintenance cost. Prefer a small original implementation
when it serves the outcome better than a dependency. Build custom work where it adds BEYOND value.

## Deliver complete experiences

Approve clear outcomes and meaningful boundaries, not unnecessarily tiny batches. Consider the
whole journey: start, act, record, correct, interrupt, resume, review and return to life. Use
multiple PRs when risk, complexity, dependencies or reviewability justify them, not by default.
Judge usefulness, task speed, cognitive burden, visual polish, phone usability, accessibility,
integration and recoverability alongside technical correctness. Use realistic end-to-end evidence;
distinguish observed behavior from predicted benefit. Refine weak experiences without endless
polishing. **BUILD → USE → LEARN → REFINE → BUILD AGAIN.**

## Alfred: intelligence is part of BEYOND

Owner ruling, 2026-10-31 (RULES-2026-10-31, "approve the new rules"), replacing the 2026-10-09
"AI optional" ruling. **Alfred is a core part of BEYOND**: Claude, through the Anthropic API,
understands the operator in plain words, proposes logs and reminders, answers questions from
BEYOND's own records, and plans with him. Alfred's limits:

- **Never invents facts.** Answers come from BEYOND's records, name their sources, and say "I don't
  know" when the records don't say.
- **The operator confirms every change.** Alfred proposes records as cards; saving runs BEYOND's own
  commands, with the usual corrections and history.
- **Recommendations stay with BEYOND's deterministic Engine** for now. Alfred explains and plans;
  whether he may recommend is a later owner decision.
- **Off is always one switch away**, and BEYOND keeps working without him.

## Keep collaboration light and safeguards strong

EXPLORE proposes without implementation authority; BUILD executes an approved objective with
initiative; REFINE responds to feedback. These are conversational modes, not gates or documents.
Keep concise continuity in GitHub, one active Builder per objective, and DEV-FLOW-002's existing
proportionate checks and independent exact-head review for Protected work. Every merge is Gavin's.
Preserve the operator's ownership of his data, security, offline logging, provenance, data and backup compatibility,
corrections/undo, interruption recovery, accessibility, deterministic recommendation authority,
honest uncertainty and user control. Consequential automation, destructive migrations, new external
services/accounts beyond those approved (Anthropic, the free food databases), meaningful costs and
protected changes require explicit approval.

**Online is allowed (RULES-2026-10-31).** The operator's data lives on his phone and is always his:
backed up, exported and never lost. BEYOND may use online services when they add real value; logging
and the core day still work without a signal, and an online feature that is unavailable says so.
BEYOND may notify the operator at his key moments (waking, before work, after a shift, reminders): a
few a day at most, each one easy to turn off.

**AI handles complexity. The owner retains control.**
