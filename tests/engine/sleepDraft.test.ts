import { describe, expect, it } from "vitest";
import { deriveSleepDraft, SLEEP_DRAFT_MAX_MINUTES, SLEEP_DRAFT_MIN_MINUTES, type SleepDraftInput } from "../../src/engine/sleepDraft";

/** Sleep draft (2026-10-03): an upper bound from Shift Down → next app open. */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

function input(partial: Partial<SleepDraftInput> = {}): SleepDraftInput {
  return {
    anchorAt: at(13, 7, 5).toISOString(),
    anchorKind: "SHIFT_DOWN",
    lastOperatorActionAt: at(13, 7, 5).toISOString(),
    openedAt: at(13, 14, 22),
    mainSleepLogged: false,
    ...partial,
  };
}

describe("deriveSleepDraft", () => {
  it("proposes the gap, rounded down to 5 minutes, with its reason and basis", () => {
    // 07:05 → 14:22 is 7h 17m, which rounds down to 7h 15m.
    expect(deriveSleepDraft(input())).toEqual({
      value: 435,
      reason: "Shift Down 07:05 → opened 14:22",
      basis: [
        { key: "from", value: at(13, 7, 5).toISOString() },
        { key: "shiftOverAt", value: at(13, 7, 5).toISOString() },
        { key: "openedAt", value: at(13, 14, 22).toISOString() },
        { key: "upperBoundMinutes", value: 435 },
      ],
    });
  });

  it("names MARK WORK ENDED when that's the starting point", () => {
    expect(deriveSleepDraft(input({ anchorKind: "WORK_ENDED" }))?.reason).toBe("Work ended 07:05 → opened 14:22");
  });

  it("stays quiet rather than guess", () => {
    expect(deriveSleepDraft(input({ anchorAt: null, anchorKind: null }))).toBeNull();
    expect(deriveSleepDraft(input({ mainSleepLogged: true }))).toBeNull();
  });

  it("Drop 1.6b: counts from the last thing logged after the shift — a post-shift workout or urge no longer hides it", () => {
    // Shift Down 07:05, a workout finished 08:15, opened 14:20 → up to 6 h 5 min, said as "Last logged".
    const draft = deriveSleepDraft(input({ lastOperatorActionAt: at(13, 8, 15).toISOString(), openedAt: at(13, 14, 20) }));
    expect(draft?.value).toBe(365);
    expect(draft?.reason).toBe("Last logged 08:15 → opened 14:20");
    expect(draft?.basis).toContainEqual({ key: "from", value: at(13, 8, 15).toISOString() });
    expect(draft?.basis).toContainEqual({ key: "shiftOverAt", value: at(13, 7, 5).toISOString() });
    // Logged something too close to opening: under 3 h, quiet.
    expect(deriveSleepDraft(input({ lastOperatorActionAt: at(13, 12, 0).toISOString(), openedAt: at(13, 14, 20) }))).toBeNull();
  });

  it(`only proposes gaps from ${SLEEP_DRAFT_MIN_MINUTES / 60}h to ${SLEEP_DRAFT_MAX_MINUTES / 60}h`, () => {
    expect(deriveSleepDraft(input({ openedAt: at(13, 10, 4) }))).toBeNull(); // 2h 59m
    expect(deriveSleepDraft(input({ openedAt: at(13, 10, 5) }))?.value).toBe(180);
    expect(deriveSleepDraft(input({ openedAt: at(13, 19, 5) }))?.value).toBe(720);
    expect(deriveSleepDraft(input({ openedAt: at(13, 19, 6) }))).toBeNull(); // 12h 1m
  });
});
