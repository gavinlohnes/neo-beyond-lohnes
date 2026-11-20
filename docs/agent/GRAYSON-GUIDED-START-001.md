# GRAYSON-GUIDED-START-001 — guided start and confirmed understanding

## Authorization and lane

Gavin approved this **Protected implementation objective** on 2026-11-20. Starting master:
`84afb8cc810bba2cbed307082aa7fb992debcb15` (PR #604 merged). Builder: Codex. Branch:
`codex/grayson-guided-start-001`. PR: pending.

## Operator outcome

Gavin can open **A PLACE TO START**, choose one useful part of life, answer one question and inspect
the exact understanding before anything is retained. He may change it, postpone it, leave and return
during the same app session, or review/correct confirmed memory. The rest of BEYOND always remains
available.

## Scope

- Evolve the existing guide and memory surfaces into one phone-first guided teaching journey.
- Offer a small fixed set of useful subjects grounded in the approved Guided Operating Loop.
- Ask one question at a time and explain why it matters.
- Reuse visible confirmed memory as related context when available.
- Keep answers as UI drafts until Gavin explicitly confirms the proposed words.
- Save confirmed understandings through the existing `recordMemory` command as operator-authored
  personal memory with existing provenance, correction and retirement history.
- Preserve the existing optional Journal/Plans/Capture starts and direct memory editor.

## Exclusions and boundaries

- No AI provider, generated inference, autonomous memory or hidden profile.
- No primary-navigation, Engine, recommendation-priority, Mission, obligation or plan change.
- No schema, event semantic, backup, Google Drive or health-plan-builder change.
- A confirmed understanding does not automatically change guidance or a plan.
- Draft resumption is limited to the mounted app session; no new persistence contract is introduced.

## Acceptance evidence

- At 320, 360 and 412 px, Gavin can choose a subject, answer, postpone, resume, inspect/edit the exact
  proposed words, explicitly confirm, and open the resulting memory.
- Before confirmation there is no `MEMORY_RECORDED` write; confirmation creates exactly one existing
  `PERSONAL_FACT` causal chain attributed to the operator.
- Related confirmed facts are labeled as existing evidence; unavailable memory is not presented as
  empty and retry does not discard the draft.
- Direct Journal/Plans/Capture paths and the full memory editor remain available.
- Recommendations and Engine behavior are unchanged; accessibility, focused browser coverage,
  typecheck/build, realistic phone evidence, required CI and independent exact-head review pass.

## Leverage disposition

- **REUSE:** `GuidedOverview`, `getGuidedMoreStarts`, `MemoryPanel`, `getMemoryFacts`, `recordMemory`,
  `MEMORY_RECORDED`, and the established correction/retirement/provenance lifecycle; the approved
  Guided Operating Loop’s one-question and confirmation pattern.
- **OWN:** the small GRAYSON subject/question set and the mapping from an explicitly confirmed answer
  to existing personal-memory topics.
- **BUILD FROM SCRATCH:** none. No new store, session engine, provider or dependency.
