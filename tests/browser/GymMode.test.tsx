import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getActiveWorkoutSession, getPerformedSets } from "../../src/application/trainQueries";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { createCustomTemplate } from "../../src/application/customTemplateCommands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * GYM-001: the gym screen over an active TRAIN workout. Same logSet path,
 * nothing lost on EXIT, the screen kept awake while open, plate math and the
 * warm-up ramp for barbell lifts only.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const nav = navigator as Navigator & { wakeLock?: unknown };
const realWakeLock = nav.wakeLock;

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "wakeLock", { value: realWakeLock, configurable: true });
});

function stubWakeLock() {
  const release = vi.fn(async () => {});
  const request = vi.fn(async () => ({ release }));
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  return { request, release };
}

/** A barbell squat done once at 185 × 5, then a fresh session with it open. */
async function barbellSessionWithHistory() {
  const squat = await createCustomExercise({ name: "Back Squat", muscleGroup: "Legs", equipment: "Barbell", repRangeLow: 3, repRangeHigh: 6 });
  const template = await createCustomTemplate({
    name: "Legs",
    exercises: [{ exerciseId: squat.id, name: "Back Squat", sets: 2, repRangeLow: 3, repRangeHigh: 6, incrementLbs: 5 }],
  });
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  const past = await startWorkout(day.id, template.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, past.id, squat.id, 1, 185, 5);
  await completeWorkout(day.id, past.id, "STANDARD", "COMPLETED");
  const session = await startWorkout(day.id, template.id, "STANDARD", { overrideConfirmed: true });
  return { session };
}

describe("GYM-001 — gym screen", () => {
  it("shows the lift big, with the ghost set, plates and warm-up; LOG uses TRAIN's own path and advances", async () => {
    const { request, release } = stubWakeLock();
    const { session } = await barbellSessionWithHistory();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "GYM MODE" }).click();

    const dialog = screen.getByRole("dialog", { name: "Gym mode" });
    await expect.element(dialog).toBeVisible();
    await expect.element(screen.getByText("Last time 185 × 5")).toBeVisible();
    await expect.element(screen.getByText("Warm-up: 45 ×10 · 95 ×5 · 130 ×3 · 155 ×1")).toBeVisible();
    await expect.element(screen.getByText("185 lb = bar + 45 + 25 per side")).toBeVisible();
    expect(request).toHaveBeenCalledWith("screen");

    await screen.getByRole("button", { name: "Weight up" }).click();
    await expect.element(screen.getByText("190 lb = bar + 45 + 25 + 2.5 per side")).toBeVisible();
    await screen.getByRole("button", { name: "LOG SET 1" }).click();

    await expect.element(dialog.getByRole("button", { name: "LOG SET 2" })).toBeVisible();
    await expect.element(dialog.getByText(/Set 2 of 2/)).toBeVisible();
    expect(screen.getByText(/^Warm-up:/).elements()).toHaveLength(0);
    const logged = await getPerformedSets(session.id);
    expect(logged.map((s) => [s.setNumber, s.weight, s.reps])).toEqual([[1, 190, 5]]);

    await screen.getByRole("button", { name: "EXIT" }).click();
    await expect.poll(() => document.querySelector(".gym-mode")).toBeNull();
    expect(release).toHaveBeenCalled();
    // Nothing lost: TRAIN shows the same session on the next set.
    await expect.element(screen.getByText(/Set 2 of 2/)).toBeVisible();
    expect(screen.getByText(/Set 2 of 2/).elements()).toHaveLength(1);
  });

  it("machine lifts get no plate math or warm-up; big targets, no overflow, AA contrast", async () => {
    stubWakeLock();
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    const dialog = screen.getByRole("dialog", { name: "Gym mode" });
    await expect.element(dialog).toBeVisible();
    await expect.element(dialog.getByRole("button", { name: "LOG SET 1" })).toBeVisible();
    expect(document.querySelectorAll(".gym-mode__hint")).toHaveLength(0);

    for (const name of ["LOG SET 1", "SKIP", "Weight up", "Weight down", "Reps up", "Reps down"]) {
      expect(dialog.getByRole("button", { name, exact: true }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(56);
    }
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    for (const animation of document.getAnimations()) animation.finish();
    const results = await axe.run(document.querySelector(".gym-mode")!, { runOnly: { type: "rule", values: ["color-contrast"] } });
    expect(results.violations).toEqual([]);

    // A first-ever lift starts empty: type the numbers instead of tapping + fifteen times.
    await dialog.getByRole("spinbutton", { name: "Weight" }).fill("150");
    await dialog.getByRole("spinbutton", { name: "Reps" }).fill("10");
    await dialog.getByRole("button", { name: "LOG SET 1" }).click();
    await expect.element(dialog.getByRole("button", { name: "LOG SET 2" })).toBeVisible();
    const active = await getActiveWorkoutSession();
    expect((await getPerformedSets(active!.id)).map((s) => [s.weight, s.reps])).toEqual([[150, 10]]);
  });

  it("works without a wake lock (unsupported browsers)", async () => {
    Object.defineProperty(navigator, "wakeLock", { value: undefined, configurable: true });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    await expect.element(screen.getByRole("button", { name: "LOG SET 1" })).toBeVisible();
  });
});
