# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-07 by Codex (backup builder).** FACTORY-STANDALONE-ACTIVATION-001 is integrated;
the authorization-only VCC-001 activation amendment awaits review and merge.

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

### Verification commands

`npm run check:risk -- 40ef5955d6aefaaf198167d2fe081c2e8e71216c` (process/docs only) ·
`git diff --check`. Factory activation validation is intentionally deferred until this exact
contract amendment is protected on master; the Builder branch cannot establish trusted authority.

### DECISIONS FOR GAVIN

None.
