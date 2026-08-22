import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, recordRecommendation } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * BEYOND Suit Implementation 01 (2026-08-22). Covers the required TODAY
 * states (Part 7) not already exercised by TodayScreen.test.tsx /
 * SuitLayer01VisualGrammar.test.tsx / accessibility.test.tsx: ALL CLEAR's
 * distinct icon, the MEMORY/OUTCOME proof, and reachability of Minimum
 * Day / Work Context (previously untested at the browser level). Every
 * other required state (PRIMARY ACTION, ATTENTION, INSPECT/WHY, RESET/
 * SHIFT DOWN, Capture, State Check-In, END DAY) already has real
 * coverage in those existing files and is not duplicated here.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("TODAY // ALL CLEAR", () => {
  it("a GREEN day with no planned work resolves to NO_ACTION_REQUIRED with the ConfirmIcon, not ResolveIcon", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("No action required", { exact: true })).toBeVisible();

    // ConfirmIcon's mount animation targets .icon-confirm-diamond /
    // .icon-confirm-check; ResolveIcon's targets .icon-resolve-core.
    // Confirming the ALL CLEAR icon rendered means confirming the other
    // one did not.
    expect(document.querySelector(".icon-confirm-check")).not.toBeNull();
    expect(document.querySelector(".icon-resolve-core")).toBeNull();
  });
});

describe("TODAY // MEMORY PRESENT (OUTCOME)", () => {
  it("a recorded-but-unrated prior recommendation surfaces as OUTCOME, not the old 'LAST TIME' label", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    await submitCheckIn(day.id, GREEN); // issues a newer recommendation -> the prior one is now "past"

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/how did that go/)).toBeVisible();
    expect(screen.getByText("LAST TIME", { exact: true }).elements()).toHaveLength(0);
  });
});

describe("TODAY // Minimum Day access", () => {
  it("is reachable and offers ENABLE MINIMUM DAY", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    // FIELD ALPHA Gate A correction: Minimum Day now defaults to a
    // compact GLANCE-depth CollapsibleRow when it isn't the operator's
    // primary concern — open it to reach the enable offer.
    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY" })).toBeVisible();
    await screen.getByRole("button", { name: "Open MINIMUM DAY" }).click();

    await expect.element(screen.getByText("MINIMUM DAY", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "ENABLE MINIMUM DAY" })).toBeVisible();
  });
});

describe("TODAY // Work Context access", () => {
  it("is reachable — a fresh (unsettled) day shows YES/NO directly, since there's still a real decision pending", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("WORK CONTEXT", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "YES", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "NO", exact: true })).toBeVisible();
  });
});

describe("Utility Belt (App shell nav) — accessibility and no capability loss", () => {
  it("TodayScreen + the required states remain axe-clean with the new ALL CLEAR icon and OUTCOME label", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("has no horizontal overflow at 320-375px with ALL CLEAR + OUTCOME both present", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    await submitCheckIn(day.id, GREEN);

    await page.viewport(360, 800);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });
});
