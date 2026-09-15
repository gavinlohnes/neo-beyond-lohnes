import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, logSleep } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * Suit Layer 01 — Visual System Hardening (2026-08-22). Verifies the new
 * FIELD surface grammar itself (signal-row / tool-label / accent budget /
 * the .meta and .eyebrow contrast fixes) — behavioral coverage for the
 * underlying capabilities (attention policy, progressive disclosure,
 * recommendation flow, etc.) already exists in TodayScreen.test.tsx and
 * accessibility.test.tsx and is unchanged by this checkpoint.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("Suit Layer 01 — at most one dominant decision surface", () => {
  it("keeps NO ACTION REQUIRED quiet even with attention-worthy (but not arbitration-worthy) items present", async () => {
    // DUE_SOON, not OVERDUE/DUE_TODAY: earns ATTENTION (COMMITMENT_DUE) but
    // is deliberately excluded from INTENT-ARBITRATION-001's narrower
    // OBLIGATION_DUE gate (engine/obligationRelevance.ts's
    // ARBITRATION_WORTHY_TIERS) — the Engine's own recommendation must stay
    // NO_ACTION_REQUIRED here, exactly as before that Drop.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await createObligation({ title: "Due soon thing", dueAt: formatLocalDate(tomorrow) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await logSleep(day.id, 420, "PRIMARY"); // earns END_DAY_SUGGESTED too

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    // TODAY-002: NO ACTION REQUIRED is truthful support, not a fake
    // command surface created merely to fill the field.
    expect(document.querySelectorAll(".command-surface")).toHaveLength(0);
    expect(document.querySelectorAll(".all-clear").length).toBeLessThanOrEqual(1);
  });

  it("INTENT-ARBITRATION-001: an OVERDUE obligation legitimately earns the one dominant command surface", async () => {
    await createObligation({ title: "Overdue thing", dueAt: "2020-01-01" }); // far in the past -> OVERDUE, now arbitration-worthy
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    // Still visible in ATTENTION too — a deliberate, accepted overlap (see
    // this Drop's Contract), same treatment as POST_SHIFT_TRANSITION.
    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();

    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
    expect(document.querySelectorAll(".all-clear")).toHaveLength(0);
  });
});

describe("Suit Layer 01 — accent budget: ATTENTION items are signal-row, not dominant", () => {
  it("an ATTENTION-tier commitment renders with .signal-row, not .card--action/.corner-flag", async () => {
    await createObligation({ title: "Due today thing", dueAt: formatLocalDate(new Date()) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    // Commitments render collapsed (CollapsibleRow) by default even
    // within ATTENTION — open it to see its actual signal-row treatment.
    // FIELD ALPHA Gate A correction: the collapsed row's accessible name
    // is now the fixed role "COMMITMENT", not the obligation's own title
    // (which used to read as a second "NOW"-shaped label).
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();

    const signalRows = document.querySelectorAll(".signal-row");
    expect(signalRows.length).toBeGreaterThan(0);
    for (const row of Array.from(signalRows)) {
      expect(row.classList.contains("card--action")).toBe(false);
      expect(row.classList.contains("corner-flag")).toBe(false);
    }
  });
});

describe("Suit Layer 01 — utility cards use the neutral tool-label, not the red eyebrow", () => {
  it("STATE INPUT's header is .tool-label, not .eyebrow", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    const stateInputLabel = screen.getByText("STATE INPUT", { exact: true }).element();
    expect(stateInputLabel.className).toContain("tool-label");
    expect(stateInputLabel.className).not.toContain("eyebrow");
  });

  it("the screen identity label (BEYOND // TODAY) remains .eyebrow — identity, not a utility card", async () => {
    const screen = await render(<TodayScreen />);
    const identity = screen.getByText("BEYOND // TODAY", { exact: true }).element();
    expect(identity.className).toContain("eyebrow");
  });
});

describe("Suit Layer 01 — accessibility: the known .eyebrow/.meta contrast findings are fixed", () => {
  it("a rendered .tool-label element passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await render(<TodayScreen />);

    const el = document.querySelector(".tool-label");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });

  it("a rendered .meta element passes real WCAG AA color-contrast (rule enabled, not exempted)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await render(<TodayScreen />);

    const el = document.querySelector(".meta");
    expect(el).not.toBeNull();
    const results = await axe.run(el!, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });

  it("full TodayScreen render still has no violations beyond the known, now-narrower color-contrast exception", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    const results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe("Suit Layer 01 — no capability disappeared", () => {
  it("every previously-available TOOLS action is still reachable after the visual hardening", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("button", { name: "Open RESET" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open SHIFT DOWN" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "ALL GOOD" })).toBeVisible();
    await expect.element(screen.getByPlaceholder("Capture a thought...")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open BEYONDDAY" })).toBeVisible();
  });
});
