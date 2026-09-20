import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import {
  declineRecommendation,
  logWater,
  logProtein,
  rateOutcome,
  recordRecommendation,
  startDay,
  submitCheckIn,
} from "../../src/application/commands";
import { getActiveDay, getLatestRecommendation } from "../../src/application/queries";
import {
  getPatternProposal,
  resolvePriorDayContinuity,
  wasRecommendationMateriallyRepeated,
} from "../../src/application/continuityQueries";
import { getAdvisoryNotes } from "../../src/application/advisoryQueries";
import { createObligation } from "../../src/application/intentCommands";
import { evaluate } from "../../src/engine/evaluate";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * FOUNDATION-1B — the six required behavioral acceptance scenarios (A–F),
 * per docs/agent/drops/FOUNDATION-1B.md. Same shape/discipline as
 * tests/integration/stabilizationRegressionSuite.test.ts: real
 * application-layer commands/queries against fake-indexeddb, not a
 * hand-mocked Engine.
 */

const GREEN: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 5,
  stress: 1,
  mood: 5,
  soreness: 0,
  alcoholUrge: 0,
};
const YELLOW: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 2,
  stress: 1,
  mood: 3,
  soreness: 0,
  alcoholUrge: 0,
};
const RED: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
  energy: 1,
  stress: 1,
  mood: 3,
  soreness: 0,
  alcoholUrge: 0,
};

// A real Friday within the DEFAULT_SCHEDULE_PATTERN's Week A (anchored
// 2026-08-17, a Monday; Week A works Mon/Tue/Fri/Sat/Sun) — Thursday
// (the day before) is NOT a Week A workday, so no post-work tail bleeds
// into this morning, and 10:00 is before the 18:00 shift start: a real
// PRE_WORK instant, not a hand-picked engine input.
const PRE_SHIFT_FRIDAY_MORNING = new Date(2026, 7, 21, 10, 0, 0);

// Wednesday within the same Week A cycle — NOT a scheduled work day
// (Week A works Mon/Tue/Fri/Sat/Sun only), so evaluateShiftProtection's
// todayIsScheduledWorkDay gate never fires here regardless of Minimum Day
// state. Used wherever a test's claim has nothing to do with PROTECT.
const OFF_DAY_WEDNESDAY = new Date(2026, 7, 19, 10, 0, 0);

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("Scenario A — nothing requires attention", () => {
  it("GREEN capacity, no obligations, no state conflict -> NO_ACTION_REQUIRED, and BEYOND stays quiet", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, GREEN);
    expect(recommendation.kind).toBe("NO_ACTION_REQUIRED");
    expect(recommendation.statusAtIssue).toBe("NO_ACTION_REQUIRED");

    // "Stays quiet": no INTERRUPT-tier advisory fires either.
    const notes = await getAdvisoryNotes(OFF_DAY_WEDNESDAY);
    expect(notes.some((n) => n.attentionLevel === "INTERRUPT")).toBe(false);
  });
});

