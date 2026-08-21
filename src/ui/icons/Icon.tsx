/**
 * BEYOND pilot icon family (Visual Identity Sprint, Phase B.1 — locked
 * 2026-08-21). Six destinations/states, one grammar: sharp angular
 * geometry, restrained stroke weight, the diamond as shared structural
 * motif. Geometry is frozen — do not redraw or reinterpret; only the
 * `size` a caller passes should change.
 *
 * `currentColor` throughout, so color is entirely CSS-driven (red via
 * the default text color inherited from an accent-colored ancestor,
 * monochrome via var(--text-1)/var(--text-2), never hardcoded here).
 * Purely reinforcing — the adjacent text label is always the
 * accessible name, so every icon renders aria-hidden.
 */
import type { ReactElement } from "react";

export type IconName = "mission" | "train" | "body" | "reset" | "shiftDown" | "success";

const PATHS: Record<IconName, ReactElement> = {
  mission: (
    <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="miter" strokeLinecap="square">
      <path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z" />
      <path d="M12 8.8 L15.2 12 L12 15.2 L8.8 12 Z" fill="currentColor" stroke="none" />
    </g>
  ),
  train: (
    <g fill="currentColor" stroke="currentColor" strokeLinejoin="miter" strokeLinecap="square">
      <path d="M4.6 7.8 L8.8 12 L4.6 16.2 L0.4 12 Z" />
      <path d="M19.4 7.8 L23.6 12 L19.4 16.2 L15.2 12 Z" />
      <path d="M6.5 12 L17.5 12" strokeWidth={3.4} fill="none" />
    </g>
  ),
  body: (
    <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="miter" strokeLinecap="square">
      <path d="M12 3.8 L18.9 7.9 L18.9 16.1 L12 20.2 L5.1 16.1 L5.1 7.9 Z" />
      <path d="M12 9.4 L14.6 12 L12 14.6 L9.4 12 Z" fill="currentColor" stroke="none" />
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
