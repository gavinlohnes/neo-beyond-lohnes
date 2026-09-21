---
id: PLANNED-WORK-001
status: ACTIVE
baseline: ae25528de0a0622a74b802ecf63f49c6982256b4
branch: claude/planned-work-001-explicit-intent
contract: docs/agent/drops/PLANNED-WORK-001.md
builder: Claude, this session, direct owner authorization 2026-09-20 (Option B explicit operator intent, TRAIN as first source, boundary shaped for later generalization)
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
for this Drop live in `docs/agent/drops/PLANNED-WORK-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.

## Activation note (hand-authored, not via `factory-drop.mjs init`)

Same blocker as FOUNDATION-1B's own activation (see git history): `node scripts/factory-drop.mjs
init` correctly detected the stale, already-merged `claude/body-ux-001-add-meal-disclosure`
branch (PR #81, merged 2026-09-15, capability already present in `master`) still carrying its
own never-closed `ACTIVE_DROP.md` snapshot. Deleting that remote branch remains blocked: a
retried `git push origin --delete claude/body-ux-001-add-meal-disclosure` failed again with an
HTTP 403 from GitHub itself, and no GitHub MCP tool in this session's toolset offers branch
deletion either. The owner already approved deleting this specific branch once (this
conversation, during FOUNDATION-1B's activation); the blocker is infrastructure permission, not
authorization. Every fact `init` would otherwise have verified was independently re-derived by
hand before writing this file: `git fetch origin master && git rev-parse origin/master` resolves
to this file's declared `baseline`; the working tree was clean at that point;
`docs/agent/drops/PLANNED-WORK-001.md` exists, parses, and declares `risk_tier: ARCHITECTURAL`;
and no other branch's `ACTIVE_DROP.md` declares `status: ACTIVE` except the one confirmed-stale,
confirmed-merged exception above. A future session with working branch-delete permission should
delete that stale branch and may then re-run `node scripts/factory-drop.mjs init PLANNED-WORK-001
--baseline ae25528de0a0622a74b802ecf63f49c6982256b4 --branch claude/planned-work-001-explicit-intent --allow-dirty`
to confirm this file exactly matches what the tool itself would have produced.
