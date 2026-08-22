import type { Capacity } from "../../../domain/common/types";
import type { MinimumDayStatus } from "../../../application/queries";

/**
 * Phase 3 (Minimum Day and the low-capacity experience). Pure copy/logic
 * only — the locked six-item baseline itself (thresholds, what counts,
 * what's auto vs manual) lives entirely in application/queries.ts's
 * getMinimumDayStatus and is unchanged by anything here. This file only
 * decides wording and when to surface Minimum Day more prominently.
 */

/**
 * "RED or seriously constrained (multiple YELLOW factors)" — RED always
 * qualifies (it's already the most urgent tier); a YELLOW day qualifies
 * only once two or more separate conditions are driving it, not a single
 * mild one. Matches deriveCapacity's own reasonCodes (engine/capacity.ts)
 * as the source of "how many factors."
 */
export function isSeriouslyConstrained(capacity: Capacity, reasonCodeCount: number): boolean {
  if (capacity === "RED") return true;
  if (capacity === "YELLOW") return reasonCodeCount >= 2;
  return false;
}

/**
 * Existing locked line (Decision Register, RESET/CAPACITY), left verbatim
 * for the normal (non-prominent) placement, per "preserve tone exactly."
 */
export const MINIMUM_DAY_ENABLE_BODY =
  "Reduced six-minimum baseline for a low-capacity day. Lowers expectations, doesn't add work.";

/**
 * Prominent-placement copy: offered as an option tied to the objective
 * capacity signal (already shown above in PRIMARY GUIDANCE), not a
 * comment on the user or their day. Deliberately paraphrases the same
 * locked "lowers expectations, doesn't add work" idea rather than
 * introducing a new claim, and ends by restating that turning it on is
 * the user's choice — nothing here implies the day is a failure or that
 * declining the offer is the wrong call.
 */
export const MINIMUM_DAY_PROMINENT_TITLE = "Minimum Day is here if it helps";
export const MINIMUM_DAY_PROMINENT_BODY =
  "The same six basics, with lower expectations and nothing extra added: hydrate, protein, meds, hygiene, a few minutes of movement, and a few minutes of recovery or connection. Turning it on is entirely up to you.";

export type MinimumDayItemKey = keyof Omit<MinimumDayStatus, "enabled" | "allSatisfied">;

export interface MinimumDayItemConfig {
  key: MinimumDayItemKey;
  label: string;
  /** Explains whether/how this item updates on its own vs. needs a tap — item 2's "mixed behavior needs explaining, not changing." */
  updateNote: string;
}

/**
 * FIELD ALPHA Gate A correction (2026-08-22): real-device evidence
 * showed Minimum Day's full six-item contents consuming substantial
 * vertical space even when it wasn't the operator's primary concern.
 * This is the GLANCE-depth summary line for its collapsed
 * CollapsibleRow — completion count when active, a plain "off" state
 * otherwise. Purely descriptive of existing MinimumDayStatus fields;
 * no new completion/urgency logic.
 */
export function describeMinimumDaySummary(status: { enabled: boolean } & Record<MinimumDayItemKey, boolean>): string {
  if (!status.enabled) {
    return "Off — a reduced six-item baseline, if it'd help.";
  }
  const total = MINIMUM_DAY_ITEMS.length;
  const done = MINIMUM_DAY_ITEMS.filter((item) => status[item.key]).length;
  return `Reduced baseline · ${done} / ${total}`;
}

export const MINIMUM_DAY_ITEMS: MinimumDayItemConfig[] = [
  {
    key: "hydrate",
    label: "Hydrate ≥40oz",
    updateNote: "Updates automatically from BODY water logs, or log it right here.",
  },
  {
    key: "protein",
    label: "Protein ≥25g",
    updateNote: "Updates automatically from BODY protein logs, or log it right here.",
  },
  {
    key: "meds",
    label: "Meds",
    updateNote: "No auto-detection for this one — tap when you're ready.",
  },
  {
    key: "hygiene",
    label: "Hygiene",
    updateNote: "No auto-detection for this one — tap when you're ready.",
  },
  {
    key: "move",
    label: "Move ≥5min",
    updateNote: "Updates automatically from a Recovery session on TRAIN, or tap when you're ready.",
  },
  {
    key: "recoverConnect",
    label: "Recover or Connect ≥10min",
    updateNote:
      "Updates automatically from a Recovery session on TRAIN — or tap whichever one you actually did below. Either counts.",
  },
];
