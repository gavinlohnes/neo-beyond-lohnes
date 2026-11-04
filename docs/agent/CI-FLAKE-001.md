# CI-FLAKE-001 — make the slow browser tests reliable (Builder: Codex)

Owner approval: Gavin, 2026-11-04 ("Yes, do it", option 1). Lane: Routine (tests only).

Since the Vitest 5 runner update (#405), master CI has failed at random on a different browser test each
run, blocking deploys. Each test below passes alone; under full-suite load it times out or reads state too
early. Make every one wait for what it needs instead of relying on timing, and stop it leaking into the next.

Seen failing tonight: FieldDisclosure:100 (fixed in #407: smooth scroll leak), TrainOperator:106,
FramingGuide:89, MonthlyReview:66, BodyPrimaryNavigation:84, Sync002, LogTime:30, Polish001:31,
TodayRun (fixed in #393), plus the Factory subprocess timeouts and MealRoundTrip focus timing Codex noted.

Rules: tests only; no app change unless a test exposes a real app race (then say so in the PR). Never
skip, `.only`, loosen or delete an assertion, and no blanket timeout or retry increase. Prefer
`expect.poll`/`expect.element` on the real ready state, explicit waits for async mode/list/focus reads,
fixed clocks reset per test, `behavior: "instant"` scroll resets, and per-test cleanup of timers,
listeners, IndexedDB and Cache Storage.

Done when: the full suite passes **5 consecutive CI runs** on the PR (re-run the workflow, don't push
empty commits), with the run links in the PR body. One PR, `codex/ci-flake-001`, from fresh master.
REUSE / OWN / BUILD FROM SCRATCH in the body. Claude Code reviews and merges.

## Builder record

- Builder: Codex; branch `codex/ci-flake-001`; PR pending. Starting fresh master:
  `39ae60c9b41398804af99371ccd95be537465965` (#408 merged).
- Gavin explicitly assigned this objective ahead of further checklist work. Routine player WIP
  preserved separately at `ae1f7c6` on `codex/routine-player-001`; excluded here.
- REUSE: existing Vitest browser locators/polling, native browser cleanup and canonical test fixtures.
- OWN: test readiness and isolation around BEYOND's meal, review, camera and share flows.
- BUILD FROM SCRATCH: none. No dependency, workflow or product changes intended.
- Acceptance remains five consecutive full-suite CI runs on this PR, with links in its body.
  Local passes alone do not complete this objective. GitHub API currently returns `Forbidden`;
  Git fetch/push work. Continue local repair while keeping CI evidence explicitly pending.

## Repair and verification

- Vitest browser React's automatic cleanup is registered in `beforeEach`; BEYOND's shared
  `afterEach` previously deleted IndexedDB while some components remained mounted. Shared teardown
  now awaits unmounting before database deletion and clears BEYOND Cache Storage and instant scroll.
- Meal helpers wait for the actual route control (preserving isolated TODAY's callback-only path).
  Duplicate-tap tests wait for enabled controls before deliberately dispatching same-tick clicks.
- TRAIN freezes/resets its clock, waits for Gym Mode focus and the final advisory-read batch.
  Monthly review waits for its held read instead of sleeping; photos scroll into view before
  native lazy-image decoding. Accessibility checks retain all rules/assertions and settle fonts,
  images and finite entry motion first. Camera timers/tracks/mocks and share URL/cache state reset.
- Focused run: **232/232 PASS**, including all named browser files, Drop2ShiftClock's isolated
  harness, and Factory subprocess tests. No Factory timeout reproduced; its assertions remain intact.
- Architecture, TypeScript and production/PWA build PASS. No app source changes; no new skips,
  `.only`, retries, timeout increases, deleted tests or relaxed assertions.
- An exploratory full run during repair had 4 failures (414 files passed, 1 skipped): one helper
  regression in the isolated TODAY harness and three lazy-photo decode waits introduced during
  repair. Both were corrected before the 232-test focused pass.
- The next full run at `802249e` had 414 files / 3,447 tests pass, with two failures and the existing
  one-file/two-test skips. Small Steps uses two meal choosers; its helper must continue from the old
  chooser into RecordSheets. Synthetic camera tests also need a decoded frame, selected preview and
  saved receipt before their existing storage/crop assertions. Corrected those paths; the expanded
  meal/camera regression set is **5 files / 61 tests PASS**, and TypeScript again PASS.
- All original assertions in the modified files are retained (TypeScript AST comparison: 337
  original `expect` expressions, none missing).
- Final full local run at code head `502cb286206e333409c8caa077f6af1789b706c2`: **416 files PASS,
  3,449 tests PASS**, zero failures; the existing one-file/two-test skips remain unchanged.
  Command: `BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium npm test`; duration 541.28 seconds.
  This is a completed full run, not a collection of isolated rerun passes. Final TypeScript PASS.
- **CI acceptance: pending, 0/5 links recorded.** Do not treat local results as CI evidence or merge
  before the five consecutive full-suite PR workflow passes and Claude Code review.

## Remaining CI handoff

- Branch pushed: `codex/ci-flake-001`. PR creation failed with
  `Post https://api.github.com/graphql: Forbidden`; REST workflow listing also returned `Forbidden`.
  No PR number or CI run links exist for this objective yet. The saved environment domain draft
  (`api.github.com`, `cdn.playwright.dev`, `storage.googleapis.com`) still requires publication;
  runtime observations continue to report no applied custom domains. Recheck API access after publish.
- Open **one** PR from this branch to master, including REUSE / OWN / BUILD FROM SCRATCH above.
  Shared setup/helper changes select all four full-suite shards under #408.
- Obtain five consecutive successful **whole PR Verification workflow runs**, rerunning the workflow
  without empty commits or individual failed-test retries. Any failure resets the streak and requires
  diagnosis. Keep the head unchanged during the streak. Put the actual five run/attempt links in the
  PR body (`.../actions/runs/<id>/attempts/<attempt>` for reruns), checking each attempt's head SHA and
  all four shard results. Do not substitute this local result or fabricate pending links.
- Claude Code independently reviews and merges after acceptance. Further checklist work stays paused.
