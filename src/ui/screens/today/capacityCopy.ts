import type { Capacity } from "../../../domain/common/types";

/**
 * Phase 2 (TODAY as daily command surface): plain-language rendering of
 * deriveCapacity's reason codes, for a leading sentence like "Capacity is
 * RED because stress is very high." Purely a display-layer translation —
 * this file does not decide capacity itself. The locked rule
 * (src/engine/capacity.ts) is the only source of truth; this only maps
 * its exact reason-code strings to words. An unrecognized code falls back
 * to the raw code rather than silently hiding it, so a future rule change
 * shows up as unpolished text here instead of a wrong or missing claim.
 */

const REASON_LABELS: Record<string, string> = {
  "energy == 1": "energy is critically low",
  "stress == 5": "stress is very high",
  "mood == 1": "mood is critically low",
  "alcoholUrge >= 4": "alcohol urge is very high",
  "energy <= 2": "energy is low",
  "stress >= 4": "stress is high",
  "mood <= 2": "mood is low",
  "soreness >= 4": "soreness is high",
  "alcoholUrge >= 2": "alcohol urge is elevated",
  "no severe or constrained condition": "nothing is flagged as severe or constrained",
};

function describeReason(code: string): string {
  return REASON_LABELS[code] ?? code;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function describeCapacity(capacity: Capacity, reasonCodes: string[]): string {
  const reasons = joinWithAnd(reasonCodes.map(describeReason));
  if (capacity === "GREEN") {
    return `Capacity is GREEN — ${reasons}.`;
  }
  return `Capacity is ${capacity} because ${reasons}.`;
}
