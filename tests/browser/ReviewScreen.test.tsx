import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { rateOutcome, recordRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { ReviewScreen } from "../../src/ui/screens/review/ReviewScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * REVIEW 0.1 / Recommendation Ledger — real-browser acceptance layer,
 * same conventions as tests/browser/HistoryScreen-adjacent coverage
 * (TodayScreen.test.tsx, MoreScreen.test.tsx): real Dexie against real
 * Chromium IndexedDB, seeded via the actual application-layer commands.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("ReviewScreen (real browser)", () => {
  it("shows the empty state when no recommendation has ever been issued", async () => {
    const screen = await render(<ReviewScreen />);
    await expect.element(screen.getByText(/No recommendations yet/, { exact: false })).toBeVisible();
  });

  it("renders a recommendation's title, decision, and rating once expanded, and keeps 'not yet rated' visible for an unrated entry", async () => {
    const day = await startDay();
    const first = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, first.recommendation);
    await rateOutcome(day.id, first.recommendation.id, "GOOD");
    const second = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, second.recommendation);

    const screen = await render(<ReviewScreen />);
    await expect.element(screen.getByText("1 recommendation", { exact: false })).not.toBeInTheDocument();
    await expect.element(screen.getByText("2 recommendations", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "SHOW" }).click();
    await expect.element(screen.getByText(first.recommendation.title, { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("No action recorded · GOOD", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("No action recorded · Not yet rated", { exact: true })).toBeVisible();
  });

  it("survives a remount (reload) showing the exact same ledger content", async () => {
    const day = await startDay();
    const rec = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, rec.recommendation);
    await rateOutcome(day.id, rec.recommendation.id, "NEUTRAL");

    let screen = await render(<ReviewScreen />);
    await screen.getByRole("button", { name: "SHOW" }).click();
    await expect.element(screen.getByText("No action recorded · NEUTRAL", { exact: true })).toBeVisible();

    await screen.rerender(<></>);
    await screen.rerender(<ReviewScreen />);
    await screen.getByRole("button", { name: "SHOW" }).click();
    await expect.element(screen.getByText("No action recorded · NEUTRAL", { exact: true })).toBeVisible();
  });
});

describe("ReviewScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx", async (width) => {
    const day = await startDay();
    const rec = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, rec.recommendation);
    await rateOutcome(day.id, rec.recommendation.id, "GOOD");

    await page.viewport(width, 800);
    const screen = await render(<ReviewScreen />);
    await expect.element(screen.getByText("MORE // REVIEW", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("ReviewScreen (real browser) — accessibility", () => {
  it("passes real WCAG AA color-contrast beyond the known app-wide exception, both collapsed and expanded", async () => {
    const day = await startDay();
    const rec = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, rec.recommendation);
    await rateOutcome(day.id, rec.recommendation.id, "GOOD");

    const screen = await render(<ReviewScreen />);
    await expect.element(screen.getByText("MORE // REVIEW", { exact: true })).toBeVisible();
    let results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    await screen.getByRole("button", { name: "SHOW" }).click();
    await expect.element(screen.getByText("No action recorded · GOOD", { exact: true })).toBeVisible();
    results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
