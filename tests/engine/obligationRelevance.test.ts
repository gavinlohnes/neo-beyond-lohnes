import { describe, expect, it } from "vitest";
import {
  classifyObligation,
  getMostRelevantUnresolvedObligation,
  hasObligationRequiringAttention,
  isAttentionWorthyTier,
} from "../../src/engine/obligationRelevance";
import type { Obligation } from "../../src/domain/intent/types";

/**
 * Intent & Commitment Spine — Drop 02 (temporal corrections binding,
 * 2026-08-22). Pure unit tests for the deterministic interpretation
 * layer — no Dexie, no fake-indexeddb, matching every other engine/*
 * test file's zero-I/O contract.
 */

let idCounter = 0;
function obligation(overrides: Partial<Obligation> = {}): Obligation {
  idCounter += 1;
  return {
    id: `ob-${idCounter}`,
    title: `Obligation ${idCounter}`,
    status: "OPEN",
    source: "USER",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const TODAY = "2026-08-20";
const YESTERDAY = "2026-08-19";
const TOMORROW = "2026-08-21";
const DAY_AFTER_TOMORROW = "2026-08-22";
const BEYOND_WINDOW = "2026-08-23"; // 3 days out — outside the 2-day DUE_SOON window

describe("classifyObligation — Drop 02 locked temporal rule", () => {
  it("dueAt in the past -> OVERDUE", () => {
    expect(classifyObligation(obligation({ dueAt: YESTERDAY }), TODAY)).toBe("OVERDUE");
  });

  it("dueAt === today -> DUE_TODAY, never OVERDUE (date-only precision)", () => {
    expect(classifyObligation(obligation({ dueAt: TODAY }), TODAY)).toBe("DUE_TODAY");
  });

  it("dueAt tomorrow -> DUE_SOON", () => {
    expect(classifyObligation(obligation({ dueAt: TOMORROW }), TODAY)).toBe("DUE_SOON");
  });

  it("dueAt day-after-tomorrow -> DUE_SOON (2-day window is inclusive of both days)", () => {
    expect(classifyObligation(obligation({ dueAt: DAY_AFTER_TOMORROW }), TODAY)).toBe("DUE_SOON");
  });

  it("dueAt beyond the window -> QUIET, unless plannedAt creates relevance", () => {
    expect(classifyObligation(obligation({ dueAt: BEYOND_WINDOW }), TODAY)).toBe("QUIET");
    expect(classifyObligation(obligation({ dueAt: BEYOND_WINDOW, plannedAt: TODAY }), TODAY)).toBe("PLANNED_TODAY");
  });

  it("no dueAt, plannedAt === today -> PLANNED_TODAY", () => {
    expect(classifyObligation(obligation({ plannedAt: TODAY }), TODAY)).toBe("PLANNED_TODAY");
  });

  it("plannedAt === today does NOT override a stronger due classification", () => {
    expect(classifyObligation(obligation({ dueAt: YESTERDAY, plannedAt: TODAY }), TODAY)).toBe("OVERDUE");
    expect(classifyObligation(obligation({ dueAt: TODAY, plannedAt: TODAY }), TODAY)).toBe("DUE_TODAY");
    expect(classifyObligation(obligation({ dueAt: TOMORROW, plannedAt: TODAY }), TODAY)).toBe("DUE_SOON");
  });

  it("no dueAt, no plannedAt -> QUIET (may simply exist quietly)", () => {
    expect(classifyObligation(obligation({}), TODAY)).toBe("QUIET");
  });

  it("WAITING wins unconditionally, even with a past dueAt (narrow, intentional for Drop 02)", () => {
    expect(classifyObligation(obligation({ status: "WAITING", dueAt: YESTERDAY }), TODAY)).toBe("WAITING");
    expect(classifyObligation(obligation({ status: "WAITING", plannedAt: TODAY }), TODAY)).toBe("WAITING");
    expect(classifyObligation(obligation({ status: "WAITING" }), TODAY)).toBe("WAITING");
  });

  describe("calendar-boundary correctness (month/year transitions)", () => {
    it("year boundary: due Jan 1 is DUE_SOON from Dec 30, OVERDUE is never mis-signed", () => {
      expect(classifyObligation(obligation({ dueAt: "2027-01-01" }), "2026-12-30")).toBe("DUE_SOON");
      expect(classifyObligation(obligation({ dueAt: "2026-12-30" }), "2027-01-01")).toBe("OVERDUE");
    });

    it("month boundary: Jan 31 -> Feb 1 is exactly DUE_TODAY at the boundary, DUE_SOON the day before", () => {
      expect(classifyObligation(obligation({ dueAt: "2027-02-01" }), "2027-01-31")).toBe("DUE_SOON");
      expect(classifyObligation(obligation({ dueAt: "2027-02-01" }), "2027-02-01")).toBe("DUE_TODAY");
    });

    it("leap-year boundary: Feb 29 2028 -> Mar 1 2028 is a real one-day gap, not miscounted", () => {
      expect(classifyObligation(obligation({ dueAt: "2028-03-01" }), "2028-02-28")).toBe("DUE_SOON"); // 2 days out
      expect(classifyObligation(obligation({ dueAt: "2028-03-01" }), "2028-02-29")).toBe("DUE_SOON"); // 1 day out, not miscounted as same-day
      expect(classifyObligation(obligation({ dueAt: "2028-02-29" }), "2028-03-01")).toBe("OVERDUE");
    });

    it("non-leap year: Feb 28 2026 -> Mar 1 2026 is a real two-day gap (DUE_SOON), not Feb 29", () => {
      expect(classifyObligation(obligation({ dueAt: "2026-03-01" }), "2026-02-27")).toBe("DUE_SOON");
      expect(classifyObligation(obligation({ dueAt: "2026-03-01" }), "2026-02-28")).toBe("DUE_SOON");
      expect(classifyObligation(obligation({ dueAt: "2026-03-01" }), "2026-03-01")).toBe("DUE_TODAY");
    });
  });
});

describe("SATISFIED/RELEASED obligations", () => {
  it("this module makes no special case for them — callers are expected to only ever pass getUnresolvedObligations()'s result", () => {
    // Documented boundary, not a runtime guard: classifyObligation has no
    // concept of "resolved" at all. TodayScreen must only ever feed this
    // unresolved (OPEN/WAITING) obligations — proven at the integration
    // level in tests/browser/TodayScreen.test.tsx, not here.
    expect(classifyObligation(obligation({ status: "SATISFIED", dueAt: YESTERDAY }), TODAY)).toBe("OVERDUE");
  });
});

describe("getMostRelevantUnresolvedObligation", () => {
  it("returns null for an empty list", () => {
    expect(getMostRelevantUnresolvedObligation([], TODAY)).toBeNull();
  });

  it("ranks OVERDUE > DUE_TODAY > DUE_SOON > PLANNED_TODAY > WAITING > QUIET", () => {
    const quiet = obligation({ title: "quiet" });
    const waiting = obligation({ title: "waiting", status: "WAITING" });
    const plannedToday = obligation({ title: "planned", plannedAt: TODAY });
    const dueSoon = obligation({ title: "due soon", dueAt: TOMORROW });
    const dueToday = obligation({ title: "due today", dueAt: TODAY });
    const overdue = obligation({ title: "overdue", dueAt: YESTERDAY });

    const result = getMostRelevantUnresolvedObligation(
      [quiet, waiting, plannedToday, dueSoon, dueToday, overdue],
      TODAY,
    );
    expect(result!.obligation.title).toBe("overdue");
    expect(result!.tier).toBe("OVERDUE");
  });

  it("within the same tier, breaks ties by soonest dueAt first", () => {
    const dueTomorrow = obligation({ title: "later", dueAt: TOMORROW });
    const dueDayAfter = obligation({ title: "even later", dueAt: DAY_AFTER_TOMORROW });
    const result = getMostRelevantUnresolvedObligation([dueDayAfter, dueTomorrow], TODAY);
    expect(result!.obligation.title).toBe("later");
  });

  it("falls back to creation order (byTimeThenSeq) when no dueAt distinguishes two same-tier obligations", () => {
    const first = obligation({ title: "first", createdAt: "2026-08-01T00:00:00.000Z" });
    const second = obligation({ title: "second", createdAt: "2026-08-02T00:00:00.000Z" });
    const result = getMostRelevantUnresolvedObligation([second, first], TODAY);
    expect(result!.obligation.title).toBe("first");
  });
});

describe("hasObligationRequiringAttention", () => {
  it("true for OVERDUE, DUE_TODAY, DUE_SOON, and PLANNED_TODAY", () => {
    expect(hasObligationRequiringAttention([obligation({ dueAt: YESTERDAY })], TODAY)).toBe(true);
    expect(hasObligationRequiringAttention([obligation({ dueAt: TODAY })], TODAY)).toBe(true);
    expect(hasObligationRequiringAttention([obligation({ dueAt: TOMORROW })], TODAY)).toBe(true);
    expect(hasObligationRequiringAttention([obligation({ plannedAt: TODAY })], TODAY)).toBe(true);
  });

  it("false for WAITING and QUIET — including a WAITING obligation past its dueAt", () => {
    expect(hasObligationRequiringAttention([obligation({ status: "WAITING", dueAt: YESTERDAY })], TODAY)).toBe(false);
    expect(hasObligationRequiringAttention([obligation({})], TODAY)).toBe(false);
  });

  it("false for an empty list", () => {
    expect(hasObligationRequiringAttention([], TODAY)).toBe(false);
  });
});

describe("isAttentionWorthyTier", () => {
  it("true for OVERDUE, DUE_TODAY, DUE_SOON, PLANNED_TODAY; false for WAITING, QUIET", () => {
    expect(isAttentionWorthyTier("OVERDUE")).toBe(true);
    expect(isAttentionWorthyTier("DUE_TODAY")).toBe(true);
    expect(isAttentionWorthyTier("DUE_SOON")).toBe(true);
    expect(isAttentionWorthyTier("PLANNED_TODAY")).toBe(true);
    expect(isAttentionWorthyTier("WAITING")).toBe(false);
    expect(isAttentionWorthyTier("QUIET")).toBe(false);
  });
});
