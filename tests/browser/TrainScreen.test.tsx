import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * BEYOND FIELD ALPHA Phase 2 — first real-browser acceptance layer for
 * TRAIN. There was no browser-level UI coverage for this screen before
 * this checkpoint (only pure copy tests in tests/ui/trainCopy.test.ts
 * and application-layer integration tests in
 * tests/integration/trainWorkout.test.ts / trainProgression.test.ts) —
 * this file exercises the actually-rendered screen through the same
 * real Dexie/real-Chromium stack TodayScreen.test.tsx uses, driving
 * everything through the real UI controls (never hand-constructed DOM
 * fixtures) so it protects both the presentation contract this
 * checkpoint changed and the underlying workout behavior it didn't.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("TrainScreen (real browser) — no active session", () => {
  it("is usable with no day/check-in yet: NO CHECK-IN banner + a reachable suggested workout", async () => {
    const screen = await render(<TrainScreen />);

    await expect.element(screen.getByText("NO CHECK-IN YET", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "QUICK CHECK-IN (ALL GOOD)" })).toBeVisible();
    await expect.element(screen.getByText("DEFAULT WORKOUT", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
  });

  it("quick check-in clears the NO CHECK-IN banner", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "QUICK CHECK-IN (ALL GOOD)" }).click();

    await expect.element(screen.getByText("SUGGESTED WORKOUT", { exact: true })).toBeVisible();
    expect(screen.getByText("NO CHECK-IN YET", { exact: true }).elements()).toHaveLength(0);
  });

  it("the pre-session picker is the one dominant surface (.command-surface), not a plain card", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);

    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
    expect(document.querySelectorAll(".card--action, .corner-flag")).toHaveLength(0);
  });

  it("the suggestion rationale is reachable behind disclosure, not permanently occupying GLANCE depth", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);

    // <details> keeps its content in the DOM while closed (native
    // show/hide, not a conditional React render), so this checks
    // visibility rather than DOM presence.
    await expect.element(screen.getByText(/STANDARD: the full session/)).not.toBeVisible();
    await screen.getByText("Why this suggestion", { exact: true }).click();
    await expect.element(screen.getByText(/STANDARD: the full session/)).toBeVisible();
  });
});

describe("TrainScreen (real browser) — active STANDARD session", () => {
  async function startStandardWorkout() {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    return screen;
  }

  it("the active exercise is unmistakable: name, set position, and target are visible", async () => {
    const screen = await startStandardWorkout();

    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Exercise 1 of 4", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 1 of 3/)).toBeVisible();
  });

  it("exactly one .command-surface is present during active execution — the current exercise, not the whole session", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
    expect(document.querySelectorAll(".card--action, .corner-flag, .exercise-focus")).toHaveLength(0);
  });

  it("logging a set performs the real mutation: weight/reps entered, LOG tapped, the set shows as logged", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    // Every unlogged set slot for the current exercise renders its own
    // WEIGHT/REPS/LOG/SKIP row simultaneously (existing, unchanged
    // behavior) — .first() targets Set 1 specifically.
    const weightInput = screen.getByPlaceholder("lb").first();
    const repsInput = screen.getByPlaceholder("reps").first();
    await weightInput.fill("135");
    await repsInput.fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();

    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();
  });

  it("skipping a set records it as SKIPPED, not as a logged weight", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "SKIP" }).first().click();
    await expect.element(screen.getByText("#1 — SKIPPED", { exact: true })).toBeVisible();
  });

  it("the jump rail (NEXT) shows session progression without competing with the execution surface", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    await expect.element(screen.getByRole("button", { name: /Machine Chest Press — 0 of 3 sets/ })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Pec Deck — 0 of 3 sets/ })).toBeVisible();
  });

  it("tapping a different exercise in the jump rail focuses it", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: /Pec Deck — 0 of 3 sets/ }).click();
    await expect.element(screen.getByText("Pec Deck", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Exercise 2 of 4", { exact: true })).toBeVisible();
  });

  it("COULDN'T START stops immediately with nothing logged (no destructive confirm for a no-op)", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByRole("button", { name: "COULDN'T START" })).toBeVisible();

    await screen.getByRole("button", { name: "COULDN'T START" }).click();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
  });

  it("STOP WORKOUT requires confirmation once something has actually been logged", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SKIP" }).first().click();

    await expect.element(screen.getByRole("button", { name: "STOP WORKOUT" })).toBeVisible();
    await screen.getByRole("button", { name: "STOP WORKOUT" }).click();
    await expect.element(screen.getByText(/won't count as a completed workout/)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "KEEP GOING" })).toBeVisible();

    await screen.getByRole("button", { name: "KEEP GOING" }).click();
    expect(screen.getByText(/won't count as a completed workout/).elements()).toHaveLength(0);
  });

  it("PARTIAL produces a completion summary, dismissible back to the picker", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "SKIP" }).first().click();

    await screen.getByRole("button", { name: "PARTIAL" }).click();
    await expect.element(screen.getByText("WORKOUT SAVED — PARTIAL", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "DONE" }).click();
    expect(screen.getByText("WORKOUT SAVED — PARTIAL", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
  });
});

describe("TrainScreen (real browser) — RECOVERY session", () => {
  it("starting RECOVERY shows the duration control, and ending it returns to the picker", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);

    await screen.getByRole("button", { name: "RECOVERY", exact: true }).click();
    await screen.getByRole("button", { name: "START WORKOUT" }).click();

    await expect.element(screen.getByText("RECOVERY — IN PROGRESS", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "END RECOVERY" })).toBeVisible();

    await screen.getByRole("button", { name: "END RECOVERY" }).click();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
  });
});

describe("TrainScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx (pre-session picker)", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    await page.viewport(width, 800);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });

  it.each([320, 360, 375])("has no horizontal overflow at %ipx (active execution, multi-exercise jump rail)", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    await page.viewport(width, 800);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("TrainScreen (real browser) — accessibility", () => {
  it("a rendered .command-surface (the active exercise) passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    // .command-surface carries .fade-in (a one-shot mount animation, see
    // global.css's beyond-fade-in keyframes) — settle past --motion-base
    // (220ms) so axe measures steady-state contrast, not a mid-fade frame.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const el = document.querySelector(".command-surface");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });

  it("a rendered .command-title (the exercise name) passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const el = document.querySelector(".command-title");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });
});
