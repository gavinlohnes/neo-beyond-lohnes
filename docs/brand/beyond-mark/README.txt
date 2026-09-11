BEYOND PRIMARY MARK — PRODUCTION MASTER v1.0

Design authority
Concept-art direction approved by owner. These files convert that direction
into deterministic vector geometry.

Locked palette
BEYOND RED: #D6202B
BLACK: #000000

Files
beyond-mark-master.svg      Canonical deployed mark, full detail.
beyond-mark-micro.svg       Simplified mark for 16–48 px.
beyond-mark-folded.svg      Supporting compact/folded-device mark.
beyond-mark-foreground.svg  Transparent foreground for adaptive icons.
beyond-icon-*.png           Raster legibility tests / icon assets.
manifest-icons.json         PWA manifest icon snippet.

Optical decisions
- Bilateral mass is balanced around x=512.
- Central spine is intentionally dominant.
- Outer wings remain broad enough to survive reduction.
- Mechanical channels are suppressed below 64 px because they collapse
  visually at micro sizes.
- The micro mark removes fragile articulation while preserving the deployed
  silhouette and center V.
- Generous black field is retained for maskable/adaptive-icon safety.

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
