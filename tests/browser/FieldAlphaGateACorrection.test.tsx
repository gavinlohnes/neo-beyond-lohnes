import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn, enableMinimumDay, markMedsCompleted, markHygieneCompleted } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * BEYOND FIELD ALPHA — Experience Gate A correction checkpoint
 * (2026-08-22). Real-device evidence on the deployed build showed that
 * removing card containers (Suit Implementation 01A/01B) reduced the
 * "wall of cards" feeling but exposed a second problem: reducing card
 * density is not the same as reducing information density. This file
 * covers the three corrections that followed: Minimum Day's GLANCE-
 * depth compaction, State Input's red-authority reduction, and the
 * commitment row's label clarity (no longer duplicating TODAY's own
 * "Orient" section label). Behavioral coverage for the underlying
 * capabilities (Minimum Day semantics, check-in semantics, Obligation
 * relevance/ranking) is unchanged and already exists elsewhere
 * (tests/integration/minimumDay.test.ts, tests/ui/checkInFields.test.ts,
 * tests/engine/obligationRelevance.test.ts, etc.) — this is presentation
 * coverage only.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("Gate A correction — Minimum Day GLANCE-depth compaction", () => {
  it("presents a compact row, not the full six-item enable offer, when it isn't the operator's primary concern", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY" })).toBeVisible();
    expect(screen.getByRole("button", { name: "ENABLE MINIMUM DAY" }).elements()).toHaveLength(0);
    expect(screen.getByText("Hydrate ≥40oz", { exact: true }).elements()).toHaveLength(0);
  });

  it("expanding it reveals the existing enable offer when not yet enabled", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await screen.getByRole("button", { name: "Open MINIMUM DAY" }).click();
    await expect.element(screen.getByRole("button", { name: "ENABLE MINIMUM DAY" })).toBeVisible();
  });

  it("summarizes real completion progress at GLANCE depth once enabled — 2 of 6 done, truthfully", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await enableMinimumDay(day.id);
    await markMedsCompleted(day.id);
    await markHygieneCompleted(day.id);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY" })).toBeVisible();
    await expect.element(screen.getByText("This active BeyondDay · 2 / 6", { exact: true })).toBeVisible();
  });

  it("expanding an enabled, in-progress Minimum Day reveals all six canonical requirements", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await enableMinimumDay(day.id);
    await markMedsCompleted(day.id);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("This active BeyondDay · 1 / 6", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Open MINIMUM DAY" }).click();

    // Hydrate/Protein always append a live "— Noz logged" suffix
    // (unrelated to this checkpoint), so match those two by prefix;
    // the rest have no such suffix and match exactly.
    for (const label of [/^Hydrate/, /^Protein/, "Meds", "Hygiene", "Move ≥5min", "Recover or Connect ≥10min"]) {
      await expect.element(screen.getByText(label, typeof label === "string" ? { exact: true } : undefined)).toBeVisible();
    }
    // The already-completed item's own MARK DONE control is gone (it's
    // done), proving this is the real, live six-item list, not a static
    // mock — existing completion semantics are what's rendering here.
    expect(screen.getByRole("button", { name: "MARK DONE" }).elements().length).toBeLessThan(6);
  });
});

describe("Gate A correction — State Input red-authority reduction", () => {
  it("ALL GOOD remains reachable and functional but is no longer styled as the primary red action at rest", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    const button = screen.getByRole("button", { name: "ALL GOOD" }).element();
    expect(button.className).toContain("btn-secondary");
    expect(button.className).not.toContain("btn-primary");
  });

  it("manual check-in remains reachable", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("button", { name: "MANUAL CHECK-IN" })).toBeVisible();
  });
});

describe("Gate A correction — commitment label clarity", () => {
  it("the collapsed ATTENTION-tier commitment row no longer duplicates TODAY's own Now section label", async () => {
    await createObligation({ title: "Renew passport", dueAt: formatLocalDate(new Date()) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    // Exactly one "Orient" on the whole screen — the section header, not
    // also the commitment row underneath it.
    expect(screen.getByText("Orient", { exact: true }).elements()).toHaveLength(1);
  });

  it("the obligation's own title still appears, in the row's summary line, once role-labeled as COMMITMENT", async () => {
    await createObligation({ title: "Renew passport", dueAt: formatLocalDate(new Date()) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText(/Renew passport/)).toBeVisible();
  });
});

describe("Gate A correction — accessibility", () => {
  it("the ALL GOOD control passes real WCAG AA color-contrast after its visual-weight reduction", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    const el = screen.getByRole("button", { name: "ALL GOOD" }).element();
    const results = await axe.run(el, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });

  it("the collapsed MINIMUM DAY row passes real WCAG AA color-contrast", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    // minimumDay loads asynchronously after mount — wait for the row to
    // actually exist before grabbing its element synchronously.
    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY" })).toBeVisible();
    const el = screen.getByRole("button", { name: "Open MINIMUM DAY" }).element();
    const results = await axe.run(el, { runOnly: ["color-contrast"] });
    expect(results.violations).toEqual([]);
  });
});
