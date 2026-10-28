BEYOND MARK: the split bat (BRAND-MARK-002, owner Drop 2026-10-28; first in-app use SUIT-ALIVE-001)

One mark, tall ears everywhere. Do not alter the geometry. Red is the HUD red (--red, #D0141B in
src/ui/styles/tokens.css) and black is the HUD black (#000000).

beyond-mark-icon.svg      The icon-safe gap. App icon, favicon, and anything under ~64px. In the
                          app, this is the header emblem and the cave heading.
beyond-mark-hairline.svg  The hairline gap. The boot screen and large headers only, never below
                          ~64px.
beyond-app-icon.svg       The 512 source for the home-screen icon: the icon mark on full-bleed black,
                          with no chamfer. The OS masks the shape, and the mark sits inside the
                          maskable safe zone.

public/icons/beyond-v2-* are rendered from these files by scripts/render-brand-icons.mjs. That
covers 192, 512, 512 maskable, 180 apple-touch, and the 32px and SVG favicons. Change an SVG here
first, then src/ui/components/BatMark.tsx. A unit test keeps the two identical. The chamfered
tiles stay inside the app.
