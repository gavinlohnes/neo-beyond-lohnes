# Current Checkpoint

Compact, replaceable operational handoff snapshot. This document is superseded wholesale at the
next checkpoint Drop — do not accrete edits onto it indefinitely. It records repository state as
of the Drop that wrote it; it is not itself a source of product doctrine (see `CLAUDE.md` and
`docs/UX_DECISIONS.md` for that) or of factory/process doctrine (see `AGENTS.md` and
`.claude/skills/beyond-drop/SKILL.md` §8 for that).

**Supersedes** the prior checkpoint (written at `origin/master` `1003518`, PR #26), which had
drifted 29 merged PRs stale — it described Nutrition, the FIELD/SHELL visual consolidation, and
the entire Factory-Autopilot arc as not yet existing, when all of it had since merged.

## REMOTE VERIFIED (origin/master)

- Repository: `gavinlohnes/neo-beyond-lohnes`, default branch `master`.
- `origin/master` HEAD: `e78a73a9b054d7cee5734176580e8a0e5b330839` — merge of PR #55
  (`factory-contract-bootstrap-001`), verified directly via `git fetch origin master` +
  `git rev-parse` on 2026-09-02.
- Fresh-clone verification run this same session: `npm ci` clean; `npx tsc -b` clean (0 errors);
  `npm run check:architecture` — PASS, 70 files scanned, 0 violations; `vitest run --project
  node` — 67 test files passed, 824 tests passed, 1 skipped. (Browser/Playwright project not
  re-run in that session; its 22 test files are confirmed present by listing, not by execution.)
- PRs #28–33 (Visual-001–004, TRAIN-003, NUTRITION-001) and #34–46 (FACTORY-002,
  CONTINUITY-001, TODAY-002–006, DOCTRINE-001, FIELD-001, FIELD-ARCH-001,
  FIELD-PROTOTYPE-001, SHELL-001) are real, merged product/visual/doctrine work.
- PRs #47–55 (FACTORY-AUTOPILOT-001, AUTOPILOT-AUTH-002, the Phase-2 campaign-authorization
  revision, and the Builder GitHub App identity bootstrap) are Factory-process work — no
  product-facing change landed in that span. See FACTORY / OPERATING MODEL below for the owner
  ruling this produced.
- `ACTIVE_DROP.md`: `AUTOPILOT-AUTH-002`, status `CLOSED`, integration SHA
  `407fcb68a6c3abcc6104a570f5d2bd9666673b5f`. No Drop is currently `ACTIVE`.
- PR #54 (`AUTOPILOT-CANDIDATE-DISPATCH-002`) is **closed, not merged** (verified live via
  GitHub on 2026-09-02) — per `FACTORY_AUTOPILOT.md`'s own instruction that it is "permanently
  superseded... must never be merged." No further action needed on it.

## PRODUCT STATE

