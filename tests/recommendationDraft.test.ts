import { describe, expect, it } from "vitest";
import { deriveRecommendationDraft } from "../src/engine/recommendationDraft";
const nights = ["2026-11-17T16:30:00Z", "2026-11-18T16:30:00Z"].map(livedDayStart => ({ livedDayStart, minutes: 300, kind: "WORK" as const, low: 405, high: 435 }));
const input = { hasCheckIn: false, hasRecommendation: false, hasUnresolvedPostShift: false, shortSleep: { streak: true, nights } };
describe("provisional recommendation policy", () => {
  it("suggests recovery only from the existing two-night signal, without claiming capacity", () => {
    expect(deriveRecommendationDraft(input)).toMatchObject({ kind: "RECOVER", nights, trace: { capacity: "UNKNOWN", rule: "TWO_SHORT_MAIN_SLEEPS" } });
    expect(deriveRecommendationDraft({ ...input, shortSleep: { streak: false, nights } })).toBeNull();
    expect(deriveRecommendationDraft({ ...input, shortSleep: { streak: true, nights: nights.slice(0, 1) } })).toBeNull();
  });
  it("preserves post-shift precedence and abstains without evidence", () => {
    expect(deriveRecommendationDraft({ ...input, hasUnresolvedPostShift: true })).toMatchObject({ kind: "POST_SHIFT_TRANSITION", nights: [] });
    expect(deriveRecommendationDraft({ ...input, shortSleep: { streak: false, nights: [] } })).toBeNull();
  });
  it("never competes with an actual check-in or issued recommendation", () => {
    expect(deriveRecommendationDraft({ ...input, hasCheckIn: true })).toBeNull();
    expect(deriveRecommendationDraft({ ...input, hasRecommendation: true })).toBeNull();
  });
});
