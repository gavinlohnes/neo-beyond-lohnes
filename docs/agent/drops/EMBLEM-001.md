---
id: EMBLEM-001
baseline: 8dbebfb4b6aeae0d3b8297a00451a76dd77905de
risk_tier: ROUTINE
---

# EMBLEM-001 // BEYOND primary mark — first machine emblem

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in.

## Mission

Wire BEYOND's first-ever machine emblem — the app icon / home-screen mark — into the actual
app, replacing the orphaned, mismatched red-B placeholder asset discovered this session
(`public/icons/icon-192.png`/`icon-512.png`), and fix the missing `apple-touch-icon` link that
is the likely root cause of the reported home-screen icon mismatch. `docs/UX_DECISIONS.md`'s
"EMBLEM vs. GLYPHS split" (SHELL-001, locked 2026-08-31) states the machine emblem "does not
exist yet" and "must never be invented, traced, approximated, or introduced as placeholder
artwork by a Drop not explicitly chartered to deliver it." This Drop is that explicit charter:
the owner directly supplied final, approved production artwork (silhouette, proportions, and
color locked by the owner as design authority) and explicitly instructed that it be integrated
as-is — no redesign, reinterpretation, or substitution of the mark itself. This Drop's job is
pure technical integration of already-approved art, not design.

## Approved baseline

`origin/master` at `8dbebfb4b6aeae0d3b8297a00451a76dd77905de`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

**ROUTINE.** Asset replacement (PNG/SVG files) + two small `index.html` `<link>` additions +
one doctrine-record update. No dependency change, no schema/persistence/Engine boundary, no
architecture-boundary crossing. None of the Architectural or High-Risk triggers in
`.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Authorized scope

- Replace `public/icons/icon-192.png` and `public/icons/icon-512.png` with the owner-supplied,
  approved artwork (`beyond-icon-192.png`, `beyond-icon-512.png` from the delivered production
  package) — same filenames/paths, so `index.html` and `vite.config.ts`'s manifest need no
  reference changes.
- Add `<link rel="apple-touch-icon" href="icons/icon-192.png">` to `index.html`. No
  `apple-touch-icon` link exists today; iOS Safari's "Add to Home Screen" does not read the web
  manifest's `icons` array and falls back to its own heuristic (or a stale/generic icon) without
  this tag — the most plausible root cause of the mismatched home-screen icon reported this
  session.
- Add a purpose-sized favicon declaration using the delivered 32px asset
  (`<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">`) alongside the
  existing icon-192 link (add `sizes="192x192"` to that existing tag for clarity) — crisper
  browser-tab rendering than relying on the browser to downscale the 192px asset. Requires
  adding `public/icons/icon-32.png` from the delivered package.
- Commit the delivered SVG masters (`beyond-mark-master.svg`, `beyond-mark-foreground.svg`,
  `beyond-mark-folded.svg`, `beyond-mark-micro.svg`) and the package's own `README.txt` into
  `docs/brand/beyond-mark/` as the permanent source-of-truth, per that README's own production
  rule: "Do not redraw the mark from generated concept imagery. Update this master geometry,
  then regenerate derivatives."
- Do NOT declare `"purpose": "any maskable"` on the manifest icon entries — see Required
  invariants below for why, and Explicit exclusions for what this Drop does not attempt to fix
  about that instead.
- Update `docs/UX_DECISIONS.md`'s "EMBLEM vs. GLYPHS split" entry to record that the machine
  emblem now exists and is locked, with a pointer to `docs/brand/beyond-mark/`.

## Explicit exclusions

- No change to the mark's silhouette, proportions, or color (`#D6202B`) — owner design
  authority, explicitly locked, not this Drop's to touch.
- No change to `--accent`/`--red-b` or any in-app CSS color token. The emblem's `#D6202B` is a
  static, external-facing brand asset (app icon / home-screen mark only); this Drop does not
  re-lock or unify it with the in-app UI's red, which remains a separate, already-adjudicated
  decision (LAUNCH-VISION-001/002). If the owner wants that unification later, it needs its own
  explicit decision, not an inference from this Drop.