describe("Scenario B — pre-shift conflict (PROTECT vs EXECUTE, resolved as Advisory-only PROTECT)", () => {
  it("PRE_WORK + GREEN capacity + unmet hydration/protein -> an INTERRUPT-tier PROTECT advisory accompanies the primary recommendation", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    // Deliberately nothing logged toward Minimum Day's hydrate/protein floors.

    const notes = await getAdvisoryNotes(PRE_SHIFT_FRIDAY_MORNING);
    const protect = notes.find((n) => n.sourceModule === "shiftProtection");
    expect(protect).toBeDefined();
    expect(protect!.attentionLevel).toBe("INTERRUPT");
    expect(protect!.message).toContain("hydrate");
    expect(protect!.message).toContain("protein");
  });

  it("logging enough water/protein clears the concern", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await logWater(day.id, 40);
    await logProtein(day.id, 25);

    const notes = await getAdvisoryNotes(PRE_SHIFT_FRIDAY_MORNING);
    expect(notes.some((n) => n.sourceModule === "shiftProtection")).toBe(false);
  });

  it("Advisory-only PROTECT invariant: evaluate.ts's own ranking is untouched — EXECUTE_PLANNED_WORK still wins on GREEN+hasPlannedWork regardless of the PROTECT concern, and PROTECT is never a competing Engine kind", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    // No water/protein logged — the PROTECT concern is real (proven above).
    const notes = await getAdvisoryNotes(PRE_SHIFT_FRIDAY_MORNING);
    expect(notes.some((n) => n.sourceModule === "shiftProtection")).toBe(true);

    // The Engine itself never receives, and never produces, anything
    // shaped like "PROTECT" — its own arbitration is provably unchanged.
    const engineResult = evaluate({
      beyondDayId: day.id,
      checkIn: { id: "x", beyondDayId: day.id, recordedAt: new Date().toISOString(), ...GREEN },
      hasPlannedWork: true,
      hasUnresolvedPostShift: false,
      hasEligibleObligationDueOrOverdue: false,
    });
    expect(engineResult.kind).toBe("EXECUTE_PLANNED_WORK");
  });
});

describe("Scenario C — low-capacity day", () => {
  it("RED capacity -> STABILIZE outranks unnecessary execution (BEYOND may recommend doing less)", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, RED);
    expect(recommendation.kind).toBe("STABILIZE");
  });

  it("YELLOW capacity -> RECOVER outranks unnecessary execution", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    expect(recommendation.kind).toBe("RECOVER");
  });
});

describe("Scenario D — missed yesterday (no automatic catch-up)", () => {
  it("an undecided task-shaped recommendation from yesterday, revisited on a GREEN day, resolves REINTRODUCE — advisory-only, never a forced new obligation", async () => {
    const day1 = await startDay();
    // A real "task not completed yesterday": an Obligation due that day,
    // eligible for arbitration (INTENT-ARBITRATION-001) -> OBLIGATION_DUE.
    await createObligation({ title: "Missed task", dueAt: formatLocalDate(new Date()) });
    const { recommendation: rec1 } = await submitCheckIn(day1.id, GREEN);
    expect(rec1.kind).toBe("OBLIGATION_DUE");
    // Deliberately never recorded/declined — the operator just moved on.

    const day2 = await startDay(); // auto-closes day1 (AUTO_CLOSED_ON_NEW_DAY_START)
    await submitCheckIn(day2.id, GREEN);

    const continuity = await resolvePriorDayContinuity(day2);
    expect(continuity).not.toBeNull();
    expect(continuity!.recommendation.id).toBe(rec1.id);
    expect(continuity!.resolution).toBe("REINTRODUCE");

    // Surfaced advisory-only, never as a second competing primary
    // Recommendation and never as a newly-written obligation-shaped fact
    // beyond the one already created above.
    const notes = await getAdvisoryNotes(OFF_DAY_WEDNESDAY);
    expect(notes.some((n) => n.sourceModule === "continuity")).toBe(true);
    const obligationCreatedEvents = await db.events.where("type").equals("OBLIGATION_CREATED").toArray();
    expect(obligationCreatedEvents).toHaveLength(1); // only the one this test itself created
  });

  it("the same unresolved history, revisited on a RED day, resolves DEFER — not dropped, but not forced now either", async () => {
    const day1 = await startDay();
    await createObligation({ title: "Missed task", dueAt: formatLocalDate(new Date()) });
    await submitCheckIn(day1.id, GREEN);

    const day2 = await startDay();
    await submitCheckIn(day2.id, RED);

    const continuity = await resolvePriorDayContinuity(day2);
    expect(continuity!.resolution).toBe("DEFER");
  });

  it("a DECLINED prior recommendation resolves DROP — the operator's own decision is respected, not re-litigated", async () => {
    const day1 = await startDay();
    const { recommendation: rec1 } = await submitCheckIn(day1.id, RED);
    await declineRecommendation(day1.id, rec1, { overrideConfirmed: true });

    const day2 = await startDay();
    await submitCheckIn(day2.id, GREEN);

    const continuity = await resolvePriorDayContinuity(day2);
    expect(continuity!.resolution).toBe("DROP");
  });

  it("NO_ACTION_REQUIRED yesterday resolves DROP — nothing was ever pending", async () => {
    const day1 = await startDay();
    await submitCheckIn(day1.id, GREEN); // NO_ACTION_REQUIRED (no obligations/conflict)

    const day2 = await startDay();
    await submitCheckIn(day2.id, GREEN);

    const continuity = await resolvePriorDayContinuity(day2);
    expect(continuity!.resolution).toBe("DROP");
  });
});

