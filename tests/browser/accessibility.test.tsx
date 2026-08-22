import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, startShiftDown } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { CollapsibleRow } from "../../src/ui/components/CollapsibleRow";
import { ConfirmBanner } from "../../src/ui/components/ConfirmBanner";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * Harvest Checkpoint 5 (accessibility spike). Integration confirmed clean
 * and cheap against the real-browser layer Checkpoint 4 established:
 * plain `axe-core` (no wrapper package — MPL-2.0, dev-only, no peer
 * deps) called directly against the real rendered DOM, since the test
 * code itself already executes inside the browser context.
 *
 * UPDATE — Suit Layer 01 (Visual System Hardening, 2026-08-22): the
 * `.eyebrow` (--accent on --bg, was 3.25:1) and `.meta` (--text-3 on
 * --bg, was 3.64:1) findings originally flagged here are now FIXED
 * (--accent-strong / --text-3-strong, both ≥4.5:1 — see
 * tests/browser/SuitLayer01VisualGrammar.test.tsx for a scoped,
 * rule-enabled proof on each). This blanket exception remains only for
 * classes this checkpoint deliberately left untouched and still using
 * the original --text-3 (~3.6:1): `.section-label` and `.empty-state`
 * (both shared across TRAIN/BODY/MORE, out of this checkpoint's TODAY-
 * only scope) and disabled-button text (arguably WCAG-exempt anyway,
 * being non-operable). Kept as a full rule-disable rather than a
 * per-selector exception for simplicity; narrow further once those
 * remaining classes are addressed.
 */
const KNOWN_COLOR_CONTRAST_EXCEPTION = { rules: { "color-contrast": { enabled: false } } };

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("accessibility (real browser, axe-core)", () => {
  it("CollapsibleRow has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<CollapsibleRow name="RESET" summary="Quick reset." onOpen={() => {}} />);
    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("ConfirmBanner has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<ConfirmBanner message="17 oz added." actionLabel="CORRECT" onAction={() => {}} />);
    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("TodayScreen (ordinary/quiet state) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("TodayScreen (active SHIFT DOWN dominance) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startShiftDown(day.id, 10);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * TODAY // SUIT LAYER 01 (DEC-003): the WHY machinery panel is new
   * content this Drop introduces (State input / Derived / Rules
   * evaluated / Selection, inside .machinery-panel) — verified separately
   * from the closed-by-default case above, since axe only sees what's
   * actually rendered/expanded.
   */
  it("TodayScreen with WHY opened (machinery panel expanded) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await screen.getByText("How BEYOND decided", { exact: true }).click();
    await expect.element(screen.getByText("State input", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });
});
