import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, startShiftDown } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * BEYOND Suit Implementation 01B (2026-08-22) — "break the card stack" /
 * "let PRIMARY DECISION own territory" / "ALL CLEAR becomes quiet".
 * Verifies the new dominant-surface grammar itself: .command-surface for
 * an actual dominant decision, .all-clear for the deliberately quiet
 * NO_ACTION_REQUIRED state, and .equipment-row replacing the bare .card
 * wrapper on ordinary TOOLS-tier content. Behavioral coverage for the
 * underlying capabilities is unchanged and already covered elsewhere
 * (TodayScreen.test.tsx, accessibility.test.tsx, SuitLayer01VisualGrammar.test.tsx).
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("Suit Implementation 01B — dominant surface grammar", () => {
  it("a real dominant recommendation (STABILIZE, RED capacity) renders .command-surface, not .all-clear", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Stabilize first", { exact: true })).toBeVisible();

    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
    expect(document.querySelectorAll(".all-clear")).toHaveLength(0);
  });

  it("NO_ACTION_REQUIRED (GREEN capacity, nothing else pending) renders the quiet .all-clear, not .command-surface", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("No action required", { exact: true })).toBeVisible();

    expect(document.querySelectorAll(".all-clear")).toHaveLength(1);
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
  });

  it("an active SHIFT DOWN, when dominant, renders .command-surface", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startShiftDown(day.id, 10);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).toBeVisible();

    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
  });

  it("ordinary TOOLS-tier surfaces (STATE INPUT, WORK CONTEXT, CAPTURE) use .equipment-row, not a bare .card", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await render(<TodayScreen />);

    const stateInput = document.querySelector(".equipment-row")!;
    expect(stateInput).not.toBeNull();
    for (const row of Array.from(document.querySelectorAll(".equipment-row"))) {
      expect(row.classList.contains("card")).toBe(false);
    }
  });

  it("a rendered .command-surface (real dominant decision) passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Stabilize first", { exact: true })).toBeVisible();
    // .command-surface carries .fade-in (a one-shot mount animation, see
    // global.css's beyond-fade-in keyframes) — settle past --motion-base
    // (220ms) so axe measures steady-state contrast, not a mid-fade frame.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const el = document.querySelector(".command-surface");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });

  it("a rendered .command-title passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Stabilize first", { exact: true })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const el = document.querySelector(".command-title");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });
});
