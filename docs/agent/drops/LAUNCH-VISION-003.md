---
id: LAUNCH-VISION-003
baseline: 0c560f888ffe83c1377d413b9b518499d9198656
risk_tier: ARCHITECTURAL
---

# LAUNCH-VISION-003 // TERRYS-SUIT SURFACE GRAMMAR PORT

## Mission

Port four already-designed presentation-only elements from the launch-vision prototype's Direction B
("Terry's Suit") into the real `src/ui` app: chamfered plating across surfaced UI planes, an
ambient red bloom around the active surface/frame, a one-time START DAY power-on sweep, and a
confirmation pulse on logged actions. This Drop is authorized directly by the owner in chat on
2026-09-15 and must match the prototype's actual geometry, color, opacity, and timing as closely
as the production DOM structure allows, without changing any command/query/engine/domain behavior.

## Approved baseline

`origin/master` at `0c560f888ffe83c1377d413b9b518499d9198656`, verified via
`git fetch origin master:refs/remotes/origin/master && git rev-parse origin/master` immediately
before implementation.

## Risk classification

ARCHITECTURAL. This is a broad visual-system change spanning TODAY/TRAIN/BODY/MORE and it amends
the locked Decision Register entry that had kept Terry's broader surface/motion direction
prototype-only. None of the HIGH-RISK triggers apply: no engine/domain/persistence/schema/backup/
correction-model/protected-fixture/dependency change is authorized here.

## Authorized scope

- Add this Drop Contract and activate `docs/agent/ACTIVE_DROP.md` for `LAUNCH-VISION-003` against
  the exact baseline above.
- Update `docs/UX_DECISIONS.md`'s Visual System section to preserve the earlier prototype-only
  language as history while recording this Drop's 2026-09-15 direct-owner authorization for the
  four Terry's Suit elements above.
- Extend the existing single `--chamfer`-based surface grammar in `src/ui/styles/*` so surfaced UI
  planes across the real app use the prototype's Terry's Suit plating geometry where production DOM
  structure makes that truthful.
- Add the ambient red bloom around the production app's active surface/frame in `src/ui`, scoped so
  existing red-budget carve-outs remain intact, especially BODY's neutral `.body-field .btn-primary`.
- Add a one-time START DAY power-on sweep in TODAY's UI only, with no change to what START DAY does.
- Add a confirmation pulse for logged-action confirmation moments (water, sleep, bodyweight,
  protein, meal, set logging, and equivalent existing production confirmation surfaces) using
  presentation hooks only.
- Update/add browser tests only where they assert the structural DOM hooks/classes/counts needed by
  this surface/motion work; no pixel or animation-timing assertions.

## Explicit exclusions

- No changes to any engine, application, command, query, persistence, or domain logic.
- No change to icon geometry in `src/ui/icons/Icon.tsx`; GLYPHS remain locked.
- No reintroduction of red primary fills inside BODY's carve-out; `.body-field .btn-primary`
  remains neutral-filled.
- No invented new palette, motion vocabulary, geometry system, or unrelated restyling beyond the
  four authorized prototype elements.
- No dependency, lockfile, CI workflow, schema, backup/restore, or protected-fixture changes.
- No merge, self-review, integration, Factory closure, or auto-merge enablement by the Builder.

## Relevant authority / references

- Direct owner ruling, in chat, 2026-09-15: Builder assignment for `LAUNCH-VISION-003`, Terry's
  Suit Direction B as the exact visual target, four authorized elements, presentation-only scope,
  BODY red-budget carve-out preservation, and required verification/PR stop condition.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `.claude/skills/beyond-drop/SKILL.md` §§1-3, 9.
- `docs/UX_DECISIONS.md` — especially "Visual system — red budget", "Visual system — typography",
  "Visual system — motion", and "Explicitly out of scope".
- `prototype/launch-vision/README.md` and `prototype/launch-vision/index.html` — Direction B
  reference values/geometry/timing.
- `docs/agent/drops/LAUNCH-VISION-002.md` — contract shape/pattern to follow.

## Required invariants

- This Drop is presentation-layer only: no product behavior or persistence truth changes.
- BODY's lower-red-budget doctrine remains intact, including the locked `.body-field .btn-primary`
  neutral fill.
- GLYPHS lock is untouched; `Icon.tsx` geometry does not change.
- `src/ui/styles/global.css` remains single-owner/serial-only during this Drop.
- No screen may gain a new capability requirement or lose an existing one in order to fit the new
  visuals.
- Reduced-motion safety remains preserved for any new animation.

## Acceptance criteria

1. `/home/runner/work/neo-beyond-lohnes/neo-beyond-lohnes/docs/agent/drops/LAUNCH-VISION-003.md`
   exists and `node scripts/factory-drop.mjs init LAUNCH-VISION-003 --baseline
   0c560f888ffe83c1377d413b9b518499d9198656 --branch copilot/launch-vision-003-builder --builder
   "Copilot, assigned by Gavin in chat 2026-09-15"` succeeds.
2. `docs/UX_DECISIONS.md` records this Drop as the authorization that supersedes the earlier
   prototype-only deferral for these four Terry's Suit elements, preserving history visibly.
3. Production surfaced UI planes use a shared chamfer/plating treatment beyond the prior
   `.command-surface`-only primitive.
4. The production active surface/frame exposes an ambient red bloom hook without violating BODY's
   red-budget carve-out.
5. START DAY triggers a one-time structural DOM hook/class for the power-on sweep without changing
   what START DAY does.
6. Logged-action confirmation moments expose structural DOM hooks/classes for the confirmation pulse
   in BODY/TODAY/TRAIN where the existing UI already confirms those actions.
7. Required browser tests assert those structural hooks/classes and pass.
8. `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
   `npx vitest run --project browser`, and `npm run build` all pass.

## Required verification

- `git diff --check`
- `npx tsc -b`
- `npm run check:architecture`
- `npx vitest run --project node`
- `npx vitest run --project browser`
- `npm run build`
- Direct browser inspection of the real app and the prototype reference via `npm run dev`, checking
  Terry's Suit Direction B geometry/motion alignment without relying on pixel tests.

## Builder expectations

- Work only on the isolated Builder branch already cut from the exact baseline above.
- Implement exactly the authorized scope; treat any needed behavior change as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Verify the diff remains presentation-only, preserves BODY's carve-out and GLYPHS lock, and maps
  the new surface/motion values back to the prototype rather than inventing unrelated ones.
- Verify browser tests cover structural hooks/classes only, not pixel/animation assertions.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR, without bypassing protection.
- After merge: close `LAUNCH-VISION-003` via `node scripts/factory-drop.mjs close
  LAUNCH-VISION-003 --integration-sha <merge-commit-sha>` and commit the closure mutation.

## Stop / escalation conditions

- Stop if `origin/master` moves from the approved baseline before activation or another Drop is
  already ACTIVE.
- Stop if any required Terry's Suit visual target would require changing behavior rather than
  presentation.
- Stop if preserving BODY's red-budget carve-out conflicts with a proposed bloom/pulse treatment.
- Stop on any conflict between this contract and higher repository authority, or any ambiguity that
  would require a new product/visual ruling beyond the explicit owner authorization above.
