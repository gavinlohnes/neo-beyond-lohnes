# Current Checkpoint

Compact, replaceable operational handoff snapshot. This document is superseded wholesale at the
next checkpoint Drop — do not accrete edits onto it indefinitely. It records repository state as
of the Drop that wrote it; it is not itself a source of product doctrine (see `CLAUDE.md` and
`docs/UX_DECISIONS.md` for that).

## REMOTE VERIFIED (origin/master)

- Repository: `gavinlohnes/neo-beyond-lohnes`, default branch `master`.
- `origin/master` HEAD: `2c2c1ecc267a1d6402b5ccb26b551a529397340c` — merge of PR #21
  ("Current Operational Context V1"), verified directly via `git fetch` + `git rev-parse`.
- PR #21 final independently-reviewed head: `d8947033846a446c5d75fc79242d4dbe1a9f0f76`,
  confirmed present in `origin/master` ancestry.
- PR #21 checkpoint results (as reported for that PR, independently reviewed): 885/885 tests
  passing, 81/81 test files passing, typecheck PASS, architecture/boundary checks PASS,
  production build PASS, PWA generation PASS, backup/fixture compatibility PASS, `npm audit`
  0 vulnerabilities, GitHub Pages deployment PASS.

## LOCAL VERIFIED (workstation, at Drop 2 start)

- The checked-out workstation branch at Drop 2 start was `codex/train-visual-hierarchy`
  (2 commits ahead of `origin/master`: `feat: improve train numeric entry`,
  `feat: strengthen train set hierarchy`) — unrelated, unmerged in-progress work. It predates
  PR #21: it does not contain REVIEW, SEARCH, or Current Operational Context V1.
  It was left untouched by this Drop.
- An untracked `.codex-remote-attachments/` directory was present in the worktree and left
  untouched.
- This Drop's own branch, `docs/drop2-factory-checkpoint`, was cut directly from the verified
  `origin/master` SHA above — not from the workstation branch — specifically so this checkpoint
  reflects remote truth rather than a stale local branch.

## PRODUCT STATE

Confirmed present in `src/` as of `origin/master` (`2c2c1ec`):

- **TODAY** (`src/ui/screens/today/TodayScreen.tsx`) — start/end day, state check-in, current
  recommendation, now also Current Operational Context V1 (see below).
- **TRAIN** (`src/ui/screens/train/TrainScreen.tsx`) — A/B/C rotation workouts; per-exercise
  prior-result memory (`src/engine/progression.ts`'s `evaluateProgression`, reads
  `lastSessionSets`, returns `NO_HISTORY` when none exists — scoped to TRAIN progression, not a
  general memory subsystem).
- **BODY** (`src/ui/screens/body/BodyScreen.tsx`) — sleep (PRIMARY/SUPPLEMENTAL), water,
  protein.
- **HISTORY**, nested under MORE (`src/ui/screens/history/HistoryScreen.tsx`) — read-only
  complete history.
- **REVIEW** (`src/ui/screens/review/ReviewScreen.tsx`).
- **SEARCH** (`src/ui/screens/search/SearchScreen.tsx`).
- **Missions & Obligations** — domain types `Mission`/`Obligation`
  (`src/domain/intent/types.ts`), interpreted by `src/engine/obligationRelevance.ts` and
  `src/engine/obligationEligibility.ts`; UI nested under MORE (`IntentScreen.tsx`).
- **Capture** — `captureItem`/`resolveCaptureItem`/`reopenCaptureItem` in
  `src/application/commands.ts`, domain type `CaptureItem`.
- **Recommendation outcomes** — `rateOutcome(beyondDayId, recommendationId, rating)` in
  `src/application/commands.ts`, writes to `db.outcomes`.
- **AdvisoryNotes** — domain type `AdvisoryNote` (`src/domain/intelligence/types.ts`), composed
  in `src/engine/advisory.ts`, queried via `src/application/advisoryQueries.ts`. Explicitly
  informational-only — never surfaced as a `Recommendation`.
- **Deterministic application commands** — `src/application/commands.ts`: ~35 individually
  exported async command functions, one per user action (e.g. `startDay`, `submitCheckIn`,
  `rateOutcome`, `captureItem`). Not split into a `commands/` directory — one flat file.
- **Current Operational Context V1** — `src/application/currentContextQueries.ts`, merged via
  PR #21, consumed by `TodayScreen.tsx`.

No capability beyond this list is claimed. This list reflects `origin/master`, not the
workstation branch (see LOCAL VERIFIED above).

## ACTIVE CAMPAIGN

Current Operational Context V1 — **CLOSED** at its bounded V1 checkpoint (PR #21 merged into
`origin/master` at `2c2c1ec`). No further V1 context work is in flight.

## NEXT DROP

Next PRODUCT campaign: **C1 — SUIT // DAILY DRIVER**.
Next PRODUCT Drop: **SUIT-001 // COMMAND PRESENCE**.

This factory checkpoint (Drop 2) does not begin SUIT-001. It only establishes the delivery
protocol and this handoff snapshot.

## KNOWN EXCLUSIONS / DO NOT BUILD

SUIT-001 // COMMAND PRESENCE does **not** authorize, until an owner ruling or Drop brief says
otherwise:

- Engine/recommendation-policy changes
- Context architecture expansion
- Provider integration
- AI
- New top-level navigation
- Generic dashboard work
- Universal Entity/World State architecture
- Broad OVERWATCH work

## VERIFICATION STATE

Drop 2 (this checkpoint) is documentation-only: it adds `docs/agent/BEYOND_DELIVERY_PROTOCOL.md`
and this file, and nothing else. Verification performed for this Drop:

- `git fetch origin` + `git rev-parse` confirmed `origin/master` and PR #21 ancestry directly
  (see REMOTE VERIFIED).
- `npm run check:architecture` — PASS (no source files touched).
- `npm run check:risk origin/master` — reports process/docs-only diff, Routine tier.
- `git status` / `git diff --stat` confirmed only the two `docs/agent/**` files are part of this
  Drop's change.
- Full suite (`npx vitest run`, browser project, production build) was not re-run locally for
  this docs-only Drop, per this repo's own risk-classification guidance that a process/docs-only
  diff is Routine; `pr-verify.yml` runs the full chain (architecture, typecheck, full test suite
  including the browser project, risk classification, production build) automatically on the PR
  before any merge decision.

## HANDOFF NOTES

- Treat this file as replaceable in full at the next checkpoint Drop, not as an append log.
- The workstation had unrelated in-progress work (`codex/train-visual-hierarchy`) at the time of
  this checkpoint; a future agent should re-verify workstation branch state rather than assume
  it matches `origin/master` or matches this document's LOCAL VERIFIED section, which is a
  snapshot, not a live status.
- REVIEW, SEARCH, and Current Operational Context V1 are real, merged, `origin/master` features
  — verify this against source directly rather than trusting a workstation branch that may
  predate them.
