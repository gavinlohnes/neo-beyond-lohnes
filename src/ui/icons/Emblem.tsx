/**
 * FIELD PROTOTYPE v1.0 — SUIT OS (2026-09-02, direct owner ruling,
 * reference boards supplied in-session). EMBLEM = THE MACHINE, per
 * docs/OPERATOR_INTERFACE_DOCTRINE.md ("The Bat identifies the machine.
 * BEYOND's language operates it.") and docs/UX_DECISIONS.md's "System
 * identity — EMBLEM vs. GLYPHS split" — that decision left the mark
 * itself unbuilt pending a Drop explicitly chartered to deliver it;
 * this is that Drop, chartered directly by the owner.
 *
 * This is an original abstract angular wing-mark drawn in the spirit
 * the doctrine describes (sharp red directionality, controlled
 * asymmetry, lean silhouette, minimal ornament) — deliberately not a
 * traced reproduction of the licensed DC "Batman Beyond" logo artwork,
 * even though the doctrine permits using it in this private build.
 *
 * `currentColor`-driven like Icon.tsx's glyphs, but callers should
 * treat it as an identity mark, not a state-driven instrument — see
 * `.field-header__emblem` in global.css, which pins it to a quiet fixed
 * tone rather than letting it inherit the header's red. Used sparingly
 * (doctrine: "never random decoration, never inconsistent meaning") —
 * currently the one small corner mark on every screen's `.field-header`,
 * present regardless of which destination is active.
 */
export function Emblem({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <g fill="currentColor" stroke="none">
        <path d="M12 8.5 L12.9 11.4 L12 13.2 L11.1 11.4 Z" />
        <path d="M10.8 11.6 L2 8.4 L7.2 13.6 L10.4 13 Z" />
        <path d="M13.2 11.6 L22 8.4 L16.8 13.6 L13.6 13 Z" />
      </g>
    </svg>
  );
}
