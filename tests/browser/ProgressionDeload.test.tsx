import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { endDay, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/** DELOAD (4.0-b slice 1): after a steady stall, TRAIN suggests one lighter session with the reason, and changes nothing. */
const at = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function session(day: number, weight: number, reps: number) {
  vi.setSystemTime(at(9, day, 7));
  const d = await startDay();
  const w = await startWorkout(d.id, "A", "STANDARD");
  for (let n = 1; n <= 3; n++) await logSet(d.id, w.id, "machine-chest-press", n, weight, reps);
  await completeWorkout(d.id, w.id, "STANDARD", "COMPLETED", 40);
  await endDay(d.id);
}

describe("TRAIN — deload after a stall (real browser)", () => {
  it("five sessions at 100lb with no new record suggest one lighter session at 90lb, leaving the inputs alone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const day of [1, 3, 5, 7, 9]) await session(day, 100, 10);

    vi.setSystemTime(at(9, 11, 7));
    const today = await startDay();
    await startWorkout(today.id, "A", "STANDARD");
    const screen = await render(<TrainScreen />);
    await screen.getByText("Progression and substitution", { exact: true }).click();

    await expect
      .element(screen.getByText("No new record in your last 4 sessions — suggests one lighter session at 90lb (about 90% of 100lb), then building back.", { exact: true }))
      .toBeVisible();
    expect(screen.getByRole("spinbutton").elements().some((el) => (el as HTMLInputElement).value === "90")).toBe(false);
  });

  it("a record in the last four sessions keeps the plain rule", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const [day, reps] of [[1, 10], [3, 10], [5, 11], [7, 10], [9, 10]] as const) await session(day, 100, reps);
    vi.setSystemTime(at(9, 11, 7));
    expect((await getProgressionSuggestion("A", "STANDARD", "machine-chest-press")).recommendation).toBe("HOLD");
  });
});
