BEYOND PRIMARY MARK — PRODUCTION MASTER v1.0

Design authority
Concept-art direction approved by owner. These files convert that direction
into deterministic vector geometry.

Locked palette
BEYOND RED: #EA131C (superseded #D6202B, EMBLEM-002)
BLACK: #000000

Files
beyond-mark-master.svg      Canonical deployed mark, full detail.
beyond-mark-micro.svg       Simplified mark for 16–48 px (EMBLEM-002: identical
                            geometry to master — this silhouette has no
                            fragile articulation left to strip; see below).
beyond-mark-folded.svg      EMBLEM-002: identical geometry to master. The
                            owner supplied only one silhouette this round,
                            not a distinct compact/folded variant — this file
                            is not an invented alternate, just the same mark.
beyond-mark-foreground.svg  Transparent foreground for adaptive icons.
beyond-icon-*.png           Raster legibility tests / icon assets.
manifest-icons.json         PWA manifest icon snippet.

Optical decisions
- Bilateral mass is balanced around x=512.
- EMBLEM-002's silhouette is a single solid shape with no interior seam/
  channel detail — it was selected by the owner specifically because it
  reads clean at small sizes without fine internal lines to blur or muddy
  (verified down to 32px). The "mechanical channels" language below
  describes EMBLEM-001's now-superseded geometry, kept for history.
- Outer wings remain broad enough to survive reduction.
- Generous black field is retained for maskable/adaptive-icon safety, and
  EMBLEM-002's geometry now genuinely fits the maskable safe zone (see note
  below) rather than merely leaving room for it.

Production rule
Do not redraw the mark from generated concept imagery. Update this master
geometry, then regenerate derivatives.

---

EMBLEM-001 integration note (2026-09-11)

Measured directly against the master/foreground polygons: wingtip vertices sit
at radius ~495 (master) / ~490 (foreground) from center in the 0-1024 viewBox.
The W3C/Android maskable safe zone is a radius of 409.6 (40% of viewBox) - both
files exceed it by ~20%, meaning a circular/squircle OS mask would clip the
wingtips. This is a fact about the current geometry, not a request to redraw
it: BEYOND's manifest.icons entries deliberately omit `"purpose": "maskable"`
(left as the spec default `"any"`) rather than mis-declare this art as
maskable-safe. If true maskable/adaptive-icon support is wanted later, the fix
is new derivatives generated from a version of this master with real safe-zone
padding around the same silhouette - not a pixel edit of the delivered files.

---

EMBLEM-002 silhouette + color replacement (2026-09-13/14)

Direct owner ruling, made after viewing EMBLEM-001 rendered at real size on a phone home
screen: "the current icon is not what I want." The owner picked a different silhouette from a
reference grid image and a brighter red sampled directly from that same image. No vector source
was available, so the chosen silhouette was traced from the reference image (14-point polygon,
bilaterally symmetrized programmatically around x=512) and independently measured before
shipping, rather than eyeballed:

- Farthest vertices (wingtips) sit at radius ~395.5 from center (512,512) in the 0-1024
  viewBox - inside the W3C/Android maskable safe radius of 409.6, with a margin of ~14. This is
  the opposite finding from EMBLEM-001 (which exceeded the safe radius by ~20%): this geometry
  was sized to fit the safe zone from the start, not fitted to it after the fact.
- New color: #EA131C, sampled directly from the owner's reference image (previously #D6202B).
- Because this geometry now genuinely satisfies the maskable safe zone, `vite.config.ts`'s
  manifest icon entries gained `purpose: "any maskable"` in the same Drop (EMBLEM-002) - the
  exact condition the EMBLEM-001 note above named as the trigger for adding it.
