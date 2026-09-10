---
id: TYPOGRAPHY-001
baseline: 8d81bdcbc0771e36cd9f0fbb92ac68a02607275e
risk_tier: HIGH-RISK
---

# TYPOGRAPHY-001 // Headline font: Space Grotesk → Big Shoulders Display

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in.

## Mission

Swap BEYOND's `--font-display` token (headlines: `.title`, `.command-title`,
`.recommendation-title`) from Space Grotesk to Big Shoulders Display, matching the BEYOND
Launch Vision prototype's "Terry's Suit" direction (`prototype/launch-vision/`). Direct owner
decision, made in-chat comparing the prototype's Depth Reveal work against the running app: the
owner asked "what's next" toward making the app feel like the prototype, was shown this as the
one concrete, already-flagged gap, and approved it via `AskUserQuestion` ("Yes, switch it").
`docs/UX_DECISIONS.md`'s LAUNCH-VISION-001 entry explicitly named typography as one of the
"Terry's Suit" elements "remains prototype-only pending its own separate, explicitly authorized
Drop" — this Drop is that authorization, for typography only.

## Approved baseline

`origin/master` at `8d81bdcbc0771e36cd9f0fbb92ac68a02607275e`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

**HIGH-RISK.** Boundary crossed: dependency change (`.claude/skills/beyond-drop/SKILL.md` §1) —
this Drop adds `@fontsource/big-shoulders-display` to `dependencies` in `package.json` (and the
lockfile). No Engine/domain/persistence/correction-model/protected-fixture boundary is touched;
the dependency trigger is the sole reason for this tier. Owner ruling obtained: YES — see
Mission above (direct owner approval via `AskUserQuestion`, this session, 2026-09-10).

## Authorized scope

- Add `@fontsource/big-shoulders-display` (same major version line as the three `@fontsource`
  packages already in use — `^5.3.0`) to `package.json` dependencies.
- In `src/ui/styles/fonts.ts`, import the specific Big Shoulders Display weight(s) actually
  needed by existing `--font-display` consumers (600, 700 — mirroring the exact weights
  currently imported for Space Grotesk in that same file), Latin subset only, following the
  file's own established pattern and its documented rationale (self-hosted, offline-precached,
  only the weights actually used).
- In `src/ui/styles/tokens.css`, change `--font-display`'s leading font name from
  `"Space Grotesk"` to `"Big Shoulders Display"`, keeping the same fallback chain
  (`"IBM Plex Sans", system-ui, sans-serif`).
- Remove the now-imported-but-unused Space Grotesk `@fontsource` import lines from `fonts.ts`
  and the now-unused `@fontsource/space-grotesk` dependency from `package.json`, only if no
  other token/class still names Space Grotesk after the swap (verify via grep before removing).
- Update `docs/UX_DECISIONS.md`'s LAUNCH-VISION-001 entry (or add a short new entry immediately
  after it) recording that the typography piece is now authorized and locked, so the existing
  "remains prototype-only" sentence stops reading as still-true.
- Regenerate `package-lock.json` via the actual install (no hand-editing).

## Explicit exclusions

- No change to `--font-body` or `--font-mono` (IBM Plex Sans / IBM Plex Mono) — this Drop is
  the headline/display font only.
- No change to chamfer, motion/easing tokens, glyph system, or any other "Terry's Suit" element
  named in UX_DECISIONS.md as still deferred — each gets its own Drop if/when authorized.
- No change to font *sizes*, weights used per element, or letter-spacing beyond what naming a
  different family requires — this is a typeface swap, not a type-scale redesign.
- No change to any component beyond what's needed to load and apply the new font token.

## Relevant authority / references

- `docs/UX_DECISIONS.md`, LAUNCH-VISION-001 entry: "...an abstract glyph family, typography)
  remains prototype-only pending its own separate, explicitly authorized Drop(s)."
- `src/ui/styles/fonts.ts`'s own header comment: the established self-hosted-via-`@fontsource`
  pattern and its rationale (offline-first, correctly subsetted, single-purpose maintained
  package — BEYOND not reinventing font subsetting/hosting).
- `prototype/launch-vision/index.html` / the published BEYOND Launch Vision Artifact: Big
  Shoulders Display is the actual font named and used for Terry's Suit's display type.
- Direct owner approval, this session, via `AskUserQuestion` ("Yes, switch it (Recommended)").

## Required invariants

- `src/engine/**` untouched (pure UI/token/dependency change only).
- App-wide 16px minimum font size (`docs/UX_DECISIONS.md`) unaffected — this Drop changes family,
  not size.
- Offline/service-worker precaching keeps working: the new font files must be picked up by
  `vite.config.ts`'s existing `workbox.globPatterns` woff2 handling the same way the three
  existing `@fontsource` packages already are, with no vite.config.ts change required if the
  glob is already family-agnostic (verify; only touch vite.config.ts if the glob is
  hard-coded to specific package names).
- No new runtime dependency beyond the one named font package — no CDN font loading, no
  `@font-face` hand-rolled outside the `@fontsource` pattern.

## Acceptance criteria

- `npm run verify` passes (architecture check + full test suite + production build).
- `grep -rn "Space Grotesk" src/` returns no remaining references (fully replaced, not
  dual-loaded) unless a deliberate fallback-chain mention is intentionally kept and justified
  inline.
- A production build's `dist/assets/` contains the new Big Shoulders Display `.woff2` file(s),
  and `dist`'s generated service-worker precache manifest includes them (spot-check via
  `npm run build` output or the generated manifest file).
- Visual verification: a real `npm run dev` screenshot of TODAY (and at least one other screen
  using `--font-display`) shows the headline rendering in Big Shoulders Display, not a fallback
  font — confirmed via `getComputedStyle(...).fontFamily` on a live headline element, not
  eyeballing alone.
- `docs/UX_DECISIONS.md` updated to reflect typography as authorized/locked for this piece.

## Required verification

`npm run verify` (architecture-boundary check + full vitest suite, node + browser projects +
production build). Additionally, since this is a dependency-addition High-Risk Drop: confirm
`npm run build`'s output actually includes the new font asset and that the service-worker
precache manifest picks it up (see Acceptance criteria above) — this is the compatibility
surface a dependency/asset-pipeline change actually risks (silently-uncached fonts breaking
offline headline rendering), not schema/backup/fixture compatibility, which this Drop does not
touch.

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/claude-typography-001 -b
  claude/typography-001-suit-headline origin/master`).
- Implement exactly the authorized scope; treat any expansion as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default against the diff's actual risk surface (the dependency/asset-pipeline
  boundary named above, plus a check that no other "Terry's Suit" element crept in beyond
  typography).
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  TYPOGRAPHY-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- If Big Shoulders Display is not actually available via `@fontsource` at implementation time
  (package removed/renamed upstream) — stop and escalate rather than substituting a different
  family without owner sign-off.
- If the service-worker precache glob in `vite.config.ts` turns out to be hard-coded per-package
  rather than a generic woff2 pattern — stop and escalate before editing build/deploy
  configuration, since that widens this Drop's footprint beyond a pure token/dependency swap.
- If removing the Space Grotesk dependency would break any other still-active reference to it —
  stop, keep Space Grotesk installed (unused-but-present is safe; a broken reference is not),
  and note the discrepancy in the Builder handoff rather than guessing.
- Any genuine conflict between this contract and `docs/OPERATOR_INTERFACE_DOCTRINE.md` or
  `CLAUDE.md` — escalate to the owner directly.
