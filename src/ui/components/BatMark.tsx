/**
 * BRAND-MARK-002 (owner Drop 2026-10-28): the split bat, tall ears, one mark everywhere. Two cuts of the
 * same geometry, from docs/brand/suit-mark/ (a test keeps them identical):
 * - "icon": the icon-safe gap, for anything under ~64px (header emblem, cave heading);
 * - "hairline": the hairline gap, for the boot screen and large headers only, never below ~64px.
 * Red is the HUD red (--red). Identity, not a signal: it never changes with state. The installed-app
 * icon is the same mark on full-bleed black (public/icons/beyond-v2-*).
 */
export const BAT_MARKS = {
  icon: ["72,54 67,54 63,34 58,60 15,50 23,66 35,74 41,68 51,80 57,74 72,92", "78,54 83,54 87,34 92,60 135,50 127,66 115,74 109,68 99,80 93,74 78,92"],
  hairline: ["74,54 69,54 65,34 60,60 15,50 23,66 35,74 41,68 51,80 57,74 74,92", "76,54 81,54 85,34 90,60 135,50 127,66 115,74 109,68 99,80 93,74 76,92"],
} as const;
export const BAT_VIEWBOX = "10 30 130 66";
export const BAT_RED = "#D0141B";

export function BatMark({ width, className, cut = "icon" }: { width: number; className?: string; cut?: keyof typeof BAT_MARKS }) {
  return (
    <svg className={className ? `bat-mark ${className}` : "bat-mark"} width={width} height={Math.round(width * 66 / 130)}
      viewBox={BAT_VIEWBOX} aria-hidden="true" focusable="false">
      {BAT_MARKS[cut].map((points) => <polygon key={points} points={points} fill={BAT_RED} />)}
    </svg>
  );
}