Confirmed present in `src/` as of `e78a73a` by direct file inspection (not by re-reading a prior
checkpoint's claims):

- **TODAY** (`src/ui/screens/today/TodayScreen.tsx`, 2,448 lines, 52 `useState` hooks) —
  start/end day, state check-in, current recommendation + WHY trace, RESET/SHIFT DOWN, work
  context, Commitments (Missions/Obligations) card, minimum-day summary.
- **TRAIN** (`TrainScreen.tsx`, 1,179 lines) — A/B/C rotation, per-exercise progression advisory
  (`engine/progression.ts`), direct weight/rep entry.
- **BODY** (`BodyScreen.tsx`, 1,373 lines) — sleep (PRIMARY/SUPPLEMENTAL), water, protein,
  bodyweight, nutrition/meal logging (`SavedMeal`, fully manual — no food-data source yet).
- **MORE** — backup/restore, diagnostics, and nested **HISTORY**, **REVIEW**
  (`getRecommendationLedger`), **SEARCH** (`searchQueries.ts`, read-only, no ranking library,
  no tap-to-navigate as of this checkpoint), **Missions & Obligations**
  (`IntentScreen.tsx`), **Work Schedule**.
- **Capture** — `captureItem`/`convertCaptureToObligation`, fully manual triage, no derived
  fields from capture text as of this checkpoint.
- **Recommendation outcomes** — `rateOutcome` writes a rating; `getPriorOutcomeMemory` displays
  it once as history; explicitly documented as never an Engine input as of this checkpoint.
- **AdvisoryNotes** (`engine/advisory.ts`) — composes `obligationRelevance` + `progression`
  output into informational-only notes; never a `Recommendation`.
- **Engine** (`src/engine/`, 904 lines total) — `evaluate.ts` selects one of 5 recommendation
  kinds from `Capacity` (locked threshold rule) + 2 booleans only. Obligations do not
  participate in arbitration as of this checkpoint (see NEXT OPERATION — this is now
  owner-authorized to change).

No `MIND`, `COMMAND`, or `LINK` capability exists in `src/` as of this checkpoint — those remain
correctly out of scope (see KNOWN EXCLUSIONS).

## FACTORY / OPERATING MODEL

**Factory-automation investment paused — direct owner ruling, 2026-09-02.** No further
campaign-authorization schema version, Autopilot capability, or Builder-identity mechanism
beyond what already exists in `scripts/factory-*.mjs` is authorized until the current mechanism
has actually carried several real product Drops through it. This does not retire the existing
Drop contract / `ACTIVE_DROP` / risk-classification mechanism, which remains in force — it stops
*further elaboration* of the automation layer itself. `FACTORY_PHASE_2.md`'s remaining sequence
(`AUTOPILOT-CANDIDATE-DISPATCH-002` onward) is not activated under this ruling.

Builder/Reviewer/Integrator role separation, no-self-merge, and exact-head review remain
unchanged and in force for the product work below — see `AGENTS.md` /
`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.

## NEXT OPERATION

Direct owner ruling, 2026-09-02: a specific product/architecture backlog was reviewed and
explicitly authorized item-by-item (see `docs/agent/CAPABILITY_MAP.md` for the researched basis
of each). Recorded here so a fresh session does not have to reconstruct authorization from chat
history:

**Authorized, no gate needed (Routine, in progress via this Drop/foundation work):**
- This Capability Map + checkpoint refresh.
- Decompose `TodayScreen.tsx` into sub-components (behavior-preserving).
- Search-to-navigate wiring.
- Verify GitHub CodeQL/Dependabot/secret-scanning enablement.

**Authorized, dependency additions (each still runs as its own High-Risk Drop with real
verification — authorization removes the "should we ask the owner" step, not the Drop itself):**
- MiniSearch (Search ranking/retrieval).
- chrono-node + Compromise (Capture date/entity extraction).
- fast-check, dev-only (property-based tests).
- Lucide React (icon grammar) — re-evaluate now, per its own stated re-evaluation trigger.

**Authorized, schema additions (each still runs as its own High-Risk Drop):**
- Decision Journal (Context→Options→Decision→Reasoning→Expectation→Outcome→Lesson).
- Nutrition food lookup via USDA FoodData Central.
- Obligation recurrence via rrule.js.
- TRAIN Wave-A prototype slate (Prepared Set Row, Set Commit Choreography, Persistent Rest,
  Workout Secured).

**Authorized, Engine/recommendation-priority change (Architectural, explicit escalation
category — authorization obtained, still requires its own careful Drop contract given RED
capacity's priority must not be weakened):**
- Obligations (OVERDUE/DUE_TODAY) participate in recommendation arbitration as a new kind.
- Rated Outcome history biases/tie-breaks recommendation selection.

No sequencing/priority order among these was fixed by the authorization itself — a fresh session
should confirm current sequencing with the owner rather than assume the order listed above.

## KNOWN EXCLUSIONS / DO NOT BUILD

Unchanged, still not authorized: COMMAND desktop implementation, LINK/AI conversational channel,
cloud/provider backend or account system, universal Entity/World State architecture, generic
dashboard work, broad OVERWATCH work. Added by this checkpoint: further Factory-automation
capability beyond what exists today (see FACTORY / OPERATING MODEL above).

## VERIFICATION STATE

This checkpoint Drop is documentation-only (this file, `CLAUDE.md`'s Pointers section, and the
new `docs/agent/CAPABILITY_MAP.md`) plus, in the same Drop, a behavior-preserving `TodayScreen`
decomposition if bundled — check the actual diff of the Drop that carries this checkpoint rather
than assume from this paragraph alone. Verification performed:

- `git fetch origin master` + `git rev-parse` confirmed `origin/master` at `e78a73a` directly.
- `npm ci` + `npx tsc -b` + `npm run check:architecture` + `vitest run --project node` all green,
  captured above under REMOTE VERIFIED.
- PR #54's closed (not merged) state confirmed live via GitHub, not assumed from
  `FACTORY_AUTOPILOT.md`'s prose alone.

## HANDOFF NOTES

- Treat this file as replaceable in full at the next checkpoint Drop, not an append log — the
  prior checkpoint's failure to be refreshed for 29 PRs is exactly the failure mode to avoid
  repeating.
- Verify `origin/master`'s actual HEAD directly before relying on the SHA above.
- Before starting any of the NEXT OPERATION items, re-confirm with the owner that the
  authorization above still stands and ask for current sequencing preference — it was not fixed.
