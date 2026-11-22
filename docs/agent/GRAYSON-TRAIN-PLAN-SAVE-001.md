# GRAYSON-TRAIN-PLAN-SAVE-001 — owner-confirmed template set

- **Authorization / lane:** Gavin, 2026-11-21, approved the bounded wording verbatim; **PROTECTED**.
- **Starting commit:** `623e876a` (master after PR #609).
- **Builder / branch:** Codex; `codex/grayson-train-plan-save-001`.
- **Active PR:** [#610](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/610).

## Operator benefit

The useful A/B/C preview can become three real, editable custom templates without Gavin rebuilding
the plan by hand. He sees the exact records first, confirms once, receives an inspectable receipt and
still decides manually whether to start any template.

## Scope and boundaries

- Extend the existing guided draft with an exact final review of all three full-session templates.
- Require one explicit confirmation and create all three or none in one transaction.
- Reject stale retries when an active template with one of the three plan names already exists.
- Reuse the existing `CustomWorkoutTemplate` table, validation, queries, editing, archive and backup.
- Preserve the existing owner-action/`createdAt` provenance and show it in the completion receipt.
- Do **not** assign or activate a programme, change suggestions, add sequence semantics, touch
  Engine/progression/recovery, add schema/dependency/provider/navigation changes, or save the
  short/minimum/home guidance as independent templates.

## Leverage disposition

- **REUSE:** merged plan draft, `createCustomTemplate` validation/storage contract, My Templates,
  native Dexie backup, current modal/foundation patterns.
- **OWN:** atomic three-record confirmation, duplicate guard, exact review and receipt.
- **BUILD FROM SCRATCH:** none; this composes existing template primitives.

## Acceptance evidence

- Review names every exercise, set count and numeric rep range before the write.
- One explicit action creates exactly three active custom templates; validation, interruption or a
  stale retry creates no partial or duplicate set.
- No `TRAIN_PROGRAM_SET`, programme assignment, recommendation, workout or Engine change occurs.
- The receipt identifies owner confirmation, saved records/time, backup inclusion and non-activation.
- Existing template backup/restore remains valid; focused command and browser tests pass.
- Phone-width evidence at 320/360/412 px, required CI and independent exact-head review pass before
  owner-controlled integration.
