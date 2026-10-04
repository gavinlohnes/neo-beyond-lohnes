# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `5538f0f` (PR #157 merge).

- **Drop:** none active. Four new Drops written (not built), Queue order:
  1. `HUD-001` HUD design system — ARCHITECTURAL, **blocked on Gavin's doctrine decision (D1).**
  2. `BACKUP-AUTO-001` automatic backup — ARCHITECTURAL, **blocked on Gavin's pick (D2).**
  3. `PR-CARDS-001` PR record cards — ROUTINE, buildable now.
  4. `BODY-TIMELINE-001` transformation timeline — ROUTINE, buildable now.
- **Codex: start with Queue item 1 (`HUD-001`) only once D1 is answered "A" in this note or the
  roadmap; until then take the first buildable item, `PR-CARDS-001`.** Activate with
  `factory-drop.mjs init` (update the Drop's `baseline:` to fresh master first), build, verify,
  PR titled `[NEEDS CLAUDE REVIEW] …`, handoff note, stop. Never merge.
- **Branch:** `ccr-22d7c0f8-rqhhjm` carries these docs.
- **Done this session:** DUP-MEAL-002 + soak fixes (#157), DUP-MEAL-001 close-out (#156).
- **Field issues:** none open (`field` label).
- **Verification run:** master 5538f0f: PR Verification green on #157 (1,937 tests locally).
- **Open risks / traps:**
  - `npm run factory:status` fails with `GITHUB_API_401`: it needs a GitHub token in the
    environment (`GITHUB_TOKEN`); this cloud session has none. `factory-drop.mjs` works.
  - `codex/dup-meal-001` (a post-merge commit) blocked `factory-drop.mjs validate`; it's pinned in
    `RETIRED_BRANCHES.json` in this PR. Agent sessions can't delete remote branches.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **HUD design vs doctrine.** Your doctrine says "Reject … decorative HUD geometry" and the
   Sept 30 ruling removed corner brackets. HUD-001 brings cut corners and bracket ticks back.
   **A (recommended): amend the doctrine for HUD-001** (functional frames, still one red, AA) ·
   B: build without bracket ticks · C: hold HUD-001.
2. **Automatic backup destination.** A web app can't upload on a timer by itself.
   **A (recommended): due-on-open reminder + one-tap share to Drive/Files** (no account) ·
   B: direct Google Drive upload (needs a Google Cloud OAuth client ID from you) · C: hold.
3. **Old branches.** 56 merged branches (the PR #153 list plus `codex/dup-meal-001` and
   `codex/duplicate-meal-prompt`) can be deleted on GitHub → Branches. **A (recommended): you
   delete them in GitHub's UI** · B: give a session a token that can delete branches · C: leave
   them (the retired list keeps them harmless).
