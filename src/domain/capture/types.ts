/**
 * Capture Intelligence layer (2026-09-02, owner-approved: chrono-node +
 * Compromise — see docs/agent/CAPABILITY_MAP.md's CAPTURE entry for the
 * full donor-evaluation history). A CaptureDateSuggestion is always a
 * PROPOSAL: it only ever pre-fills an editable field in the existing
 * Capture-to-Obligation conversion form. It is never written to Dexie by
 * itself and never silently becomes an Obligation's dueAt — the operator
 * must still submit that form, and may edit or clear the date first.
 */
export interface CaptureDateSuggestion {
  /** YYYY-MM-DD — matches Obligation.dueAt's own format exactly (src/domain/intent/types.ts). */
  dueAt: string;
  /** Human-readable rendering of the detected date, e.g. "Thu, Sep 3". */
  label: string;
  /** The exact substring of the capture text chrono-node matched — shown as evidence, never hidden. */
  matchedText: string;
  /**
   * STRONG: chrono-node resolved a specific calendar day with reasonable
   * certainty (an explicit date, weekday, or relative-day expression).
   * WEAK: a date was found but the evidence is looser (e.g. a bare
   * time-of-day with no identifiable day) — still surfaced, per the
   * Intelligence Contract's "useful but uncertain should augment rather
   * than impersonate certainty," but visually distinguished so the
   * operator isn't misled about how sure BEYOND actually is.
   */
  confidence: "STRONG" | "WEAK";
}