- No attempt to make the delivered artwork itself maskable-safe-zone compliant (i.e., no
  cropping, rescaling, or re-padding of the mark's pixels/geometry) — that would be altering
  owner-locked artwork. The fix here is declaring the manifest icons honestly as `"any"`
  (already the repo's existing default — no `purpose` field is set today), matching what the
  delivered art actually is, rather than mis-declaring un-padded full-bleed art as `maskable`.
  If true maskable/adaptive-icon support is wanted later, that requires new artwork generated
  from the master geometry with real safe-zone padding — a follow-up for whoever maintains
  `docs/brand/beyond-mark/`'s source, not a pixel edit performed here.
- No change to `src/ui/icons/Icon.tsx` (GLYPHS) — unrelated, already-locked instrument family.
- No change to any other still-deferred "Terry's Suit" element (surface geometry beyond
  `--chamfer`).

## Relevant authority / references

- `docs/UX_DECISIONS.md`, "System identity — EMBLEM vs. GLYPHS split" (SHELL-001,
  2026-08-31): the emblem "does not exist yet," must never be approximated as placeholder art
  by an unchartered Drop, and "a future machine-emblem Drop must name its own exact placement
  as a locked decision before implementation" — this contract is that naming.
  `docs/agent/drops/SHELL-001.md` ("Deferred to future machine-emblem integration") for the
  integration seam it inherits.
- Direct owner supply of final production artwork this session, with explicit instruction:
  "Treat its silhouette and proportions as design authority... Do not redesign, reinterpret, or
  substitute the emblem. Use this supplied mark as the canonical visual reference."
- The delivered package's own `README.txt` (now committed to `docs/brand/beyond-mark/`) for the
  production rule governing future changes to the master geometry.
- W3C manifest icon `purpose` member spec / Android adaptive-icon safe-zone convention (icon
  content should stay within ~80% of viewport diameter to be safely maskable) — the basis for
  this Drop's finding that the delivered art does not meet that bar and should not be declared
  `maskable`, verified directly: the master polygon's wingtip vertices sit at radius ≈495 units
  from center in the 0–1024 viewBox (safe radius = 409.6), ≈21% past the safe zone.

## Required invariants

- The emblem's exact pixels/geometry as delivered are never modified by this Drop.
- `src/engine/**`, `src/ui/icons/Icon.tsx`, and all in-app CSS color tokens untouched.
- Service-worker precache continues to include the icon assets (already covered by
  `vite.config.ts`'s existing `workbox.globPatterns` `png` entry — verify, don't assume).
- Manifest icon `purpose` is never set to a value the actual artwork doesn't satisfy.

## Acceptance criteria

- `npm run verify` passes (architecture check + full test suite + production build).
- `public/icons/icon-192.png` and `icon-512.png` are byte-identical to the delivered
  `beyond-icon-192.png`/`beyond-icon-512.png` (checksum-verified, not eyeballed).
- `index.html` has both a `rel="apple-touch-icon"` link and a `sizes="32x32"` favicon link,
  both resolving to real files that exist in `public/icons/`.
- `docs/brand/beyond-mark/` exists with all four delivered SVGs plus the README.
- A production build's `dist/` contains the new icon bytes (not stale/cached), and the
  generated service-worker precache manifest includes `icon-32.png`.
- Live verification: a real `npm run dev` load, screenshot of the browser tab (favicon) and a
  manual check that `<link rel="apple-touch-icon">` resolves (200, correct bytes) — not just
  "the tag exists in source."

## Required verification

`npm run verify` (architecture-boundary check + full vitest suite, node + browser projects +
production build). Additionally: checksum comparison of shipped vs. delivered PNG bytes (this
Drop's actual risk is "silently shipped the wrong/stale file," not a build-pipeline or
dependency risk), and a live-server check that both new `<link>` tags resolve to real assets.

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/claude-emblem-001 -b
  claude/emblem-001-primary-mark origin/master`).
- Implement exactly the authorized scope; treat any expansion (e.g. touching the mark's
  geometry, or unifying in-app red tokens with `#D6202B`) as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm shipped PNG bytes are checksum-identical to the owner-supplied
  files (not a re-export, not a re-encode that silently altered pixels), confirm no in-app CSS
  token or `Icon.tsx` geometry was touched, and confirm the `purpose` field really was left unset
  rather than quietly copied from the delivered `manifest-icons.json` snippet (which claims
  `"any maskable"` — a claim this contract's own analysis found the art doesn't support).
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review (the
  same-account "Can not approve your own pull request" GitHub restriction may again make a
  formal APPROVED review mechanically impossible in this environment — if so, document that
  explicitly in the review body, as on the prior two Drops).
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved (or, if formal approval is mechanically blocked per the above,
  explicitly owner-authorized), reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  EMBLEM-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- If achieving true maskable-safe-zone compliance is requested mid-Drop — stop; that requires
  new artwork from the master source, which is a design change outside this contract's
  authorization, not a technical integration task.
- Any request to change `--accent`/`--red-b` to match `#D6202B` — stop and escalate; that is a
  separate, larger decision (unifying emblem and in-app UI color) this contract does not cover.
- Any genuine conflict between this contract and `docs/OPERATOR_INTERFACE_DOCTRINE.md` or
  `CLAUDE.md` — escalate to the owner directly.
