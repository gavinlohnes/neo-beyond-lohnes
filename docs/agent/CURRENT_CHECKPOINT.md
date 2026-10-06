# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `aaa42c2` (PR #188,
FEEL-001 merged after independent review; closed in this branch).

- **Drop:** `BOOT-001` boot sequence: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`.
- **Done:** FEEL-001 closed (as-built entry, roadmap). BOOT-001 built:
  - `src/ui/components/BootSequence.tsx`, mounted next to `App` in `src/main.tsx`: about 1.05 s on
    pure black — the app icon file (`icons/icon-192.png`, as-is), a 1px line drawing across,
    "BEYOND" typing in, then three status lines ticking in, then it cuts to whatever the app opened
    underneath (TODAY, a resumed workout, a shortcut). The app's startup runs underneath unchanged.
  - Status lines from `src/application/bootQueries.ts` (read only): **DAY n** (BEYOND days on
    record), **SHIFT 1800** / **SHIFT OFF** (the lived day's scheduled shift, or a declared day
    off), **BACKUP OK / DUE / OFF**. A value that can't be read is left out.
  - Once per page load; a remount mid-sequence carries on, never replays; a resume never shows it;
    tap anywhere skips; reduced motion shows nothing.
  - The manifest's background/theme colors were already #000000; `index.html` now paints black
    from the first frame too.
  - FEEL-001 review nits: the red filled buttons keep their darker press; a ticking number never
    dips below its start.
  - Screenshots: `docs/agent/screenshots/BOOT-001/` (three frames of the sequence, then TODAY).
- **Left:** independent review, merge on green, close. Then SHORTCUTS-001.
- **Verification run:** `npm run verify` (192 files / 2051 tests passed, build OK; built manifest
  `background_color` #000000); `git diff --check` OK.
- **Open risks:** "DAY n" counts BEYOND days on record (every lived day, including auto-rolled
  ones) — see decision 2. The icon PNG is the maskable home-screen icon, so the bat sits small
  inside its own padding on the boot screen (used as-is, per the ruling). A PR set taps once like
  any set (FEEL-001 decision). With an OBLIGATION_DUE recommendation the commitment's name shows
  twice on TODAY. Agent sessions clone shallow: `git fetch --unshallow origin` before
  `factory-drop.mjs init`. Carried over: raw capacity codes in "How BEYOND decided" with 2+
  reasons; `factory:status` needs `GITHUB_TOKEN`; merged branches await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
2. **What "DAY 14" counts on the boot screen:** **A (recommended, built)** BEYOND days on record ·
   **B** days since the first one (calendar days) · **C** the day of the current work rotation.
3. **A PR set's tap (FEEL-001):** **A (recommended, built)** the same single LOG tap as any set ·
   **B** no tap at all on a PR set (strict reading of "PR: no vibration").
