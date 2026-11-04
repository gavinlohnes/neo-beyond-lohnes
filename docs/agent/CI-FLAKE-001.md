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
