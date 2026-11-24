import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { GymMode, type GymModeProps } from "../../src/ui/screens/train/GymMode";

/** #630 review: Gym mode keeps Delta (the pain stop included) in every state: set pending (after LOG / SKIP, before
 *  SET DETAILS), exercise done, and every set logged. Exactly one Delta block in each. */
afterEach(() => cleanup());
const noop = () => {};
const base: GymModeProps = {
  exercise: { exerciseId: "ex-1", name: "Curl", sets: 2, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
  exerciseIndex: 0, exerciseCount: 1, setNumber: 1, allComplete: false, setDetails: {}, onSetDetails: noop,
  weight: "20", reps: "10", ghost: undefined, exerciseUntouched: true, sessionExerciseIds: ["ex-1"], restLabel: null,
  notice: null, busy: false, onAdjustWeight: noop, onAdjustReps: noop, onSetWeight: noop, onSetReps: noop, onLog: noop,
  onSkip: noop, onExit: noop, onNextExercise: noop, onSaveCue: async () => {}, lastSet: undefined, onUndoLastSet: noop,
  delta: <button type="button">PAIN OR SOMETHING WRONG</button>,
};

for (const [name, patch] of [["set pending", {}], ["exercise done", { setNumber: null }], ["every set logged", { setNumber: null, allComplete: true }]] as const) {
  it(`shows Delta once when ${name}`, async () => {
    const screen = await render(<GymMode {...base} {...patch} />);
    await expect.element(screen.getByRole("button", { name: "PAIN OR SOMETHING WRONG" })).toBeVisible();
    expect(document.querySelectorAll(".gym-mode__delta")).toHaveLength(1);
  });
}
