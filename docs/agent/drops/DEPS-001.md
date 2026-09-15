---
id: DEPS-001
baseline: 9d6c364f242383626c6f34a94f5401894d2dd3eb
risk_tier: ROUTINE
---

# DEPS-001 // Dependency freshness update (resolves 6 flagged vulnerabilities)

## Mission

Every PR pushed tonight has carried GitHub's "found 6 vulnerabilities (4 high, 2 moderate)"
notice. All six are in dev/test tooling transitive dependencies (`@vitest/mocker` and its
consumers `vitest`/`@vitest/browser`/`@vitest/browser-playwright`; `fast-uri`, transitive via
`ajv`/`workbox-build`/`vite-plugin-pwa`) — none are shipped to the production bundle. `npm
update` resolves all six within the semver ranges already declared in `package.json` — no new
dependency, no `package.json` change at all, only `package-lock.json`'s resolved versions.

## Approved baseline

`origin/master` at `9d6c364f242383626c6f34a94f5401894d2dd3eb`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. `npm update` moves several already-declared dependencies to newer versions within their
existing `^`-range constraints (not new dependencies, no `package.json` diff) — this is the
"routine version freshness" case, not the "meaningful new runtime dependency" escalation trigger
CLAUDE.md names. Full verification (including a real production build and a re-run of the
browser suite) passed with zero code changes required.

## What actually changed (accurate accounting — not just the security-relevant deps)

`npm update`'s resolution touches every dependency within its allowed range, not only the
flagged ones. The vulnerability-relevant bumps: `@vitest/mocker`/`vitest`/`@vitest/browser`/
`@vitest/browser-playwright` 4.1.10 → 4.1.11; `fast-uri` (transitive) 3.1.5 → a patched version.
Also bumped, incidentally, within their own existing `^` ranges: `react`/`react-dom` 19.2.8 →
19.3.0, `dexie` 4.4.5 → 4.4.6, `compromise` 14.16.0 → 14.17.0. None of these are new
dependencies or major-version jumps; all are covered by the full test suite, which passed
unchanged.

## Authorized scope

- `package-lock.json` only. No `package.json` change, no source change, no test change.

## Explicit exclusions

- No new dependency of any kind.
- No major-version bump of anything.
- No source or test file touched.

## Relevant authority / references

- GitHub's own Dependabot vulnerability alerts, visible on every PR pushed tonight (4 high, 2
  moderate, all in dev/test tooling).
- `docs/agent/CAPABILITY_MAP.md`'s "GENERAL DEPENDENCY/TEST TOOLING" entry, which separately
  flags GitHub-native CodeQL/Dependabot/secret-scanning as "relevant now that a GitHub App
  Builder identity... exists" — noted for a future, explicitly-scoped Drop, not addressed here.

## Required invariants

- No `package.json` version-range change.
- Full test suite (node + browser) passes unchanged in count.
- Production build succeeds.

## Acceptance criteria

- `npm audit` reports zero vulnerabilities.
- `npm run verify` passes in full.
- The one known, pre-existing, unrelated CI flake (`backupExport.test.tsx`'s cross-file
  `DatabaseClosedError` on full-suite runs, already diagnosed on `deploy-pages.yml` run
  `34963010125`) was independently re-confirmed as pre-existing and unrelated: it reproduced once
  during this Drop's own local verification, then a clean re-run of the full suite passed all
  345 tests with no errors — same signature, same non-reproducibility pattern already on file.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-deps-001` on branch `claude/deps-001-audit-fix`, cut
  from the baseline above.
- `npm update` only — no manual `package.json` edits, no `npm install <new-package>`.
- Run the required verification before opening a PR.
- Open the PR, then stop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm `package.json` is genuinely untouched (lockfile-only diff) and confirm `npm audit`
  reports zero vulnerabilities on the reviewed branch.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close DEPS-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to add a new dependency, bump a major version, or touch source/test files in
  this Drop.
- A genuine conflict between this contract and higher repository authority.
