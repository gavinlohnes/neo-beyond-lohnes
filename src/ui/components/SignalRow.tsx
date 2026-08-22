import type { ReactNode } from "react";

/**
 * Suit Layer 01 (Visual System Hardening, 2026-08-22): the ATTENTION-tier
 * row primitive — earned-but-not-commanding surfaces (a suggested RESET/
 * SHIFT DOWN, an overdue commitment, a pending outcome rating) get a thin
 * left accent tick and the neutral `.tool-label` header, not the bold
 * `.command-surface` territory reserved for the one real dominant
 * decision. Originally a file-local function inside TodayScreen.tsx,
 * explicitly left there "waiting for a second real caller."
 *
 * FIELD ALPHA Phase 1: promoted to a shared component now that TRAIN/
 * BODY/MORE are about to need an ATTENTION-tier surface of their own
 * (Phases 2-5) — pure extraction, no behavior or markup change.
 */
export function SignalRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card signal-row">
      <p className="tool-label">{label}</p>
      {children}
    </div>
  );
}
