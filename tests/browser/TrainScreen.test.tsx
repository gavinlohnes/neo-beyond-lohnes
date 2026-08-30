import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import {
  abandonWorkout,
  completeRecoverySession,
  completeWorkout,
  logSet,
  startWorkout,
} from "../../src/application/trainCommands";
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
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

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

  // VISUAL-002: useRedCapacityOverrideGate is shared by TODAY and TRAIN —
  // proving the real-panel/danger-action/secondary-cancel fix on TRAIN's
  // own STANDARD-under-RED call site (handleStart -> guard), the same
  // shared hook TodayScreen's decline-under-RED test proves it on.
  it("starting a STANDARD workout under RED capacity shows the real warning panel and gates START WORKOUT until PROCEED ANYWAY", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TrainScreen />);

    await screen.getByRole("button", { name: "START WORKOUT" }).click();

    const panel = document.querySelector(".card--warning");
    expect(panel).not.toBeNull();
    await expect.element(screen.getByText("CONFIRM OVERRIDE", { exact: true })).toBeVisible();
    // Not started yet — still showing the pre-session picker underneath.
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();

    const proceed = screen.getByRole("button", { name: "PROCEED ANYWAY" }).element();
    expect(proceed.className).toContain("btn-danger");
    const cancel = screen.getByRole("button", { name: "CANCEL" }).element();
    expect(cancel.className).toContain("btn-secondary");

    await screen.getByRole("button", { name: "PROCEED ANYWAY" }).click();
    await expect.element(screen.getByText("Exercise 1 of", { exact: false })).toBeVisible();
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

/**
 * TRAIN-003 (Performance Brief): read-only derived intelligence shown
 * only pre-workout, subordinate to the pre-session .command-surface
 * picker above it (never a second dominant surface — see the "at most
 * one .command-surface" assertions below and in the active-session
 * describe block further down, which is unchanged by this Drop).
 */
