# Claude Code handoff — PERSONAL-CONTEXT-001

## Ownership and status

Gavin explicitly transferred this work to Claude Code: “Wrap up. We are handing it over to
Claude Code.” Codex stops implementation after this docs-only handoff. Continue the existing
objective and branch; no competing rebuild or new feature campaign. Read AGENTS.md first.

- Branch: `codex/personal-context-001` (pushed).
- Reviewed implementation/evidence head before this handoff: `3ed0b02b9768cd54376641f36a61a3e7b4df23f6`.
- Full verified source/test head: `579ae55b21977240ad8d90eacf3ca32b5fd17cd4`.
- Fresh master: `f00104991444332ea836b46ef96db88924a858cb` (#352), already integrated.
- This handoff adds documentation only; its commit is intentionally later than the attested head.
- No PR created, no CI observed, no merge/deployment authorized or performed.
- Git fetch/push works. GitHub GraphQL/REST and `gh pr create` return Forbidden in Codex's
  environment. Check Claude's own access; do not assume the same restriction applies there.

## Scope and source documents

[Implementation brief](PERSONAL-CONTEXT-001.md) owns the approved bounded scope.
[Research/design](PERSONAL-OS-001.md) and [voice design](ALFRED-COMMUNICATION-DESIGN.md)
explain the direction. Gavin wants connected personal understanding, not a separate task app.
Guilt is prohibited; original Delta-inspired voice is calm, precise and direct with practical warmth.
Proactive messaging remains undecided. Goals/Projects design is parked, not an implementation order.

Built: DIRECTION/CONSTRAINT facts reuse MEMORY-001 history/editor; Personal Understanding's
My context entry; current Mission/memory source catalog; explicit conversation sharing;
source inspection/canonical navigation; context refresh/reset; per-card atomic guards around
existing commands. No own Engine, schema, dependency, workflow or protected-fixture changes
relative to current master. Preserve #352's automatic weekly review and memory manager.

Important integration distinction: automatic briefs/reviews retain existing PREP/RECOVERY
context, but exclude Mission/direction/constraint sources. Interactive planning calls the base
context with prep/recovery disabled, then adds MEMORY-001 sources only through the opt-in catalog.
Historical MEMORY_RECORDED/MISSION events must not bypass exclusions through search.

## Verification and independent review

- Full `npm run verify` exit0 at579ae55: 362 files passed/one skipped; 3226 tests passed/two
  existing skips; architecture374 files; TypeScript, build and PWA green. Suite613.82s.
- Existing skips: compile-time nutrition signature guard and environment-gated visual Audit.
- Command: `VITEST_MAX_WORKERS=2 PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run verify`.
  Paths are Codex-environment-specific; use Claude's installed browser/cache path.
- Independent reviewer node8/8 PASS; exact3ed0b02 PASS persisted as a Git note on GitHub:
  `refs/notes/personal-context-001-review`. If needed fetch normally, without force:
  `git fetch origin refs/notes/personal-context-001-review:refs/notes/personal-context-001-review`
  then `git notes --ref=personal-context-001-review show 3ed0b02`.
- [Tracked source-review history](reviews/PERSONAL-CONTEXT-001.md).
- [Built-PWA proof](../screenshots/personal-context-001/README.md), source579ae55 in acceptance.json:
  four sizes, offline reload/local capture/source inspection, reduced motion at390,
  zero page errors/overflow. Synthetic records and mocked API only.
- Landscape source screenshot clips lower controls; it is not evidence that every control is
  visible simultaneously. Canonical source navigation separately passes browser regression.
- Live Claude quality, actual API cost and physical-phone behavior are unmeasured.
- Existing bundle-size warning remains. No current test failure.

Resolved findings to preserve: old cards originally used the latest request's snapshot.
Each turn now owns its immutable day/source/task versions, checked atomically with its save.
Target task title must match displayed title. Draft editor must remain mounted across Review
collapse/refresh. Focus assertion waits for its existing RAF through bounded polling; no
assertion/config/timeout weakened. All-table guards preserve multi-card saves for distinct tasks.

## Next actions, in order

1. Fetch master, inspect branch/worktree and open work. Preserve the current implementation.
   If master advanced, inspect overlap before integrating; obtain renewed review for changes.
2. Renew independent exact-head confirmation for this docs-only handoff head. Existing source
   verification carries forward; do not repeat the full suite solely for documentation.
3. Open one PR against master from this branch when GitHub access works. Suggested title:
   `PERSONAL-CONTEXT-001: connect what matters to Alfred planning`.
4. Put exact-head independent review in the PR, link the Git-note attestation/source report,
   require green required CI, and resolve any findings within this objective.
5. Gavin approves every merge. Do not self-merge, bypass checks, or start the next campaign.
6. After an approved merge, use on-phone feedback to tune real Alfred conversations; synthetic
   tests prove data/guard mechanics, not coaching effectiveness.

## Ready PR description outline

BEYOND stores personal direction and facts but Alfred's conversation snapshot did not connect
all of them or refresh between turns. This slice connects inspectable personal context to a
days-off draft plan while keeping the operator in control.

REUSE: MEMORY-001 lifecycle/editor/backup, Intent sources/commands, Personal Understanding,
Alfred cards/SDK/read tools. TELOS context distinctions inspired composition; no donor code copied.
OWN: typed source catalog, consent/freshness and per-card atomic confirmation guards.
BUILD FROM SCRATCH: only missing context/source composition; foreign stores cannot preserve our
canonical history and commands as-is.

Demo: MORE → REVIEW → PERSONAL UNDERSTANDING → My context → add/correct a constraint → PLAN MY
NEXT DAYS OFF → explicitly include context → SEND → inspect a citation → open original record.
Mark irrelevant/correct and ask again; stale context cannot silently carry into the new request.
Existing action cards still require confirmation; stale-day/target cards and duplicate taps are guarded.

Validation: full3226passed/two existing skips, TypeScript/build/PWA/architecture green; four-size
built offline proof; independent source/evidence review linked above. Update final-head CI/review
URLs in the PR. No Engine/schema/runtime dependency/new notification/TODAY composition change
relative to master. Live model quality remains to be assessed with the owner. No merge authorized.
