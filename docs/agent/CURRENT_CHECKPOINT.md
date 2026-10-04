# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Codex.** `DUP-MEAL-001` is built and awaits independent review.

- **Drop:** `DUP-MEAL-001` — duplicate-meal prompt. ROUTINE.
- **Baseline:** `origin/master` at `a75da3d2ae605291cb00cf78f1c92a86908d639e` (PR #154 merged).
- **Branch:** `codex/dup-meal-001`.
- **PR:** [#155](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/155). Do not merge without
  independent exact-head review and the owner's approval.
- **Done:** BODY detects a standing meal logged within two minutes when it has the same saved-meal
  ID, or normalized name plus exact effective calories and protein. It asks `Same meal?` under
  the saved-meal row with `KEEP BOTH` / `REMOVE THIS ONE`. KEEP BOTH writes nothing. REMOVE THIS
  ONE voids only the new entry through `voidMealLog`, clears its UNDO banner, refreshes every
  derived total, and confirms the new protein total. The prompt closes when another meal is
  logged and takes precedence over the existing `Same food?` question.
- **Tests added:** pure matching/false-positive/window tests; real-Dexie integration coverage for
  standing/voided entries and meal/protein/Weekly/Day Ledger totals; real-Chromium behavior,
  precedence, one-tap choices, 44 px controls, and 320/360/412 px overflow coverage.
- **Verification run:** `npm run check:architecture`; `npm run typecheck`;
  `npx vitest run --project node tests/engine/sameFood.test.ts tests/integration/duplicateMeal.test.ts`
  (10 passed); `npx vitest run --project browser tests/browser/DuplicateMeal.test.tsx` (3 passed);
  existing `tests/browser/Drop15ProteinTotals.test.tsx` regression suite (7 passed); `npm run
  check:risk -- a75da3d2ae605291cb00cf78f1c92a86908d639e`; `npm run verify`; `npm run build`;
  `git diff --check`. Full verification and production build passed locally.
- **Left:** wait for exact-head PR Verification; independent reviewer checks PR #155, especially false positives and total
  removal; owner approves any merge. Claude/owner adds the as-built `docs/UX_DECISIONS.md` entry
  during review/integration because `AGENTS.md` rule 4 forbids Codex from editing that locked file.
- **Open risks:** matching the same saved-meal ID intentionally wins even if its effective macros
  differ after a correction, exactly as the Drop's OR rule specifies. No schema, event type,
  persistence, TODAY, Weekly/F1, recommendation, or dependency change was made.

## Next safe action

1. Review PR #155 at its exact final head against `docs/agent/drops/DUP-MEAL-001.md`.
2. Add the as-built UX decision entry in a reviewer/integrator-owned commit if required.
3. After green exact-head CI and owner approval, merge; then close the Drop with
   `node scripts/factory-drop.mjs close DUP-MEAL-001 --integration-sha <merge sha>`.

## Repository state preserved

- FOUNDATION-A-F1 remains merged, CLOSED, and in its field-test stop; no F1/F2/F3/F4 files were
  changed.
- Pre-existing untracked `.codex-remote-attachments/` and `research/` directories were untouched.