describe("TrainScreen (real browser) — Performance Brief", () => {
  it("is calm and present with no strength history yet, and does not compete with the dominant picker", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);

    // FIELD-001: Performance Brief is real Inspect-tier depth, collapsed
    // by default behind the same CollapsibleRow primitive RESET/SHIFT
    // DOWN already use — it does not compete with the dominant picker's
    // own footprint until explicitly opened.
    await expect.element(screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" })).toBeVisible();
    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);

    await screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" }).click();
    await expect.element(screen.getByText("Performance Brief", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Training history will appear here/)).toBeVisible();
    await expect.element(screen.getByText(/Recent training will appear here/)).toBeVisible();
    await expect.element(screen.getByText(/No exercise history yet/)).toBeVisible();
    // Still exactly one dominant surface — the picker, not the brief.
    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
  });

  it("reports LAST from a real COMPLETED STANDARD session — template, status, working-set count, duration", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 135, 10);
    await logSet(day.id, session.id, "machine-chest-press", 2, 135, 10);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText(/Template A — Completed · 2 working sets/)).toBeVisible();
  });

  it("a RECOVERY session never appears as LAST or in RECENT", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const recovery = await startWorkout(day.id, null, "RECOVERY");
    await completeRecoverySession(day.id, recovery.id, 15);

    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" }).click();
    await expect.element(screen.getByText(/Training history will appear here/)).toBeVisible();
    await expect.element(screen.getByText(/Recent training will appear here/)).toBeVisible();
  });

  it("an ABANDONED session appears in RECENT under its own real status, but never as LAST", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await abandonWorkout(day.id, session.id, "STANDARD");

    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" }).click();
    // Not eligible as LAST — still the calm empty-history copy.
    await expect.element(screen.getByText(/Training history will appear here/)).toBeVisible();
    // But visible, honestly, in RECENT.
    await expect.element(screen.getByText(/Template A — Abandoned/)).toBeVisible();
  });

  it("PROGRESSION exercise detail is reachable behind disclosure and does not collapse Template A and C's shared exercise", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "triceps-pressdown", 1, 50, 12);
    await logSet(day.id, session.id, "triceps-pressdown", 2, 50, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" }).click();
    await expect.element(screen.getByText("Template A", { exact: true })).not.toBeVisible();
    await screen.getByText("Exercise detail", { exact: true }).click();

    await expect.element(screen.getByText("Template A", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Template C", { exact: true })).toBeVisible();
    // Same exercise, two separate per-template lines — never merged into one.
    const tricepsLines = screen.getByText(/Triceps Pressdown —/).elements();
    expect(tricepsLines.length).toBe(2);
  });

  it("the Performance Brief is not shown once a workout is active", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    expect(screen.getByText("Performance Brief", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Open PERFORMANCE BRIEF" }).elements()).toHaveLength(0);
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

  /**
   * SUIT-002 (TRAIN INPUT VELOCITY): direct weight/reps entry made a
   * first-class interaction. Each test below exercises one required
   * behavior from the Drop's test plan against the real rendered DOM —
   * never a hand-constructed fixture — so a regression here means a real
   * device would show it too.
   */
  it("weight and reps inputs expose accessible names identifying set number, weight, and reps, with mobile keyboard hints", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    const weightInput = screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" });
    const repsInput = screen.getByRole("spinbutton", { name: "Set 1 repetitions" });
    await expect.element(weightInput).toBeVisible();
    await expect.element(repsInput).toBeVisible();

    expect(weightInput.element().getAttribute("inputmode")).toBe("decimal");
    expect(repsInput.element().getAttribute("inputmode")).toBe("numeric");
  });

  it("a prefilled weight value can be replaced directly after focus, without deleting it first", async () => {
    const screen = await startStandardWorkout();
    await screen.getByPlaceholder("lb").first().fill("135");
    await screen.getByPlaceholder("reps").first().fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();

    // Set 2 prefills from the just-logged Set 1 (same exercise, this
    // session) — a populated field, not an empty one.
    const weightInput = screen.getByRole("spinbutton", { name: "Set 2 weight in pounds" });
    await expect.element(weightInput).toHaveValue(135);

    // Real keystrokes via userEvent.type (not .fill, which sets the value
    // directly and would pass even without any select-on-focus behavior):
    // this focuses the field for real, so onFocus fires, then types over
    // whatever is selected. Without the select-on-focus behavior this Drop
    // adds, the new digits would land after "135" instead of replacing it.
    await userEvent.type(weightInput, "77");
    await expect.element(weightInput).toHaveValue(77);
  });

  it("typing into weight/reps does not log a set automatically", async () => {
    const screen = await startStandardWorkout();
    const weightInput = screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" });
    const repsInput = screen.getByRole("spinbutton", { name: "Set 1 repetitions" });

    await userEvent.type(weightInput, "185");
    await userEvent.type(repsInput, "8");

    expect(screen.getByText(/^#1 —/).elements()).toHaveLength(0);
    await expect.element(screen.getByText(/Set 1 of 3/)).toBeVisible();
  });

  it("LOG records the entered weight and reps exactly once", async () => {
    const screen = await startStandardWorkout();
    const weightInput = screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" });
    const repsInput = screen.getByRole("spinbutton", { name: "Set 1 repetitions" });

    await userEvent.type(weightInput, "185");
    await userEvent.type(repsInput, "8");
    await screen.getByRole("button", { name: "LOG" }).first().click();

    await expect.element(screen.getByText("#1 — 185 lb x 8", { exact: true })).toBeVisible();
    expect(screen.getByText("#1 — 185 lb x 8", { exact: true }).elements()).toHaveLength(1);
  });

  it("the -/+ steppers still adjust weight and reps (secondary precision controls preserved)", async () => {
    const screen = await startStandardWorkout();
    const repsInput = screen.getByRole("spinbutton", { name: "Set 1 repetitions" });

    await screen.getByRole("button", { name: "Increase set 1 repetitions" }).click();
    await expect.element(repsInput).toHaveValue(1);
    await screen.getByRole("button", { name: "Increase set 1 repetitions" }).click();
    await expect.element(repsInput).toHaveValue(2);
    await screen.getByRole("button", { name: "Decrease set 1 repetitions" }).click();
    await expect.element(repsInput).toHaveValue(1);
  });

  it("SAME AS LAST TIME remains the fastest one-tap exact-repeat path, unchanged", async () => {
    const screen = await startStandardWorkout();
    await screen.getByPlaceholder("lb").first().fill("135");
    await screen.getByPlaceholder("reps").first().fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();

    const sameAsLast = screen.getByRole("button", { name: "SET 2: SAME AS LAST TIME — 135 lb x 10" });
    await expect.element(sameAsLast).toBeVisible();
    await sameAsLast.click();

    await expect.element(screen.getByText("#2 — 135 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 3 of 3/)).toBeVisible();
  });

  it("clearing a field to empty mid-entry does not create a false set", async () => {
    const screen = await startStandardWorkout();
    const weightInput = screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" });

    await userEvent.type(weightInput, "185");
    await expect.element(weightInput).toHaveValue(185);

    await userEvent.clear(weightInput);
    await expect.element(weightInput).not.toHaveValue();

    expect(screen.getByText(/^#1 —/).elements()).toHaveLength(0);
    await expect.element(screen.getByText(/Set 1 of 3/)).toBeVisible();
  });

  /**
   * VISUAL-001 (Hybrid Foundation): the one earned-salience moment this
   * Drop adds to active TRAIN. Ordinary repeated logging (every set here
   * except the one just logged) must stay exactly as quiet as before.
   */
  it("the set just logged this session earns a one-shot salience flash — earlier logged sets do not", async () => {
    const screen = await startStandardWorkout();
    await screen.getByPlaceholder("lb").first().fill("135");
    await screen.getByPlaceholder("reps").first().fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();

    const set1Row = screen.getByText("#1 — 135 lb x 10", { exact: true }).element();
    expect(set1Row.className).toContain("set-earned");

    // Logging set 2 moves the earned flash — set 1 is no longer "just logged."
    const sameAsLast = screen.getByRole("button", { name: "SET 2: SAME AS LAST TIME — 135 lb x 10" });
    await sameAsLast.click();
    await expect.element(screen.getByText("#2 — 135 lb x 10", { exact: true })).toBeVisible();

    expect(set1Row.className).not.toContain("set-earned");
    const set2Row = screen.getByText("#2 — 135 lb x 10", { exact: true }).element();
    expect(set2Row.className).toContain("set-earned");
  });

  /**
   * VISUAL-001 review correction: the jump rail unmounts the previous
   * exercise's set rows entirely and remounts whichever exercise is
   * selected. Before the fix, justLoggedKey stayed set indefinitely, so
   * navigating away from and back to the just-logged exercise remounted
   * its already-logged row with .set-earned still applied, replaying the
   * one-shot flash for a set that wasn't actually just logged.
   */
  it("navigating away and back to an exercise does not replay the flash on an already-logged set", async () => {
    const screen = await startStandardWorkout();
    await screen.getByPlaceholder("lb").first().fill("135");
    await screen.getByPlaceholder("reps").first().fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    expect(screen.getByText("#1 — 135 lb x 10", { exact: true }).element().className).toContain("set-earned");

    // Navigate away via the jump rail — Machine Chest Press's rows,
    // including the just-logged one, unmount entirely while Pec Deck is
    // focused.
    await screen.getByRole("button", { name: /Pec Deck — 0 of 3 sets/ }).click();
    await expect.element(screen.getByText("Pec Deck", { exact: true })).toBeVisible();

    // Navigate back — the logged row remounts fresh.
    await screen.getByRole("button", { name: /Machine Chest Press — 1 of 3 sets/ }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();

    const revisitedRow = screen.getByText("#1 — 135 lb x 10", { exact: true }).element();
    expect(revisitedRow.className).not.toContain("set-earned");
  });

  it("a SKIPPED set never earns the salience flash", async () => {
    const screen = await startStandardWorkout();
    await screen.getByRole("button", { name: "SKIP" }).first().click();
    await expect.element(screen.getByText("#1 — SKIPPED", { exact: true })).toBeVisible();

    const skippedRow = screen.getByText("#1 — SKIPPED", { exact: true }).element();
    expect(skippedRow.className).not.toContain("set-earned");
  });

  it("the dominant execution surface (.command-surface) carries the one earned structural cut, not the jump-rail chips", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    const surface = document.querySelector(".command-surface");
    expect(surface).not.toBeNull();
    expect(getComputedStyle(surface!).clipPath).not.toBe("none");

    const chip = document.querySelector(".chip");
    expect(chip).not.toBeNull();
    expect(getComputedStyle(chip!).clipPath).toBe("none");
  });

  it("LOG is no longer filled with identity red — it uses the neutral action tokens, and stays the most visually prominent control in its row", async () => {
    const screen = await startStandardWorkout();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();
    const logLocator = screen.getByRole("button", { name: "LOG" }).first();
    // loadExerciseAdvisory() is still in flight for a moment after
    // "Machine Chest Press" first becomes visible (session state and the
    // busy flag settle in separate renders) — wait for LOG to actually be
    // enabled, not just present, so this reads the real enabled-state
    // fill rather than a transient :disabled one under load.
    await expect.element(logLocator).toBeEnabled();
    const logButton = logLocator.element();
    const skipButton = screen.getByRole("button", { name: "SKIP" }).first().element();

    const logBg = getComputedStyle(logButton).backgroundColor;
    expect(logBg).not.toBe("rgb(200, 30, 44)"); // was var(--accent)
    expect(logBg).toBe("rgb(242, 242, 242)"); // --action-primary-bg

    // LOG (.btn-primary) must still read as more prominent than SKIP
    // (.btn-secondary) purely from contrast against the dark surface —
    // SKIP's fill stays dark/quiet.
    const skipBg = getComputedStyle(skipButton).backgroundColor;
    expect(skipBg).not.toBe(logBg);
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
  // A few px of tolerance, not zero: the same self-hosted font files can
  // still shape to a slightly different sub-pixel-rounded advance width
  // between platforms' text-rasterizers (observed: this exact suite
  // measured cleanly under width locally on Windows/Chromium but landed
  // a few px over on CI's Linux/Chromium for the busiest active-execution
  // case) — real cross-platform text-shaping variance, not a layout bug
  // or a flaky timing race (expect.poll already retries past any
  // font-swap settle time). Not perceptible as an actual scrollbar/
  // overflow on a real device at this margin.
  const OVERFLOW_TOLERANCE_PX = 5;

  it.each([320, 360, 375, 412])("has no horizontal overflow at %ipx (pre-session picker)", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    await page.viewport(width, 800);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width + OVERFLOW_TOLERANCE_PX);
  });

  it.each([320, 360, 375])("has no horizontal overflow at %ipx (active execution, multi-exercise jump rail)", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    await page.viewport(width, 800);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width + OVERFLOW_TOLERANCE_PX);
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
