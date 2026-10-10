import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { endDay, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/** RE-ENTRY (2026-10-03): TRAIN shows the ease-back-in advice, and changes nothing by itself. */
const at = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TRAIN — progression re-entry (real browser)", () => {
  it("after 20 days away, suggests easing back in at ~90% with the reason, leaving the inputs alone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(9, 1, 7));
    const before = await startDay();
    const done = await startWorkout(before.id, "A", "STANDARD");
    for (let n = 1; n <= 3; n++) await logSet(before.id, done.id, "machine-chest-press", n, 100, 12);
    await completeWorkout(before.id, done.id, "STANDARD", "COMPLETED", 40);
    await endDay(before.id);

    vi.setSystemTime(at(9, 21, 7));
    const today = await startDay();
    await startWorkout(today.id, "A", "STANDARD");
    const screen = await render(<TrainScreen />);
    await screen.getByText("Progression and substitution", { exact: true }).click();

    await expect
      .element(screen.getByText("20 days since you last did this — suggests easing back in at 90lb (about 90% of 100lb).", { exact: true }))
      .toBeVisible();
    // Advice only: nothing is logged, and the weight input isn't changed to the suggestion.
    expect(screen.getByRole("spinbutton").elements().some((el) => (el as HTMLInputElement).value === "90")).toBe(false);
  });
});
