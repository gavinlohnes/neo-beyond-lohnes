# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-07 by Codex (backup builder).** FACTORY-STANDALONE-ACTIVATION-001 is ready for
independent review; VCC-001 remains authorized but unstarted.

- **Drop:** `FACTORY-STANDALONE-ACTIVATION-001` — protected standalone activation.
  **ARCHITECTURAL. IN REVIEW.** Branch `codex/factory-standalone-activation-001`; PR
  [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199). Baseline
  `25d5c4c330c88c78f42e14edef58893c5935c3b0`.
- **Owner ruling:** Gavin selected policy option 2 on 2026-10-07: allow an owner-preregistered
  standalone Drop contract on protected master to use `baseline: AT_ACTIVATION`, with Factory
  binding the actual protected-master SHA at activation. This is a one-Drop Factory policy change,
  not VCC implementation authority by itself.
- **Done:** Factory accepts the sentinel for a standalone Drop only when the complete contract is
  already present identically on `origin/master`. Builder-only contracts fail with
  `TRUSTED_CONTRACT_REQUIRED`; altered Builder copies fail with `BUILDER_CONTRACT_MUTATION`.
  Exact-SHA standalone behavior and campaign authorization remain unchanged. Governing Factory
  documentation and the Drop template describe the new protected path.
- **Verification:** full `tests/factory/factoryDrop.test.ts` passed 42/42. Focused authorization
  coverage passed 8/8, including campaign compatibility, exact-baseline rejection, protected
  standalone activation, Builder-only rejection, and mutation rejection. Architecture boundaries,
  typecheck, production build, and `git diff --check` passed. Run the risk classifier again after
  the implementation commit so it evaluates the committed diff.
- **Left:** wait for PR #199 exact-head CI plus independent review. After integration, close this
  policy Drop; then activate VCC-001 from freshly fetched protected master and build it separately on
  `codex/vcc-001-state-rail`.
- **Open risks:** this changes the Factory authorization boundary, so it must not be self-reviewed
  or merged by this Builder session. VCC-001 remains blocked until this policy PR is independently
  approved and integrated. No product, Engine, persistence, schema, or runtime dependency changed.

### Verification commands

`npx vitest run tests/factory/factoryDrop.test.ts` · focused Factory authorization suite ·
`npm run check:architecture` · `npm run typecheck` · `npm run build` ·
`npm run check:risk -- 25d5c4c330c88c78f42e14edef58893c5935c3b0` · `git diff --check`

### DECISIONS FOR GAVIN

- Arrange independent exact-head review and owner approval for the policy PR. Do not start VCC-001
  until this policy change is integrated and the Drop is closed.
