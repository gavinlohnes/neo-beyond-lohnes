# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-03 by Codex.** `origin/master` at `20872d7` (PR #153 merge).

- **Requested work:** queue item 1, described in chat as a duplicate-meal prompt, on a new branch.
- **Branch:** `codex/duplicate-meal-prompt`, based exactly on `origin/master` at `20872d7`.
- **PR:** none opened. A code PR would be misleading because no authorized Drop exists.
- **Done:** read `AGENTS.md`, this checkpoint, `docs/ROADMAP_1.0.md`,
  `docs/agent/ACTIVE_DROP.md`, the FOUNDATION-A-F1 contract, and the Drop workflow. Fetched and
  pruned `origin`; checked every Drop filename on current `origin/master` and the only newer
  remote branch. Confirmed FOUNDATION-A-F1 is merged and CLOSED, and its contract says it is in
  a field-test stop. Confirmed the roadmap Queue is empty and contains no duplicate-meal item.
- **Left:** Claude Code or the owner must put the duplicate-meal brief in the roadmap Queue and
  add its written contract under `docs/agent/drops/`. After that lands on protected master, Codex
  can restart from that exact baseline, activate the Drop, implement only its scope, run every
  required command, and open the requested PR.
- **Verification run:** no implementation verification was run because implementation was not
  authorized and no Drop-specific verification list exists. Read-only checks used `git fetch
  origin --prune`, remote file inspection, branch/ref inspection, and open-PR inspection; GitHub
  CLI was unauthenticated, while the fetched refs still showed the relevant remote state.
- **Open risks:** building now would violate `AGENTS.md` rule 2, invent product scope, and collide
  with FOUNDATION-A-F1's explicit exclusion of later foundation work during its field-test stop.

## Next safe action

1. Land the owner-approved duplicate-meal Queue brief and its Drop contract on `master`.
2. Rewrite this handoff with the Drop ID, baseline, required verification, and role routing.
3. Have Codex create a fresh Drop branch from that approved baseline and build it; do not merge.

## Existing repository state

- FOUNDATION-A-F1 merged as PR #152 and is CLOSED. Its field-test stop runs for about three work
  rotations, to about October 25; F2/F3/F4 remain gated.
- The last fetched `origin/master` is `20872d7`; the roadmap Queue is empty.
- The post-merge branch `origin/ccr-22d7c0f8-rqhhjm` contains unrelated plain-language TODAY
  work and a handoff that also says there is no written Drop for Codex to build.
- The untracked `.codex-remote-attachments/` directory predates this session and was left intact.
