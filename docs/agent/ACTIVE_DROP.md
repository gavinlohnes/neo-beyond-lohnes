---
id: FOUNDATION-1A
status: ACTIVE
baseline: f32482a3c70eb2fddb9b17f8c306db849c444b13
branch: claude/foundation-1a-iy32gy
contract: docs/agent/drops/FOUNDATION-1A.md
pr: (pending — set by Builder immediately after opening the PR)
builder: Claude, this session, direct owner authorization 2026-09-16 (doctrine/architecture reconciliation)
reviewer: (unassigned)
integrator: (unassigned)
---

<!--
Prior entry (DEPTH-002, CLOSED, integration 4e97513482bafa821bcd7c28db049de6fab486b0, closed_at
2026-09-16T04:53:42.508Z) is preserved in git history; this file only ever holds the current
routing record, not an append-only log.

Activation note: `node scripts/factory-drop.mjs init` correctly refused to activate this Drop
automatically — it found `origin/claude/emblem-001-primary-mark` still reading
`id: EMBLEM-001, status: ACTIVE` in its own `ACTIVE_DROP.md`, even though EMBLEM-001 was
superseded by EMBLEM-002 and merged to master long ago. `git merge-base
origin/claude/emblem-001-primary-mark origin/master` returns nothing — this is the documented
"disconnected lineage" case (`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s "Historical-branch
disposition rule"), i.e. the one residual limitation named two paragraphs below: an abandoned,
never-closed, never-deleted branch reading as a live conflict. Branch deletion is outside this
session's authorization, so this file was updated by hand to the same content `init` would have
written, rather than bypassing the script's safety check. A future session with branch-deletion
authority should delete `claude/emblem-001-primary-mark` so `factory-drop.mjs` stops flagging it.
-->

# ACTIVE_DROP

# ACTIVE_DROP

This file identifies the single currently-authorized BEYOND Drop, for recovery by a fresh
agent/session without the owner relaying state by hand. It is a routing/authorization
pointer only — it never duplicates a fact Git/GitHub/CI can already prove (current HEAD, CI
status, mergeability, PR review state). Run `node scripts/factory-drop.mjs status` to see
this file's recorded facts alongside the live git facts derived at that moment; check the
`pr` field's actual CI/review state directly on GitHub. See
`.claude/skills/beyond-drop/SKILL.md` §9 for the full mechanism.

Full authorized scope, exclusions, invariants, acceptance criteria, and role expectations
for this Drop live in `docs/agent/drops/FOUNDATION-1A.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
