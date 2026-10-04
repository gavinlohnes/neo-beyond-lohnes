---
id: FIELD-NAV-001
baseline: e0ccb40350eaa4e87bcc90c25d9ff9379d0507e0
risk_tier: ROUTINE
---

# FIELD-NAV-001 // POSITION AND REVEAL RELIABILITY

## Mission

Make mobile navigation and inline disclosures reliably place the requested destination or
actionable surface where Gavin can see and use it, while preserving meaningful active-operation
position such as TRAIN workout resumption.

## Approved baseline

`origin/master` at `e0ccb40350eaa4e87bcc90c25d9ff9379d0507e0`, verified via
`git fetch origin master && git rev-parse origin/master` before activation.

## Risk classification

ROUTINE. This is bounded UI navigation/reveal behavior and browser coverage. None of the
Architectural or High-Risk semantic triggers apply: no Engine, domain, persistence, correction,
backup, dependency, or historical-fixture contract changes are authorized.

## Authorized scope

- Establish the smallest reusable position/reveal primitive justified by current mobile defects.
- Reset unrelated document scroll when navigating between primary tabs.
- Give primary-tab re-taps a simple, conventional, predictable starting-position behavior.
- Bring newly opened inline/disclosure tools into a usable viewport position without violent or
  unnecessary motion, while respecting reduced-motion and focus accessibility.
- Audit representative routine disclosures across TODAY, BODY, MORE, and related surfaces and
  apply the shared behavior where the actual defect exists.
- Preserve active TRAIN workout resumption at the meaningful exercise/set position.
- Add realistic mobile browser tests for navigation, disclosures, bottom navigation, focus,
  reduced motion, and TRAIN resume behavior.

## Explicit exclusions

- No TODAY composition or recommendation-authority change.
- No Engine behavior, priority, evidence-reactivity, or automatic rule-adoption change.
- No navigation redesign, fifth primary tab, or major information-architecture change.
- No schema, persistence, workout-semantic, correction, history, or data-model change.
- No CHECKIN-QUICK-001, TRAIN-HISTORY-001, visual-cleanup campaign, dependency, backend, provider,
  AI, or paid-service work.
- No one-off scrolling calls scattered through screens when one small shared primitive suffices;
  no generalized navigation framework beyond the observed defects.

## Relevant authority / references

- Direct owner authorization for FIELD-NAV-001, 2026-10-03/04.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`: FIELD is glanceable, one-hand, interruption-safe;
  interruption preserves state and intent.
- `docs/UX_DECISIONS.md` and current implementation/tests for protected navigation and TODAY/TRAIN
  behavior.
- Product-reconnaissance evidence: cross-tab scroll inheritance and UPDATE CHECK-IN revealing
  roughly 900px outside the current viewport.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `.claude/skills/beyond-drop/SKILL.md`.

## Required invariants

- Opening something places the requested actionable surface where Gavin can see and use it.
- Navigation position is distinct from operation state; active TRAIN resume behavior remains intact.
- Bottom navigation remains usable and unchanged in meaning.
- Focus never hides actionable headings, inputs, or controls behind browser/navigation chrome.
- Reduced-motion preference changes animation, not positioning correctness.
- TODAY attention/composition, deterministic Engine authority, local-first behavior, historical
  truth, schemas, and workout semantics remain unchanged.

## Acceptance criteria

- Deep scroll in TODAY followed by navigation to MORE presents MORE at its intended start; the
  same contract is proven across other primary tabs.
- Re-tapping the active primary tab returns to its useful starting position predictably.
- Opening UPDATE CHECK-IN brings the revealed form/action into view at a realistic phone viewport.
- A representative BODY disclosure follows the same reveal contract.
- Active TRAIN workout resume still restores the correct exercise/set rather than resetting it.
- Bottom navigation, keyboard/focus operation, and reduced-motion positioning have browser coverage.
- No product, Engine, domain, persistence, schema, or dependency path changes.

## Required verification

- Focused realistic-mobile browser tests covering navigation/reveal behavior and TRAIN resume.
- `npm run check:architecture`.
- `npm run check:risk -- e0ccb40350eaa4e87bcc90c25d9ff9379d0507e0`.
- `npm run verify`.
- `git diff --check`.
- Exact-head PR Verification after the PR opens.

## Builder expectations

- Work only in the isolated `codex/field-nav-001` worktree from the exact approved baseline.
- Audit existing navigation, disclosure, focus, scroll restoration, and active-operation resume
  behavior before changing product code.
- Implement the smallest coherent shared solution; do not broaden the Drop.
- Run required verification, open the PR, persist the Builder handoff, then stop without reviewing,
  integrating, closing, or starting another Drop.

## Reviewer expectations

- Use a separate read-only session and exact PR head.
- Adversarially verify scroll-position isolation, repeat navigation, disclosure visibility, focus,
  reduced motion, bottom navigation, and active TRAIN resume preservation.
- Persist exact-head review evidence on GitHub and never merge.

## Integrator expectations

- Use a separate explicitly authorized session.
- Reverify exact head, CI, independent review, mergeability, and scope before normal protected
  integration; never bypass required checks.
- After merge, truthfully close FIELD-NAV-001 using the repository mechanism and verify master.

## Stop / escalation conditions

- Stop on baseline drift, conflicting active Drop, failed Factory pause, or protected authority
  conflict.
- Stop if correctness requires TODAY composition, Engine/recommendation authority, persistence,
  workout semantics, schema, dependency, or major navigation changes.
- Stop if preserving active TRAIN position conflicts with the requested navigation contract rather
  than guessing which behavior has authority.
