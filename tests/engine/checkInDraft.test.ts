import { describe, expect, it } from "vitest";
import { CHECK_IN_DRAFT_MAX_AGE_HOURS, checkInDraftDecision, draftCheckIn } from "../../src/engine/checkInDraft";
import type { StateCheckIn } from "../../src/domain/common/types";
import type { DaySummary } from "../../src/engine/dayLedger";

/** Check-in draft (Drop 5): the operator's own last answers, carried forward — never guessed. */
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();

const last: StateCheckIn = {
  id: "c1",
  beyondDayId: "d1",
  recordedAt: at(12, 7, 8),
  energy: 3,
  stress: 2,
  mood: 4,
  soreness: 1,
  alcoholUrge: 0,
};

function summary(partial: Partial<DaySummary>): DaySummary {
  return {
    beyondDayId: "d1",
    startedAt: at(11, 16, 30),
    livedDayStart: at(11, 16, 30),
    work: { declared: "WORK", scheduled: "WORK" },
    sleep: {},
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
    ...partial,
  };
}

describe("draftCheckIn", () => {
  it("carries the last answers forward, with the facts logged since", () => {
    const summaries = [
      summary({
        sleep: { primaryMinutes: 435, primaryLogs: [{ at: at(12, 14, 20), minutes: 435 }] },
        workouts: [
          { sessionId: "w0", templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: at(12, 6, 0), prCount: 2, setsLogged: 9 },
          { sessionId: "w1", templateId: "B", sessionType: "STANDARD", status: "PARTIAL", startedAt: at(12, 15, 0), prCount: 1, setsLogged: 4 },
        ],
        urges: [{ at: at(12, 9, 0), trigger: "STRESS", phase: "EXPECTED_POST_WORK" }],
      }),
    ];
    const draft = draftCheckIn(last, summaries, new Date(2026, 9, 12, 17, 0), (id) => (id === "B" ? "Legs" : id));
    expect(draft?.value).toEqual({ energy: 3, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    expect(draft?.reason).toMatch(/^Your check-in Mon/);
    // The 06:00 workout came before the check-in, so it isn't "since then".
    expect(draft?.since).toEqual(["main sleep 7 hr 15 min", "lift Legs (partial), 1 PR", "1 urge"]);
    expect(draft?.basis).toContainEqual({ key: "lastCheckInId", value: "c1" });
  });

  it(`offers nothing without a check-in, or once the last one is over ${CHECK_IN_DRAFT_MAX_AGE_HOURS} h old`, () => {
    expect(draftCheckIn(undefined, [], new Date(2026, 9, 12, 17, 0))).toBeUndefined();
    expect(draftCheckIn(last, [], new Date(2026, 9, 13, 19, 8))).toBeDefined();
    expect(draftCheckIn(last, [], new Date(2026, 9, 13, 19, 9))).toBeUndefined();
  });

  it("names nothing since when nothing was logged", () => {
    expect(draftCheckIn(last, [], new Date(2026, 9, 12, 9, 0))?.since).toEqual([]);
  });
});

describe("checkInDraftDecision", () => {
  it("is CONFIRMED only when every value matches the draft", () => {
    const draft = { energy: 3, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
    expect(checkInDraftDecision(draft, { ...draft })).toBe("CONFIRMED");
    expect(checkInDraftDecision(draft, { ...draft, soreness: 3 })).toBe("ADJUSTED");
  });
});
