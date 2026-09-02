/**
 * BEYOND pilot icon family (Visual Identity Sprint, Phase B.1 — locked
 * 2026-08-21). `currentColor` throughout, so color is entirely
 * CSS-driven (red via the default text color inherited from an
 * accent-colored ancestor, monochrome via var(--text-1)/var(--text-2),
 * never hardcoded here). Purely reinforcing — the adjacent text label
 * is always the accessible name, so every icon renders aria-hidden.
 *
 * SHELL-001 (SUIT SYSTEM CONSOLIDATION) — Bat/system-identity resolution,
 * corrected 2026-08-31 per direct owner ruling (this comment previously
 * claimed the diamond itself was "BEYOND's one stable system-identity
 * glyph" / "identifying the machine itself"; that framing is retired —
 * see docs/UX_DECISIONS.md, "System identity — EMBLEM vs. GLYPHS
 * split"). The governing split: EMBLEM = THE MACHINE (Emblem.tsx, a
 * dedicated mark, sparingly placed) and GLYPHS = THE INSTRUMENTS — this
 * file. Each destination glyph's own outer silhouette is what "the
 * glyph system operates" through — one coherent instrument meaning
 * (which destination you're in), applied consistently via every
 * screen's own `.field-header`, never decorative repetition, never a
 * machine-identity claim.
 *
 * FIELD PROTOTYPE v1.0 — SUIT OS (2026-09-02, direct owner ruling,
 * reference boards supplied in-session): the mission/train/body/more
 * geometry below is redrawn to the abstract "suit instrumentation"
 * glyph language the owner specified — this explicitly supersedes the
 * former "frozen geometry, do not redraw" note on those four icons.
 * reset/shiftDown/success are untouched (not covered by the supplied
 * reference, out of this pass's scope) and remain frozen as before.
 * Shared construction across the four redrawn glyphs, matching the
 * reference's own stated grammar:
 *   - An open hex-bracket frame (two independent 3-point strokes, left
 *     + right — "open forms, not closed blobs," never a closed outline)
 *     that every destination glyph shares as its outer silhouette.
 *   - A distinguishing inner mark per destination (TODAY: one vertical
 *     beacon bar / TRAIN: a stacked double chevron / BODY: three
 *     vertical measurement bars / MORE: three dots) — this is the part
 *     that actually varies by function.
 *   - One small fixed-red "earned authority" tick beneath the frame,
 *     present in both active and inactive nav states (per the
 *     reference's own STATES row) — this is deliberately NOT
 *     currentColor, unlike the rest of the glyph, since it is a
 *     constant authority mark rather than a state-driven one.
 */
import type { ReactElement } from "react";

export type IconName = "mission" | "train" | "body" | "reset" | "shiftDown" | "success" | "more";

/**
 * The open hex-bracket frame shared by mission/train/body/more (FIELD
 * PROTOTYPE v1.0 — see file header). Two independent strokes, not one
 * closed path — "open forms, not closed blobs."
 */
function GlyphFrame() {
  return (
    <>
      <path d="M8.4 4 L4.6 8.2 L4.6 15.8 L8.4 20" />
      <path d="M15.6 4 L19.4 8.2 L19.4 15.8 L15.6 20" />
    </>
  );
}

/**
 * The fixed-red "earned authority" tick beneath the frame — always
 * accent-red, deliberately not currentColor (see file header).
 */
function GlyphTick() {
  return <path d="M12 20.4 L12 22.6" stroke="var(--accent-strong)" strokeWidth={2} strokeLinecap="square" />;
}

const PATHS: Record<IconName, ReactElement> = {
  mission: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="miter" strokeLinecap="square">
      <GlyphFrame />
      <path d="M12 8.6 L12 15.4" strokeWidth={2.2} />
      <GlyphTick />
    </g>
  ),
  train: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="miter" strokeLinecap="square">
      <GlyphFrame />
      <path d="M9 15 L12 12 L15 15" strokeWidth={1.5} />
      <path d="M9 11 L12 8 L15 11" strokeWidth={1.5} />
      <GlyphTick />
    </g>
  ),
  body: (
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="miter" strokeLinecap="square">
      <GlyphFrame />
      <path d="M9.5 9 L9.5 15 M12 9 L12 15 M14.5 9 L14.5 15" strokeWidth={1.5} />
      <GlyphTick />
    </g>
  ),
  reset: (
    <g fill="none" stroke="currentColor" strokeLinejoin="miter" strokeLinecap="square">
      <path d="M15 5.3 L20.5 12 L12 20.5 L3.5 12 L9 5.3" strokeWidth={1.8} />
      <path d="M9.3 6.2 L12 10.4 L14.7 6.2" strokeWidth={1.95} />
      <path d="M12 10.4 L12 15.6" strokeWidth={1.7} />
    </g>
  ),
  shiftDown: (
    <g fill="none" stroke="currentColor" strokeLinejoin="miter" strokeLinecap="square">
      <path d="M5 4.8 L12 8.2 L19 4.8" strokeWidth={1.7} />
      <path d="M6 10.9 L12 13.7 L18 10.9" strokeWidth={1.45} />
      <path d="M7 16.5 L12 18.7 L17 16.5" strokeWidth={1.2} />
    </g>
  ),
  success: (
    <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="miter" strokeLinecap="square">
      <path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" />
      <path d="M7.2 12.4 L10.6 15.8 L17 8.2" strokeWidth={2.4} />
    </g>
  ),
  /**
   * FIELD PROTOTYPE v1.0: MORE now shares the same open hex-bracket
   * frame as the other three destinations (previously it deliberately
   * did not — see the retired Overdrive Phase 14 reasoning below, no
   * longer current). Three small dots read as "more/overflow" inside
   * the shared frame instead of standing alone.
   */
  more: (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinejoin="miter" strokeLinecap="square" fill="none">
      <GlyphFrame />
      <g fill="currentColor" stroke="none">
        <circle cx={9.5} cy={12} r={1.1} />
        <circle cx={12} cy={12} r={1.1} />
        <circle cx={14.5} cy={12} r={1.1} />
      </g>
      <GlyphTick />
    </g>
  ),
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * Phase C motion primitives (see motion-prototypes artifact). Each is a
 * one-shot animation driven by CSS (icon-resolve-core / icon-signal /
 * icon-confirm-diamond / icon-confirm-check in global.css), so the
 * caller triggers it purely by mounting a fresh DOM node — key the
 * parent on whatever state transition should replay it.
 */
export function ResolveIcon({ size = 24 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="miter" strokeLinecap="square">
        <path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" />
        <path className="icon-resolve-core" d="M12 8.8 L15.2 12 L12 15.2 L8.8 12 Z" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export function SignalIcon({ name, size = 20 }: { name: "reset" | "shiftDown"; size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" className="icon-signal" style={{ flexShrink: 0 }}>
      {PATHS[name]}
    </svg>
  );
}

export function ConfirmIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="miter" strokeLinecap="square">
        <path className="icon-confirm-diamond" d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" />
        <path className="icon-confirm-check" d="M7.2 12.4 L10.6 15.8 L17 8.2" strokeWidth={2.4} />
      </g>
    </svg>
  );
}
