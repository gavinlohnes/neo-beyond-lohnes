import type { EatingWindowDayKind } from "../domain/common/types";

/**
 * GRAYSON-WINDOW-REVIEW-001 (C4.8c): what he hid in BODY's eating-window review and which "move the plan" offers he
 * kept (hidden for 14 days). A UI preference in localStorage like whatMovesPreference.ts: no event, no schema change.
 * It travels in the backup's settings block (settingsTransfer.ts). Never throws; anything unreadable falls back.
 */
export const WINDOW_REVIEW_KEY = "beyond.windowReview.v1";

export interface WindowReviewPreference {
  hideActual?: boolean;
  hideReview?: boolean;
  /** Local date (YYYY-MM-DD) he chose KEEP on an offer, per kind of day. */
  keptOffers: Partial<Record<EatingWindowDayKind, string>>;
}
const KINDS: readonly EatingWindowDayKind[] = ["WORK", "RECOVERY", "OFF"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readWindowReviewPreference(): WindowReviewPreference {
  try {
    const raw = JSON.parse(localStorage.getItem(WINDOW_REVIEW_KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { keptOffers: {} };
    const v = raw as { hideActual?: unknown; hideReview?: unknown; keptOffers?: unknown };
    const kept: Partial<Record<EatingWindowDayKind, string>> = {};
    if (v.keptOffers && typeof v.keptOffers === "object" && !Array.isArray(v.keptOffers)) {
      for (const kind of KINDS) {
        const date = (v.keptOffers as Record<string, unknown>)[kind];
        if (typeof date === "string" && DATE.test(date)) kept[kind] = date;
      }
    }
    return { ...(v.hideActual === true ? { hideActual: true } : {}), ...(v.hideReview === true ? { hideReview: true } : {}), keptOffers: kept };
  } catch {
    return { keptOffers: {} };
  }
}

export function writeWindowReviewPreference(preference: WindowReviewPreference): void {
  try {
    localStorage.setItem(WINDOW_REVIEW_KEY, JSON.stringify({
      ...(preference.hideActual ? { hideActual: true } : {}), ...(preference.hideReview ? { hideReview: true } : {}), keptOffers: preference.keptOffers,
    }));
  } catch { /* storage blocked: the default stays */ }
}
