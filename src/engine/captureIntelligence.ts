import * as chrono from "chrono-node";
import nlp from "compromise";
import { formatLocalDate } from "./scheduledContext";
import type { CaptureDateSuggestion } from "../domain/capture/types";

/**
 * Capture Intelligence layer (2026-09-02) — see docs/agent/CAPABILITY_MAP.md's
 * CAPTURE entry for the full donor-evaluation history. A 30-round, 2,700-case
 * adversarial falsification campaign rejected both extremes: a rules-only
 * stack overfit under composition (post-hoc fixes that reached 100% on a
 * failing family regressed the combined set to ~88%), and a small local
 * classifier either generalized poorly or bought precision by abstaining
 * itself down to ~47% recall. The approved direction is chrono-node +
 * Compromise supplying raw linguistic evidence (a candidate date, a
 * negation signal) feeding a BEYOND-owned confidence/abstention gate —
 * this function is that gate. It never invents a date from weak or
 * conflicting evidence; "no suggestion" is always the safe default,
 * matching the Intelligence Contract's "conflicting evidence should
 * abstain." A returned suggestion is a PROPOSAL only — see
 * CaptureDateSuggestion's own doc comment — this function itself performs
 * no I/O and writes nothing.
 */
export function suggestCaptureDueDate(text: string, now: Date): CaptureDateSuggestion | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Negation is a hard abstention trigger rather than a case to special-case
  // around (e.g. "don't forget X Friday" is actionable despite negation).
  // Chasing individual adversarial phrasings like that is exactly what the
  // falsification campaign found caused a rules-only stack to overfit and
  // regress on the combined set — a missed suggestion here just means the
  // operator types the date manually, which stays available and safe.
  if (nlp(trimmed).has("#Negative")) return null;

  const results = chrono.parse(trimmed, now, { forwardDate: true });
  if (results.length !== 1) return null; // none, or multiple conflicting date candidates

  const result = results[0];
  if (!result) return null;
  const date = result.start.date();
  const confidence: CaptureDateSuggestion["confidence"] =
    result.start.isCertain("day") || result.start.isCertain("weekday") ? "STRONG" : "WEAK";

  return {
    dueAt: formatLocalDate(date),
    label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    matchedText: result.text,
    confidence,
  };
}
