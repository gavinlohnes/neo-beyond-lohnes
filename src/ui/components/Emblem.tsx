/**
 * BRAND-MARK-003 (owner Brand Drop v2, 2026-10-28): BEYOND's emblem on its chamfered plate, the one
 * in-app logo: the header, the cave heading, the boot screen and the shift moments. Geometry is locked
 * and identical to docs/brand/beyond-emblem/beyond-plate.svg (a test keeps them identical); colors are
 * the palette tokens: --brand-yellow plate, HUD black (--bg) emblem, --red primary, with yellow detail.
 * Identity, not a signal: it never changes with state. No oval or circle container, ever.
 */
export const EMBLEM_PLATE = "M0,0 H432 L512,80 V512 H0 Z";
export const EMBLEM_OUTER = "M140,96 L132,44 L124,100 L14,65 Q-34,74 -40,190 Q10,170 20,214 Q50,184 74,228 Q92,200 104,196 L150,290 L196,196 Q208,200 226,228 Q250,184 280,214 Q290,170 340,190 Q334,74 286,65 L176,100 L168,44 L160,96 Z";
export const EMBLEM_INNER = "M143,116 L157,116 L166,86 L169,119 Q216,114 271,86 Q240,128 230,194 Q210,174 196,169 Q166,204 150,259 Q134,204 104,169 Q90,174 70,194 Q60,128 29,86 Q84,114 131,119 L134,86 Z";
export const EMBLEM_EYES = "M139,124 L147,126 L147,130 L141,129 Z M161,124 L153,126 L153,130 L159,129 Z";

export function Emblem({ size, className }: { size: number; className?: string }) {
  return (
    <svg className={className ? `emblem ${className}` : "emblem"} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <path d={EMBLEM_PLATE} style={{ fill: "var(--brand-yellow)" }} />
      <g transform="translate(106,89)">
        <path d={EMBLEM_OUTER} style={{ fill: "var(--black, #000)" }} />
        <path d={EMBLEM_INNER} strokeWidth={5} strokeLinejoin="miter" style={{ fill: "var(--red)", stroke: "var(--brand-yellow)" }} />
        <path d={EMBLEM_EYES} style={{ fill: "var(--brand-yellow)" }} />
      </g>
    </svg>
  );
}
