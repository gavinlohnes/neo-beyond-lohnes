---
id: EMBLEM-002
baseline: 62a13547fb811d7c88e1511777d666ca1992e10d
risk_tier: ROUTINE
---

# EMBLEM-002 // Machine Emblem Silhouette + Color Refresh

## Mission

Direct owner ruling, 2026-09-13/14 (in chat, after viewing the EMBLEM-001 mark rendered at real
size on a phone home screen): "the current icon is not what I want" — a full replacement of the
delivered EMBLEM-001 silhouette with a different candidate the owner picked from a reference
grid image ("top right looks the best"), plus a brighter red than the locked `#D6202B`
("I like the brighter red" — the exact red sampled from the owner's own reference image). This
supersedes EMBLEM-001's silhouette and color, both by direct owner instruction, not a Builder
judgment call — the owner supplied no vector source, so the shape was traced from the reference
image and independently re-verified for maskable-safe-zone compliance (EMBLEM-001's silhouette
was ~20% over the safe radius; this one is verified inside it, with margin).

## Approved baseline

`origin/master` at `62a13547fb811d7c88e1511777d666ca1992e10d`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. UI/asset/config only: SVG brand-mark files, generated PNG icons, and a manifest
`icons[].purpose` addition in `vite.config.ts` (not a dependency/lockfile change). No Engine,
domain, persistence, or correction-model file touched.

## Authorized scope

- Replace the polygon geometry and fill color in all four `docs/brand/beyond-mark/*.svg` files
  with the new traced silhouette (14-point polygon, bilaterally symmetrized, centered at
  (512,512) in the existing 1024x1024 viewBox) and the new color `#EA131C` (sampled directly
  from the owner's reference image, replacing `#D6202B`).
  - `beyond-mark-master.svg`: black background rect + red polygon. The old master's two black
    "mechanical channel" seam strokes are dropped — the new silhouette has no interior
    articulation to seam (this is a plainer, solid design by the owner's own selection, not an
    invented simplification).
  - `beyond-mark-foreground.svg`: same polygon, transparent background (no rect), for adaptive
    icon foreground use.
  - `beyond-mark-micro.svg`: same polygon + black background rect. No separate simplification
    needed — the new silhouette already reads clean at 32px (verified by render, see Required
    verification).
  - `beyond-mark-folded.svg`: the owner supplied only one silhouette, not a distinct compact/
    folded variant — this file becomes identical geometry to master rather than an invented
    alternate. Documented plainly in the README, not silently collapsed.
- Regenerate `public/icons/icon-512.png`, `icon-192.png`, `icon-32.png` from the new master
  geometry at each exact pixel size (opaque black square RGB, matching the existing files'
  format exactly).
- Update `docs/brand/beyond-mark/README.txt`: new locked palette line, new "EMBLEM-002" note
  documenting the silhouette/color replacement and the corrected maskable-safe-zone measurement
  (superseding, not deleting, the EMBLEM-001 integration note already there).
- Update `docs/UX_DECISIONS.md`'s "System identity — EMBLEM vs. GLYPHS split" entry with a short
  EMBLEM-002 addendum recording the new silhouette/color and the direct owner ruling.
- Update `docs/agent/CAPABILITY_MAP.md` if it references the specific EMBLEM-001 geometry/color
  facts, so it doesn't go stale.
- `vite.config.ts`: add `purpose: "any maskable"` to both manifest icon entries — this is now
  geometrically safe (see verification), which the EMBLEM-001 integration note itself named as
  the specific condition under which this should be revisited. Called out explicitly in the PR
  as an additive bonus, not silently bundled.

## Explicit exclusions

- No change to GLYPHS (`src/ui/icons/Icon.tsx`) — unrelated, locked instrument icon family.
- No change to `index.html`'s existing `<link rel="icon">`/`<link rel="apple-touch-icon">` tags
  — same file paths, only their pixel content changes.
- No new npm dependency. No Engine/domain/persistence file touched.
- Does not reopen or relitigate the EMBLEM vs. GLYPHS split doctrine itself — only the specific
  silhouette/color of the already-decided-to-exist machine emblem.

## Relevant authority / references

- Direct owner ruling in chat, 2026-09-13/14 (quoted in Mission above) — authority order #1,
  supersedes EMBLEM-001's own "canonical, do not redesign" instruction and the locked `#D6202B`
  color, both of which were themselves direct owner rulings now superseded by a newer one.
- `docs/brand/beyond-mark/README.txt`'s existing EMBLEM-001 integration note, which already
  named exactly this condition ("If true maskable/adaptive-icon support is wanted later, the fix
  is new derivatives generated from a version of this master with real safe-zone padding") as
  the trigger for adding maskable manifest support — satisfied here as a direct consequence of
  the new geometry, not a separate ask.
- `docs/UX_DECISIONS.md`'s "System identity — EMBLEM vs. GLYPHS split" (SHELL-001/EMBLEM-001).

## Required invariants

- The new polygon is bilaterally symmetric (verified programmatically before this contract was
  written — mirrored pairs share identical y and mirrored x offsets from center x=512).
- Every vertex stays within the W3C/Android maskable safe radius (409.6 of the 1024 viewBox,
  centered at 512,512) — verified: max vertex distance ~395.5, margin ~14.
- Generated PNGs are byte-identical in dimensions/format (opaque RGB, no alpha) to the files
  they replace — only pixel content changes.
- `public/icons/icon-32.png` (referenced by `index.html`'s 32x32 favicon link) is included in
  this regeneration — EMBLEM-001 added it but this Drop must not let it drift from the new mark.

## Acceptance criteria

- All four `docs/brand/beyond-mark/*.svg` files render the new silhouette/color with no
  self-intersection artifacts (checked by rendering each and visually confirming a single clean
  bat shape, not a star/burst — the exact bug class a prior session hit and fixed once already).
- `icon-512.png`/`icon-192.png`/`icon-32.png` visually match the new mark at each size, legible
  at 32px (no muddy/illegible collapse).
- `npm run build` succeeds with the new manifest `purpose` field present in the built
  `manifest.webmanifest`.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite + production build).
This Drop touches no test-covered application logic, so no new tests are expected — verification
here is primarily "nothing broke," plus the visual/rendering checks in Acceptance criteria above
(done via a real headless-Chromium render, already performed pre-contract during design
iteration with the owner).

## Builder expectations

- Work only in `../beyond-worktrees/claude-emblem-002` on branch
  `claude/emblem-002-mark-refresh`, cut from the baseline above.
- Implement exactly the authorized scope.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm the polygon is genuinely symmetric and safe-zone-compliant
  (don't just trust the contract's stated numbers — recompute them from the actual committed
  polygon points), confirm no non-brand file was touched, confirm PNG dimensions/format match.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close EMBLEM-002 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- If the traced polygon cannot be verified symmetric/safe-zone-compliant, stop and re-trace
  rather than ship uncertain geometry.
- A genuine conflict between this contract and higher repository authority that isn't resolved
  by the direct owner ruling already cited above.
