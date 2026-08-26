# Current Checkpoint

Compact, replaceable operational handoff snapshot. This document is superseded wholesale at the
next checkpoint Drop — do not accrete edits onto it indefinitely. It records repository state as
of the Drop that wrote it; it is not itself a source of product doctrine (see `CLAUDE.md` and
`docs/UX_DECISIONS.md` for that) or of factory/process doctrine (see `AGENTS.md` and
`.claude/skills/beyond-drop/SKILL.md` §8 for that).

## REMOTE VERIFIED (origin/master)

- Repository: `gavinlohnes/neo-beyond-lohnes`, default branch `master`.
- `origin/master` HEAD: `10035186d8969487a79597a47a30606c1d951924` — merge of PR #26, verified
  directly via `git fetch origin master` + `git rev-parse`.
- PR #24 / **SUIT-001 // COMMAND PRESENCE** merged at `d4ce068171fe32cc94fba5928885af2ba694bc8a`
  — strengthened TODAY command presence.
- PR #25 / **SUIT-002 // TRAIN INPUT VELOCITY** merged at
  `ba6e47b79977ce1ddc19ee9ebddbff31c023b60d` — direct weight/rep entry in active TRAIN execution
  made first-class (accessible names, mobile keyboard hints, select-on-focus replace), existing
  SAME AS LAST TIME / −/+ / LOG / SKIP behavior preserved.
- PR #26 / **FACTORY // CODEX BUILDER CUTOVER** merged at
  `10035186d8969487a79597a47a30606c1d951924` — direct owner ruling ending the Pilot V1 role lock
  (see FACTORY / OPERATING MODEL below).

## PRODUCT STATE

Confirmed present in `src/` as of `origin/master` (`1003518`) — unchanged in shape since the
last checkpoint, with TODAY and TRAIN each carrying their SUIT-001/SUIT-002 ergonomics work:

- **TODAY** (`src/ui/screens/today/TodayScreen.tsx`) — start/end day, state check-in, current
  recommendation, Current Operational Context V1, now also SUIT-001's strengthened command
  presence.
- **TRAIN** (`src/ui/screens/train/TrainScreen.tsx`) — A/B/C rotation workouts; per-exercise
  prior-result memory (`src/engine/progression.ts`'s `evaluateProgression`, reads
  `lastSessionSets`, returns `NO_HISTORY` when none exists — scoped to TRAIN progression, not a
  general memory subsystem); now also SUIT-002's direct weight/rep entry ergonomics.
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
- **Deterministic application commands** — `src/application/commands.ts`: individually exported
  async command functions, one per user action (e.g. `startDay`, `submitCheckIn`, `rateOutcome`,
  `captureItem`). Not split into a `commands/` directory — one flat file.
- **Current Operational Context V1** — `src/application/currentContextQueries.ts`, consumed by
  `TodayScreen.tsx`.

No capability beyond this list is claimed. There is no `Nutrition`, `MIND`, or `COMMAND` screen
in `src/` as of this checkpoint — those names below refer to the *scope of an approved
next operation*, not to existing product surfaces.

## ACTIVE CAMPAIGN

**C1 — SUIT // DAILY DRIVER**: SUIT-001 (COMMAND PRESENCE, TODAY) and SUIT-002 (TRAIN INPUT
VELOCITY) are both merged, per REMOTE VERIFIED above. No further SUIT Drop is in flight as of
this checkpoint.

## FACTORY / OPERATING MODEL

**FACTORY // CODEX BUILDER CUTOVER** (PR #26, merged `1003518`): direct owner ruling ending and
superseding the former Pilot V1 role lock. Codex is now authorized to act as a Builder when
explicitly assigned to a Drop — this does not retire Claude and does not make Codex the
exclusive or default Builder. Gavin assigns either Claude or Codex as Builder per Drop, based on
availability and suitability; only one agent owns Builder for a given Drop. Builder, Reviewer,
and Integrator remain three separate sessions on any one Drop; no session reviews or merges its
own work. This checkpoint records the operational fact only — the full operating model lives in
`AGENTS.md` and `.claude/skills/beyond-drop/SKILL.md` §8; do not duplicate that detail here.

## NEXT OPERATION

Next approved product-design operation: the **Visual Synthesis Round** across TODAY, TRAIN,
Nutrition, MIND, and COMMAND/Review.

**No visual implementation is authorized until owner review selects the grammar.** This
checkpoint does not begin that round — it only records that it is the next approved operation.

## KNOWN EXCLUSIONS / DO NOT BUILD

Until an owner ruling or Drop brief says otherwise, still not authorized:

- Engine/recommendation-policy changes
- Context architecture expansion
- Provider integration
- AI
- New top-level navigation
- Generic dashboard work
- Universal Entity/World State architecture
- Broad OVERWATCH work
- Any visual implementation for the Visual Synthesis Round, ahead of owner grammar selection
  (see NEXT OPERATION above)

## VERIFICATION STATE

This checkpoint correction (FACTORY // CODEX BUILDER CUTOVER — OPERATIONAL CLARITY) is
documentation-only: it replaces this file wholesale, generalizes one Reviewer-assignment phrase
in `.claude/skills/beyond-drop/SKILL.md`, and splits `AGENTS.md`'s role guidance into explicit
BUILDER MODE / REVIEWER MODE / DEFAULT MODE / INTEGRATOR sections — nothing else. Verification
performed for this Drop:

- `git fetch origin master` + `git rev-parse` confirmed `origin/master` at `1003518` directly,
  not assumed.
- `npm run check:architecture` — PASS (no source files touched).
- `npm run check:risk origin/master` — reports process/docs-only diff, Routine tier.
- `git status` / `git diff --stat` confirmed only the three intended files are part of this
  Drop's change.
- Full suite (`npx vitest run`, browser project, production build) was not re-run locally for
  this docs-only Drop, consistent with this repo's own risk-classification guidance and prior
  checkpoint precedent; `pr-verify.yml` runs the full chain automatically on the PR before any
  merge decision.

## HANDOFF NOTES

- Treat this file as replaceable in full at the next checkpoint Drop, not as an append log.
- Verify `origin/master`'s actual HEAD directly before relying on the SHA above — this is a
  snapshot, not a live status.
- The Visual Synthesis Round (NEXT OPERATION above) is scope-naming only; it does not itself
  authorize any implementation, visual or otherwise.
