---
id: DAY-ROLLOVER-001
status: ACTIVE
baseline: c91a7f710499af6e1a71e5d193bfea05aeffd7df
branch: claude/day-rollover-1630
contract: docs/agent/drops/DAY-ROLLOVER-001.md
builder: Claude, this session, direct owner authorization 2026-09-21 (MISSION: DAY ROLLOVER AT 16:30; doctrine-override ruling via AskUserQuestion; concurrent-Drop authorization: Leave PR #110 alone)
---

# ACTIVE_DROP

This file identifies the single currently-authorized BEYOND Drop, for recovery by a fresh
agent/session without the owner relaying state by hand. It is a routing/authorization
pointer only — it never duplicates a fact Git/GitHub/CI can already prove (current HEAD, CI
status, mergeability, PR review state). Run `node scripts/factory-drop.mjs status` to see
this file's recorded facts alongside the live git facts derived at that moment; check the
`pr` field's actual CI/review state directly on GitHub. See
`.claude/skills/beyond-drop/SKILL.md` §9 for the full mechanism.

Full authorized scope, exclusions, invariants, acceptance criteria, and role expectations
for this Drop live in `docs/agent/drops/DAY-ROLLOVER-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.

## Activation note (hand-authored, not via `factory-drop.mjs init`)

`node scripts/factory-drop.mjs init` correctly refuses to launch a second concurrent Drop, for
two independent reasons at once:

1. The same recurring stale, already-merged `claude/body-ux-001-add-meal-disclosure` branch
   (PR #81, merged 2026-09-15) still carrying its own never-closed `ACTIVE_DROP.md` snapshot —
   `git push origin --delete` on it still 403s, and no GitHub MCP tool in this session's toolset
   offers branch deletion. Same blocker, same owner-approved deletion, as every prior Drop's
   activation note in this history.
2. **`TODAY-QUICKACTIONS-001` (PR #110) is genuinely ACTIVE and unmerged** — not stale. Direct
   owner authorization this session ("Leave PR #110 alone") explicitly permits this second,
   independent Drop to proceed concurrently with it. This is a real, deliberate exception to the
   one-ACTIVE-Drop mechanism's default, not a workaround for a broken/stale artifact — see
   `docs/agent/drops/DAY-ROLLOVER-001.md`'s own "Concurrent-Drop note" for the verified-no-file-
   overlap analysis this exception depends on (both Drops' actual changed-file sets were compared
   before this Drop's scope was finalized).

This file's content was produced by calling this repository's own `renderActiveDropFile()`
(from `scripts/factory-drop.mjs`) directly with this Drop's real fields, not typed by hand —
byte-identical to what `init` itself would have written (apart from this note and the fact that
`init` itself refuses to run at all here). Every fact `init` would otherwise have verified was
independently re-derived first: `git fetch origin master && git rev-parse origin/master` resolved
to `baseline` above; the working tree contained only this Drop's own contract commit at the point
this file was authored; `docs/agent/drops/DAY-ROLLOVER-001.md` exists, parses, and declares
`risk_tier: ARCHITECTURAL`; `TODAY-QUICKACTIONS-001`'s own `ACTIVE_DROP.md` snapshot on its branch
was read directly to confirm it is the genuine (not stale) conflict, distinct from the
`BODY-UX-001` stale one. A future session with working branch-delete permission should delete the
stale `BODY-UX-001` branch; once both Drops in flight here are closed, a future
`factory-drop.mjs init` re-run for any new Drop should again confirm this file matches what the
tool itself would produce.
