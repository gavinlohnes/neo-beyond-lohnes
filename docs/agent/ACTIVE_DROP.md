---
id: DUP-MEAL-001
status: CLOSED
baseline: a75da3d2ae605291cb00cf78f1c92a86908d639e
branch: codex/dup-meal-001
contract: docs/agent/drops/DUP-MEAL-001.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/155
builder: Codex backup builder
reviewer: Claude Code, post-merge review of 94b10cc (owner session 2026-10-04): no defects
integrator: Owner merge of PR #155, 2026-10-04
integration_sha: 94b10cc3d89dc5d21803f166990cf8b5a3c52980
closed_at: 2026-10-04T06:55:00.000Z
close_note: closed by hand; factory-drop close refused because codex/dup-meal-001 gained a docs-only handoff commit (8adc44a) after the merge, superseded by this close-out
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
for this Drop live in `docs/agent/drops/DUP-MEAL-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
