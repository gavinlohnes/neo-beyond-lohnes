/**
 * SUIT-ALIVE-001 (owner ruling 2026-10-28): the original red bat mark, inside the app in three places
 * only — the header emblem, the cave heading and the cold start. Geometry and color come from
 * docs/brand/suit-mark/suit-mark.svg (a test keeps them identical). Identity, not a signal: it never
 * changes with state. EMBLEM-002 stays the app icon.
 */
export const BAT_PATH = "M50 13 L53.5 5 L55.5 14 L63 12.5 L97 20 L84 23.5 L88 35 L73 31 L67 44 L59 36 L50 48 L41 36 L33 44 L27 31 L12 35 L16 23.5 L3 20 L37 12.5 L44.5 14 L46.5 5 Z";
export const BAT_RED = "#D0141B";

export function BatMark({ width, className }: { width: number; className?: string }) {
  return (
    <svg className={className ? `bat-mark ${className}` : "bat-mark"} width={width} height={Math.round(width * 0.52)}
      viewBox="0 0 100 52" aria-hidden="true" focusable="false">
      <path d={BAT_PATH} fill={BAT_RED} />
    </svg>
  );
}
