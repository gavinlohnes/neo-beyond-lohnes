import { describe, expect, it } from "vitest";
import { deriveCapacity } from "../../src/engine/capacity";
import {
  isSeriouslyConstrained,
  MINIMUM_DAY_ENABLE_BODY,
  MINIMUM_DAY_ITEMS,
  MINIMUM_DAY_PROMINENT_BODY,
  MINIMUM_DAY_PROMINENT_TITLE,
  describeMinimumDaySummary,
} from "../../src/ui/screens/today/minimumDayCopy";
import type { StateCheckIn } from "../../src/domain/common/types";

function checkIn(overrides: Partial<Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">>): StateCheckIn {
  return {
    id: "t",
    beyondDayId: "d",
    recordedAt: new Date().toISOString(),
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 1,
    alcoholUrge: 0,
    ...overrides,
  };
}

describe("isSeriouslyConstrained — RED or multi-factor YELLOW, matching the real capacity rule", () => {
  it("RED always qualifies, even with a single driving reason", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ stress: 5 }));
    expect(reasonCodes.length).toBe(1);
    expect(isSeriouslyConstrained(capacity, reasonCodes.length)).toBe(true);
  });

  it("a single-factor YELLOW does not qualify", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ soreness: 4 }));
    expect(capacity).toBe("YELLOW");
    expect(reasonCodes.length).toBe(1);
    expect(isSeriouslyConstrained(capacity, reasonCodes.length)).toBe(false);
  });

  it("a multi-factor YELLOW qualifies", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ stress: 4, soreness: 4 }));
    expect(capacity).toBe("YELLOW");
    expect(reasonCodes.length).toBe(2);
    expect(isSeriouslyConstrained(capacity, reasonCodes.length)).toBe(true);
  });

  it("GREEN never qualifies", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({}));
    expect(isSeriouslyConstrained(capacity, reasonCodes.length)).toBe(false);
  });
});

/**
 * Item 5's audit: no sentence Minimum Day shows should read as shame,
 * failure, or pressure. Checked as a real assertion against every static
 * string this module exports (the prominent offer, the normal enable
 * prompt, and all six item labels/update-notes) rather than only by eye.
 */
const BANNED_SUBSTRINGS = [
  "fail",
  "should",
  "must",
  "missed",
  "didn't",
  "don't forget",
  "incomplete",
  "behind",
  "again",
  "yesterday",
  "not enough",
  "let yourself down",
  "struggl",
  "bad day",
  "guilt",
  "shame",
  "sorry",
  "unfortunately",
  "why haven't",
  "still haven't",
];

function allMinimumDayStrings(): string[] {
  return [
    MINIMUM_DAY_ENABLE_BODY,
    MINIMUM_DAY_PROMINENT_TITLE,
    MINIMUM_DAY_PROMINENT_BODY,
    ...MINIMUM_DAY_ITEMS.flatMap((item) => [item.label, item.updateNote]),
  ];
}

describe("tone audit — no shame, failure, or pressure language anywhere in Minimum Day copy", () => {
  it("contains none of the banned words/phrases, case-insensitively", () => {
    for (const text of allMinimumDayStrings()) {
      const lower = text.toLowerCase();
      for (const banned of BANNED_SUBSTRINGS) {
        expect(lower, `"${text}" should not contain "${banned}"`).not.toContain(banned);
      }
    }
  });

  it("always frames turning Minimum Day on as the user's choice, not an obligation", () => {
    expect(MINIMUM_DAY_PROMINENT_BODY).toContain("up to you");
  });

  /**
   * Simulate seven consecutive constrained days and review the language
   * across the whole stretch, not just one day in isolation (explicit
   * instruction). Minimum Day has no cross-day memory — MinimumDayStatus
   * resets fully with each new BeyondDay (application/queries.ts has no
   * streak/history read) — so this asserts the copy is genuinely static
   * and day-count-independent: the exact same offer text renders on day 1
   * and day 7 of a bad stretch, with nothing that could accumulate into a
   * nagging or guilt-inducing tone over repeated exposure (no "again",
   * "still", "in a row", day-counting, or references to prior days).
   */
  it("renders identical, day-count-independent copy across seven simulated consecutive RED days", () => {
    const seenTitles = new Set<string>();
    const seenBodies = new Set<string>();
    for (let day = 1; day <= 7; day++) {
      const { capacity, reasonCodes } = deriveCapacity(checkIn({ stress: 5 }));
      expect(isSeriouslyConstrained(capacity, reasonCodes.length)).toBe(true);
      seenTitles.add(MINIMUM_DAY_PROMINENT_TITLE);
      seenBodies.add(MINIMUM_DAY_PROMINENT_BODY);
    }
    expect(seenTitles.size).toBe(1);
    expect(seenBodies.size).toBe(1);
    for (const text of [MINIMUM_DAY_PROMINENT_TITLE, MINIMUM_DAY_PROMINENT_BODY]) {
      expect(text.toLowerCase()).not.toMatch(/\bagain\b|\bstill\b|in a row|day \d|streak/);
    }
  });
});

describe("MINIMUM_DAY_ITEMS — auto vs manual is explained per item, matching getMinimumDayStatus's real derivation", () => {
  it("describes persisted completion as belonging to the active BeyondDay, not the calendar date", () => {
    expect(
      describeMinimumDaySummary({
        enabled: true,
        hydrate: true,
        protein: true,
        meds: true,
        hygiene: true,
        move: false,
        recoverConnect: false,
      }),
    ).toBe("This active BeyondDay · 4 / 6");
  });

  it("hydrate and protein note they can be logged directly, not just described as automatic", () => {
    const hydrate = MINIMUM_DAY_ITEMS.find((i) => i.key === "hydrate")!;
    const protein = MINIMUM_DAY_ITEMS.find((i) => i.key === "protein")!;
    expect(hydrate.updateNote).toContain("automatically");
    expect(hydrate.updateNote).toContain("log it right here");
    expect(protein.updateNote).toContain("automatically");
    expect(protein.updateNote).toContain("log it right here");
  });

  it("meds and hygiene are explained as always manual, never auto-detected", () => {
    const meds = MINIMUM_DAY_ITEMS.find((i) => i.key === "meds")!;
    const hygiene = MINIMUM_DAY_ITEMS.find((i) => i.key === "hygiene")!;
    expect(meds.updateNote).toContain("No auto-detection");
    expect(hygiene.updateNote).toContain("No auto-detection");
  });

  it("move and recoverConnect are explained as mixed: automatic from TRAIN, or a manual tap", () => {
    const move = MINIMUM_DAY_ITEMS.find((i) => i.key === "move")!;
    const recoverConnect = MINIMUM_DAY_ITEMS.find((i) => i.key === "recoverConnect")!;
    expect(move.updateNote).toContain("automatically");
    expect(move.updateNote).toContain("tap");
    expect(recoverConnect.updateNote).toContain("automatically");
    expect(recoverConnect.updateNote).toContain("Either counts");
  });

  it("covers exactly the six locked items, no more, no fewer", () => {
    expect(MINIMUM_DAY_ITEMS.map((i) => i.key).sort()).toEqual(
      ["hydrate", "protein", "meds", "hygiene", "move", "recoverConnect"].sort(),
    );
  });
});
