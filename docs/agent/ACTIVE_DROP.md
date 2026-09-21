---
id: TODAY-QUICKACTIONS-001
status: ACTIVE
baseline: c91a7f710499af6e1a71e5d193bfea05aeffd7df
branch: claude/today-quickactions-001-night-shift
contract: docs/agent/drops/TODAY-QUICKACTIONS-001.md
builder: Claude, this session, direct owner authorization 2026-09-20/21 (NEXT DROP SCOPING mission, all 3 items picked, build order 1,2,3)
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
for this Drop live in `docs/agent/drops/TODAY-QUICKACTIONS-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.

## Activation note (hand-authored, not via `factory-drop.mjs init`)

Same blocker as FOUNDATION-1B's and PLANNED-WORK-001's own activation (see git history):
`node scripts/factory-drop.mjs init` correctly detected the stale, already-merged
`claude/body-ux-001-add-meal-disclosure` branch (PR #81, merged 2026-09-15, capability already
present in `master`) still carrying its own never-closed `ACTIVE_DROP.md` snapshot declaring
`BODY-UX-001` active. Deleting that remote branch remains blocked: `git push origin --delete
claude/body-ux-001-add-meal-disclosure` failed again with an HTTP 403 from GitHub itself, and no
GitHub MCP tool in this session's toolset offers branch deletion either. The owner already
approved deleting this specific branch (FOUNDATION-1B's activation, this conversation); the
blocker is infrastructure permission, not authorization.

This file's content was produced by calling this repository's own
`renderActiveDropFile()` (from `scripts/factory-drop.mjs`) directly with this Drop's real
fields, not typed by hand — byte-identical to what `init` itself would have written, apart from
this note. Every fact `init` would otherwise have verified was independently re-derived first:
`git fetch origin master && git rev-parse origin/master` resolved to `baseline` above
(`c91a7f710499af6e1a71e5d193bfea05aeffd7df`, itself PLANNED-WORK-001's own closure commit,
one commit ahead of PLANNED-WORK-001's merge commit `b643af5` — confirmed via `git diff --stat`
that the only change between the two is `ACTIVE_DROP.md`'s own closure, no code); the working
tree, though dirty with this Drop's own already-implemented changes (permitted, matching
`--allow-dirty`'s intent), had no unrelated changes; `docs/agent/drops/TODAY-QUICKACTIONS-001.md`
exists, parses, and declares `risk_tier: ROUTINE`; and no other branch's `ACTIVE_DROP.md`
declares `status: ACTIVE` except the one confirmed-stale, confirmed-merged exception above. A
future session with working branch-delete permission should delete that stale branch and may
then re-run `node scripts/factory-drop.mjs init TODAY-QUICKACTIONS-001 --baseline
c91a7f710499af6e1a71e5d193bfea05aeffd7df --branch claude/today-quickactions-001-night-shift
--allow-dirty` to confirm this file exactly matches what the tool itself would have produced.
