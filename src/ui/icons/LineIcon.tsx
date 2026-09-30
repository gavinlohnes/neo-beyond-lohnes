import type { LucideIcon } from "lucide-react";

/**
 * DECLUTTER Drop 3 (owner ruling 2026-09-30): Lucide supplies row icons
 * for rows the locked glyph family in Icon.tsx doesn't cover. This wrapper
 * pins them to that family's look — 1.7 stroke, square caps, miter joins,
 * currentColor — so the two sets read as one. The row's text label stays
 * the accessible name, so the icon is aria-hidden like every Icon glyph.
 * Import individual icons by name so only those ship in the bundle.
 */
export function LineIcon({ icon: Glyph, size = 20 }: { icon: LucideIcon; size?: number }) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.7}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    />
  );
}
