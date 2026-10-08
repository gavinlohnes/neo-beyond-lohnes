# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Updated 2026-10-08 by Codex (backup builder).** FACTORY-STANDALONE-ACTIVATION-001 is integrated;
PR #200's authorization amendment includes the owner-authorized AutoBackup test-selector repair
from PR #201 and awaits independent exact-head review and CI.

- **Completed prerequisite:** `FACTORY-STANDALONE-ACTIVATION-001` — protected standalone
  activation. **ARCHITECTURAL. MERGED.** PR
  [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199) merged as
  `40ef5955d6aefaaf198167d2fe081c2e8e71216c`; final head
  `7ea7d07e93d61c59e30a6297346066caa0c1c275`.
- **Owner ruling:** Gavin authorized VCC-001 from freshly fetched current master on 2026-10-07.
  The protected VCC contract now uses `baseline: AT_ACTIVATION`; Factory will bind the exact
  protected-master SHA when the implementation Drop is activated.
- **This change:** authorization only. It amends `docs/agent/drops/VCC-001.md` to the protected
  standalone activation path and records the merged policy prerequisite. No VCC product code,
  Engine, recommendation, persistence, schema, runtime dependency, roadmap, doctrine, or locked
  UX decision changes are included.
- **Left:** independently review and merge this authorization amendment. Only after it is present
  on protected master may a fresh Builder session run Factory activation and build VCC-001 on
  `codex/vcc-001-state-rail`.
- **Open risks:** VCC-001 remains unstarted and fail-closed until this amendment merges. The
  implementation remains Architectural and still requires independent exact-head review, green
  CI, and Gavin's explicit approval before integration.

### PR #200 repair handoff

- **Branch / PR:** `codex/vcc-001-activation-auth`,
  [#200](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/200). Inspected open PRs #200 and #201
  before editing; #200 head was `2bc6d584be224d0894fda521fda63a11148235db`, #201 head was
  `2715831dcb18430fc59cebfc0daaf6e71b6b54e1`.
- **Done:** applied exactly PR #201's three selector corrections in
  `tests/browser/AutoBackup.test.tsx`. Assertions now target `section[aria-label="Backup"]`
  instead of the shared `.backup-due` class, which also matches the report banner. Original
  PR Verification run `37722957143` confirms failures at these three assertions.
- **Verification:** AutoBackup and Report001 browser tests passed 12/12; full suite passed
  205 files / 2,104 tests, one skipped. Architecture boundaries, typecheck/production build,
  and `git diff --check` passed. Browser tests used installed `/usr/bin/chromium` through a
  temporary config overriding only Playwright launch options; that config was removed.
- **Scope:** only the selector correction and this required handoff update. No product behavior,
  doctrine, dependencies, Factory activation, or DEV-FLOW-002 changes. No PR merged or closed.
- **Left:** push this repair to #200, confirm exact-head PR Verification, then obtain independent
  Claude Code review. GitHub API access is blocked by network policy; Git and public GitHub web
  pages are available for push and CI inspection. PR #201 remains open and untouched.

### Verification commands

`npm run check:risk -- 40ef5955d6aefaaf198167d2fe081c2e8e71216c` (process/docs only) ·
`git diff --check`. Factory activation validation is intentionally deferred until this exact
contract amendment is protected on master; the Builder branch cannot establish trusted authority.

### DECISIONS FOR GAVIN

None.