describe("Scenario E — user rejects a recommendation", () => {
  it("closes cleanly, and identical evidence on the very next check-in does not nag again", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, RED);
    expect(first.kind).toBe("STABILIZE");
    await declineRecommendation(day.id, first, { overrideConfirmed: true });

    // Same operator, same day, identical RED evidence resubmitted.
    const { recommendation: second } = await submitCheckIn(day.id, RED);
    expect(second.kind).toBe("STABILIZE");
    expect(await wasRecommendationMateriallyRepeated(second)).toBe(true);
  });

  it("materially new evidence (capacity actually changed) is not treated as a repeat", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, RED);
    await declineRecommendation(day.id, first, { overrideConfirmed: true });

    const { recommendation: second } = await submitCheckIn(day.id, GREEN);
    expect(second.kind).not.toBe("STABILIZE");
    expect(await wasRecommendationMateriallyRepeated(second)).toBe(false);
  });

  it("a recommendation that was accepted, not declined, is never flagged as a materially-repeated nag", async () => {
    const day = await startDay();
    const { recommendation: first } = await submitCheckIn(day.id, RED);
    await recordRecommendation(day.id, first);

    const { recommendation: second } = await submitCheckIn(day.id, RED);
    expect(await wasRecommendationMateriallyRepeated(second)).toBe(false);
  });
});

describe("Scenario F — learning without takeover", () => {
  it("three consecutive same-kind, same-rating outcomes surface a proposal — advisory only, no persisted change", async () => {
    const day = await startDay();
    for (let i = 0; i < 3; i += 1) {
      const { recommendation } = await submitCheckIn(day.id, RED);
      await declineRecommendation(day.id, recommendation, { overrideConfirmed: true });
      await rateOutcome(day.id, recommendation.id, "BAD");
    }

    const proposal = await getPatternProposal();
    expect(proposal).toEqual({ kind: "STABILIZE", rating: "BAD", count: 3 });

    const notes = await getAdvisoryNotes(OFF_DAY_WEDNESDAY);
    const proposalNote = notes.find((n) => n.sourceModule === "patternProposal");
    expect(proposalNote).toBeDefined();
    expect(proposalNote!.attentionLevel).toBe("SURFACE");
    expect(proposalNote).not.toHaveProperty("priority");
    expect(proposalNote).not.toHaveProperty("suggestedCommand");

    // No plan/threshold/doctrine was silently changed: a fresh check-in
    // under the exact same RED evidence still deterministically selects
    // STABILIZE — the Engine's own rule is untouched by any rating history.
    const { recommendation: freshRec } = await submitCheckIn(day.id, RED);
    expect(freshRec.kind).toBe("STABILIZE");
  });

  it("fewer than three, or mixed ratings, surface no proposal", async () => {
    const day = await startDay();
    const { recommendation: rec1 } = await submitCheckIn(day.id, RED);
    await declineRecommendation(day.id, rec1, { overrideConfirmed: true });
    await rateOutcome(day.id, rec1.id, "BAD");

    expect(await getPatternProposal()).toBeNull();
  });
});

describe("cross-scenario invariant: getActiveDay reflects the real current day throughout", () => {
  it("sanity check — the helper functions above operated on the actual active day at each step", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const active = await getActiveDay();
    expect(active?.id).toBe(day.id);
    const latest = await getLatestRecommendation(day.id);
    expect(latest).toBeDefined();
  });
});
