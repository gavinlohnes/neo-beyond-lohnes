BEYOND EMBLEM — Brand Drop v2 (BRAND-MARK-003, owner Drop 2026-10-28). Supersedes the split bat
(BRAND-MARK-002) and every earlier mark.

Geometry is locked: never redraw, simplify or clean up the paths. Colors are the palette tokens in
src/ui/styles/tokens.css: --red #D0141B (primary), --bg #000000 (HUD black), --brand-yellow #F7C928
(brand accent). No oval or circle container around the emblem, ever.

beyond-app-icon.svg  Home-screen icon: full-bleed yellow; the OS masks the shape (manifest "maskable").
beyond-plate.svg     The chamfered plate: manifest "any", apple-touch, favicon, boot screen and every
                     in-app logo. Chamfer 80/512, the HUD's square-tile proportion (the 64px LOG tile's
                     10px cut, 0.156), replacing the Drop's 60/512 placeholder.
beyond-mono.svg      Android themed icon (manifest "monochrome"): one-color silhouette.

public/icons/beyond-v3-* are rendered from these by scripts/render-brand-icons.mjs.
src/ui/components/BatMark.tsx draws the plate inline; a unit test keeps the two identical.
