import { describe, expect, it } from "vitest";
import { deriveSetProposal, reviewLines, type SetEvidence } from "../src/application/trainGuidance";

/** GRAYSON-TRAIN-GUIDED-001: quiet on a normal set; one owner-decided proposal only on clear evidence. */
const set = (over: Partial<SetEvidence> = {}): SetEvidence => ({
  exerciseName: "Bench", range: { low: 6, high: 8 }, incrementLbs: 5, weight: 135, reps: 7, warmup: false, bodyweightForm: false, nextSetNumber: 2, ...over,
});

describe("deriveSetProposal", () => {
  it("stays quiet on a set inside the range", () => {
    for (const reps of [5, 6, 7, 8, 9]) expect(deriveSetProposal(set({ reps }))).toBeNull();
  });
  it("proposes one load step up after clearing the top by 2, or the top with 3+ in reserve", () => {
    expect(deriveSetProposal(set({ reps: 10 }))).toMatchObject({ direction: "UP", nextSetNumber: 2, from: 135, to: 140, line: "10 reps cleared the top of 6–8. Set 2 at 140 lb?" });
    expect(deriveSetProposal(set({ reps: 8, repsInReserve: 3 }))).toMatchObject({ direction: "UP", to: 140 });
    expect(deriveSetProposal(set({ reps: 8, repsInReserve: 2 }))).toBeNull();
  });
  it("proposes one step down after falling 2+ short", () => {
    expect(deriveSetProposal(set({ reps: 4 }))).toMatchObject({ direction: "DOWN", to: 130, line: "4 reps is short of 6–8. Set 2 at 130 lb to stay in range?" });
  });
  it("never proposes on a warm-up, the last set, bodyweight HOME work, an unloaded set or a lift with no load step", () => {
    expect(deriveSetProposal(set({ reps: 12, warmup: true }))).toBeNull();
    expect(deriveSetProposal(set({ reps: 12, nextSetNumber: null }))).toBeNull();
    expect(deriveSetProposal(set({ reps: 12, bodyweightForm: true }))).toBeNull();
    expect(deriveSetProposal(set({ reps: 12, weight: 0 }))).toBeNull();
    expect(deriveSetProposal(set({ reps: 12, incrementLbs: 0 }))).toBeNull();
    expect(deriveSetProposal(set({ weight: 5, reps: 3 }))).toBeNull(); // never down to 0 lb (review on #627)
  });
  it("explains WHY with the evidence, the step and whose call it is", () => {
    const why = deriveSetProposal(set({ reps: 10, repsInReserve: 2 }))!.why.join(" ");
    expect(why).toContain("Set logged: 135 lb × 10 with 2 in reserve. The plan is 6–8 reps.");
    expect(why).toContain("5 lb is this exercise's load step.");
    expect(why).toContain("only if you use it");
  });
});

describe("reviewLines", () => {
  it("summarises proposals and stops plainly, with no diagnosis", () => {
    expect(reviewLines([
      { kind: "PROPOSAL", exerciseName: "Bench", line: "10 reps cleared the top of 6–8. Set 2 at 140 lb?", choice: "USED" },
      { kind: "STOPPED", exerciseName: "Row", skipped: 2 },
      { kind: "NOTED", exerciseName: "Squat" },
    ])).toEqual([
      "Bench: 10 reps cleared the top of 6–8. Set 2 at 140 lb. You used it.",
      "Row: stopped, 2 sets skipped. If pain was sharp or doesn't ease, get it checked before training it again.",
      "Squat: pain or a problem noted; its sets were left open. If pain was sharp or doesn't ease, get it checked before training it again.",
    ]);
  });
});
