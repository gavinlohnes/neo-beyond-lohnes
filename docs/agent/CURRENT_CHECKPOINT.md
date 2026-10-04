# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `94b10cc` (PR #155 merge).

- **Drop:** none active. DUP-MEAL-001 (duplicate-meal prompt, built by Codex) merged as PR #155,
  reviewed post-merge by Claude Code (no defects), closed.
- **Branch:** `ccr-22d7c0f8-rqhhjm` carries only this close-out.
- **Done:** FOUNDATION-A-F1 (in field test to about Oct 25), Undo after every log, plain words,
  duplicate-meal prompt.
- **Left:** the Queue is empty; the owner picks next. Codex: no written Drop to build; stop and ask.
- **Verification run (master 94b10cc):** `npm run typecheck`; full `vitest run` (170 files,
  1,929 passed, 1 skipped); PR #155 PR Verification green.
- **Open risks:** none known. Stale branches `codex/duplicate-meal-prompt` (a pre-Drop note) and
  `codex/dup-meal-001` (one docs commit after the merge) can be deleted.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`
