import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, startShiftDown, recordRecommendation } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
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

  /**
   * SUIT-001 (COMMAND PRESENCE): pre-day state now has a real heading and
   * .btn-primary (previously an unlabeled .card) — first fresh coverage
   * of this state.
   */
  it("TodayScreen (pre-day, no BeyondDay started) has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { level: 2, name: "Day not started" })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * SUIT-001 (COMMAND PRESENCE): the STATUS strip's new UNKNOWN-capacity
   * segment (a day exists, no check-in yet) — distinct DOM from both the
   * pre-day state above and the GREEN/RED cases below.
   */
  it("TodayScreen (capacity UNKNOWN, day started but no check-in yet) has no violations beyond the known color-contrast exception", async () => {
    await startDay();
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Capacity is UNKNOWN", { exact: false })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * SUIT-001 (COMMAND PRESENCE): the dominant RED recommendation itself
   * (.command-surface, "I'll do this"/"Not doing this" decision buttons)
   * — distinct from the "active SHIFT DOWN dominance" case below, which
   * only exercises the command-surface AFTER SHIFT DOWN has been started.
   */
  it("TodayScreen (RED recommendation, not yet accepted) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "I'll do this" })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * SUIT-001 (COMMAND PRESENCE): the ATTENTION section, now a real
   * heading, with real earned content underneath it (OUTCOME) — the
   * existing "ordinary/quiet state" case never has anything in Attention.
   */
  it("TodayScreen (Attention section populated) has no violations beyond the known color-contrast exception", async () => {
    const priorDay = await startDay();
    const prior = await submitCheckIn(priorDay.id, GREEN);
    await recordRecommendation(priorDay.id, prior.recommendation);
    const currentDay = await startDay();
    await submitCheckIn(currentDay.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { level: 2, name: "Attention" })).toBeVisible();

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

  /**
   * FIELD ALPHA Phase 2: TRAIN's first accessibility coverage — the
   * pre-session picker, active-execution, and RECOVERY states all reuse
   * .command-surface/.status-strip/.equipment-row (already proven
   * accessible on TODAY), exercised here with TRAIN's own content/length.
   */
  it("TrainScreen (pre-session picker) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("TrainScreen (active STANDARD execution) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * SUIT-002 (TRAIN INPUT VELOCITY): three unlogged sets for the current
   * exercise all render their own WEIGHT/REPS rows simultaneously — this
   * proves the per-set accessible names (Set number + WEIGHT/REPS) stay
   * distinct across all three rows at once, and that the fuller axe
   * ruleset (button-name, label, aria-* — not just color-contrast) is
   * still clean with the new aria-label/inputMode attributes present.
   */
  it("TrainScreen (active STANDARD execution, direct weight/reps entry) exposes distinct per-set accessible names and has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true })).toBeVisible();

    for (const setNumber of [1, 2, 3]) {
      await expect
        .element(screen.getByRole("spinbutton", { name: `Set ${setNumber} weight in pounds` }))
        .toBeVisible();
      await expect
        .element(screen.getByRole("spinbutton", { name: `Set ${setNumber} repetitions` }))
        .toBeVisible();
    }

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("TrainScreen (RECOVERY in progress) has no violations beyond the known color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "RECOVERY", exact: true }).click();
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("RECOVERY — IN PROGRESS", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * FIELD ALPHA Phase 3: BODY's first accessibility coverage — the
   * instrument cluster (.instrument-cluster) and the four equipment-row
   * trackers, both empty and with an entry logged in each.
   */
  it("BodyScreen (empty state) has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<BodyScreen />);
    await expect.element(screen.getByText("HYDRATION", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  it("BodyScreen (an entry logged in each tracker) has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<BodyScreen />);
    await screen.getByRole("button", { name: "+12 oz" }).click();
    await screen.getByRole("spinbutton", { name: "Hours" }).fill("7");
    await screen.getByRole("button", { name: "LOG SLEEP" }).click();
    await screen.getByRole("spinbutton", { name: "Weight (lbs)" }).fill("180");
    await screen.getByRole("button", { name: "LOG BODYWEIGHT" }).click();
    await screen.getByRole("spinbutton", { name: "Protein (g)" }).fill("30");
    await screen.getByRole("button", { name: "LOG PROTEIN" }).click();
    await expect.element(screen.getByText("30 g today", { exact: true })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });

  /**
   * FIELD ALPHA Phase 4: MORE's first accessibility coverage — the MENU
   * surface (CollapsibleRow navigation rows, .equipment-row action rows,
   * .instrument-cluster SYSTEM readout).
   */
  it("MoreScreen (MENU) has no violations beyond the known color-contrast exception", async () => {
    const screen = await render(<MoreScreen />);
    await expect.element(screen.getByRole("button", { name: "Open MISSIONS & OBLIGATIONS" })).toBeVisible();

    const results = await axe.run(screen.container, KNOWN_COLOR_CONTRAST_EXCEPTION);
    expect(results.violations).toEqual([]);
  });
});
