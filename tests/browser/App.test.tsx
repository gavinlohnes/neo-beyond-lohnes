import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { recordRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { logSet, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { evaluate } from "../../src/engine/evaluate";
import type { StateCheckIn } from "../../src/domain/common/types";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * BEYOND Suit Implementation 01 (2026-08-22) — Utility Belt (Part 11).
 * First dedicated browser test for App.tsx's bottom navigation. Proves:
 * stable navigation positions/labels, the new LEVEL 1/STRUCTURAL
 * selected-tab tick (Part 8), that selection communicates through more
 * than color alone, and that touch targets stay at the established
 * 44px minimum.
 */

afterEach(() => {
  cleanup();
});

describe("Utility Belt (App shell bottom navigation)", () => {
  it("re-entry returns directly to a canonical ACTIVE workout at its exact next set without creating a duplicate", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 135, 10);

    const screen = await render(<App />);

    await expect.element(screen.getByText("BEYOND // TRAIN", { exact: true })).toBeVisible();
    expect(screen.getByText("TRAIN", { exact: true }).element().closest("button")?.getAttribute("aria-current")).toBe("page");
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();
    expect(await db.workoutSessions.filter((row) => row.status === "ACTIVE").count()).toBe(1);
    // Match TRAIN's established cross-platform allowance: Linux and
    // Windows Chromium can differ by a few sub-pixel-rounded font
    // advances on this exact active-execution surface.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(325);

    await screen.getByRole("button", { name: "PARTIAL" }).click();
    await expect.element(screen.getByText("WORKOUT SAVED — PARTIAL", { exact: true })).toBeVisible();
    expect((await db.workoutSessions.get(active.id))?.status).toBe("PARTIAL");
  });

  it("navigation away and return preserves the ACTIVE workout and completed-set state", async () => {
    const day = await startDay();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 135, 10);
    const screen = await render(<App />);
    await expect.element(screen.getByText("BEYOND // TRAIN", { exact: true })).toBeVisible();

    await screen.getByText("BODY", { exact: true }).click();
    await expect.poll(() => screen.getByText("BODY", { exact: true }).element().closest("button")?.getAttribute("aria-current")).toBe("page");
    await screen.getByText("TRAIN", { exact: true }).click();

    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();
    expect((await db.workoutSessions.get(active.id))?.status).toBe("ACTIVE");
  });

  it("keeps an active workout visible and resumable when the operator navigates to TODAY", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    const active = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, active.id, "machine-chest-press", 1, 135, 10);
    const screen = await render(<App />);
    await expect.element(screen.getByText("BEYOND // TRAIN", { exact: true })).toBeVisible();

    await screen.getByText("TODAY", { exact: true }).click();
    await expect.element(screen.getByText("Resume your active workout", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RESUME WORKOUT" })).toBeVisible();
    expect(screen.getByText("No action required", { exact: true }).elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);

    await screen.getByRole("button", { name: "RESUME WORKOUT" }).click();
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();
    expect(await db.workoutSessions.filter((row) => row.status === "ACTIVE").count()).toBe(1);

    await screen.getByText("TODAY", { exact: true }).click();
    await screen.getByRole("button", { name: "RESUME WORKOUT" }).click();
    await expect.element(screen.getByText(/Set 2 of 3/)).toBeVisible();
    expect(await db.workoutSessions.filter((row) => row.status === "ACTIVE").count()).toBe(1);
  });

  it("shows all four stable territories, TODAY selected by default", async () => {
    const screen = await render(<App />);
    for (const label of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await expect.element(screen.getByText(label, { exact: true })).toBeVisible();
    }
    const todayButton = screen.getByText("TODAY", { exact: true }).element().closest("button")!;
    expect(todayButton.getAttribute("aria-current")).toBe("page");
  });

  it("switching territories updates aria-current and keeps a non-color (bold) cue on the selected tab", async () => {
    const screen = await render(<App />);
    await screen.getByText("TRAIN", { exact: true }).click();

    const trainButton = screen.getByText("TRAIN", { exact: true }).element().closest("button")!;
    const todayButton = screen.getByText("TODAY", { exact: true }).element().closest("button")!;
    expect(trainButton.getAttribute("aria-current")).toBe("page");
    expect(todayButton.getAttribute("aria-current")).toBeNull();
    // Non-color cue: selected tab is bold (700), unselected is not —
    // this alone would still distinguish selection in grayscale.
    expect(getComputedStyle(trainButton).fontWeight).toBe("700");
    expect(getComputedStyle(todayButton).fontWeight).not.toBe("700");
  });

  it("every nav button meets the 44px minimum touch-target height", async () => {
    const screen = await render(<App />);
    for (const label of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await expect.element(screen.getByText(label, { exact: true })).toBeVisible();
      const button = screen.getByText(label, { exact: true }).element().closest("button")!;
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("Recommendation-to-Action Handoff (App shell)", () => {
  const YELLOW: Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt" | "seq"> = {
    energy: 3, stress: 3, mood: 3, soreness: 4, alcoholUrge: 0,
  };

  it("opens TRAIN with RECOVERY selected but does not start until the existing START WORKOUT action", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    await recordRecommendation(day.id, recommendation);
    const screen = await render(<App />);

    await screen.getByText("OPEN RECOVERY ON TRAIN", { exact: true }).click();
    const trainTab = screen.getByText("TRAIN", { exact: true }).element().closest("button")!;
    expect(trainTab.getAttribute("aria-current")).toBe("page");
    const recovery = screen.getByRole("button", { name: "RECOVERY", exact: true }).element();
    await expect.element(recovery).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => document.activeElement).toBe(recovery);
    expect(await db.workoutSessions.where("beyondDayId").equals(day.id).count()).toBe(0);

    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByText("RECOVERY — IN PROGRESS", { exact: true })).toBeVisible();
    const sessions = await db.workoutSessions.where("beyondDayId").equals(day.id).toArray();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.sessionType).toBe("RECOVERY");
  });

  it("returns directly to an existing active workout instead of showing the stale one-use RECOVERY handoff", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    await recordRecommendation(day.id, recommendation);
    const active = await startWorkout(day.id, "A", "REDUCED");
    const screen = await render(<App />);

    await expect.element(screen.getByText(/REDUCED — in progress/)).toBeVisible();
    expect(screen.getByText("OPEN RECOVERY ON TRAIN", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "RECOVERY", exact: true }).elements()).toHaveLength(0);
    expect((await db.workoutSessions.get(active.id))?.status).toBe("ACTIVE");
    await expect.poll(() => document.activeElement).toBe(screen.getByText("BEYOND // TRAIN", { exact: true }).element());
  });

  it("reload/remount returns to TODAY with the accepted handoff and never auto-starts", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    await recordRecommendation(day.id, recommendation);
    let screen = await render(<App />);
    await expect.element(screen.getByText("OPEN RECOVERY ON TRAIN", { exact: true })).toBeVisible();

    await screen.rerender(<></>);
    await screen.rerender(<App />);
    await expect.element(screen.getByText("TODAY", { exact: true })).toBeVisible();
    expect(screen.getByText("TODAY", { exact: true }).element().closest("button")!.getAttribute("aria-current")).toBe("page");
    await expect.element(screen.getByText("OPEN RECOVERY ON TRAIN", { exact: true })).toBeVisible();
    expect(await db.workoutSessions.where("beyondDayId").equals(day.id).count()).toBe(0);
  });

  it("defensively opens ordinary TRAIN for an imported EXECUTE_PLANNED_WORK record", async () => {
    const day = await startDay();
    const checkIn: StateCheckIn = {
      id: crypto.randomUUID(), beyondDayId: day.id, recordedAt: new Date().toISOString(),
      energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0,
    };
    await db.checkIns.add(checkIn);
    const recommendation = evaluate({ beyondDayId: day.id, checkIn, hasPlannedWork: true, hasUnresolvedPostShift: false, hasEligibleObligationDueOrOverdue: false });
    await db.recommendations.add(recommendation);
    await recordRecommendation(day.id, recommendation);
    const screen = await render(<App />);

    await screen.getByText("OPEN WORKOUT ON TRAIN", { exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(screen.getByText("BEYOND // TRAIN", { exact: true }).element());
    expect(await db.workoutSessions.where("beyondDayId").equals(day.id).count()).toBe(0);
  });

  it("keeps the accepted handoff usable without horizontal overflow at narrow-phone width", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, YELLOW);
    await recordRecommendation(day.id, recommendation);
    const screen = await render(<App />);

    const handoffLocator = screen.getByText("OPEN RECOVERY ON TRAIN", { exact: true });
    await expect.element(handoffLocator).toBeVisible();
    const handoff = handoffLocator.element();
    expect(handoff.getBoundingClientRect().right).toBeLessThanOrEqual(320);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});

/**
 * ROLLOVER-ON-RESUME (direct owner mission, 2026-09-21): App.tsx's new
 * visibilitychange/pageshow listener, proven against the real, unmocked
 * mechanism — real events dispatched at a real, rendered <App/>, real
 * Dexie state checked afterward. Backdating relative to `Date.now()`
 * (rather than a fixed calendar date) keeps both cases deterministic
 * regardless of the actual current wall-clock time: a day started
 * moments before render can never have crossed a boundary yet (every
 * boundary instant is always at-or-before "now," by construction — see
 * engine/dayRollover.ts), and a day backdated two real days into the
 * past is guaranteed to have crossed at least one.
 */
describe("App shell — rollover on resume (ROLLOVER-ON-RESUME)", () => {
  it("resuming (visibilitychange) when the active day hasn't crossed its own boundary yet leaves it unchanged", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    document.dispatchEvent(new Event("visibilitychange"));
    // No expected state change to poll toward — settle past any async
    // handler tick, then assert nothing moved.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stillActive = await db.beyondDays.get(day.id);
    expect(stillActive?.status).toBe("ACTIVE");
    expect(await db.beyondDays.count()).toBe(1);
  });

  it("resuming (visibilitychange) after the boundary has elapsed since mount rolls the day over, even though the mount-time check found nothing due", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    // Confirms the mount-time check genuinely found nothing due — this
    // rollover, once it happens below, is provably the resume listener's
    // own doing, not a residual effect from mount.
    expect((await db.beyondDays.get(day.id))?.status).toBe("ACTIVE");

    // Simulate time having passed while the app sat backgrounded: the
    // day's own boundary has now elapsed.
    await db.beyondDays.update(day.id, { startedAt: new Date(Date.now() - TWO_DAYS_MS).toISOString() });

    document.dispatchEvent(new Event("visibilitychange"));
    await expect.poll(async () => (await db.beyondDays.get(day.id))?.status).toBe("ENDED");

    const closed = await db.beyondDays.get(day.id);
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).some(
      (e) => e.type === "DAY_ENDED" && (e.payload as { reason?: string }).reason === "AUTO_CLOSED_DAY_ROLLOVER",
    )).toBe(true);
    const newActive = await db.beyondDays.filter((d) => d.status === "ACTIVE").last();
    expect(newActive).toBeDefined();
    expect(newActive!.id).not.toBe(closed!.id);
  });

  it("resuming via pageshow (not only visibilitychange) also rolls an elapsed day over", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await db.beyondDays.update(day.id, { startedAt: new Date(Date.now() - TWO_DAYS_MS).toISOString() });

    window.dispatchEvent(new Event("pageshow"));
    await expect.poll(async () => (await db.beyondDays.get(day.id))?.status).toBe("ENDED");
  });

  it("two resume events firing together (visibilitychange and pageshow, as a real browser can for one resume) still produce only one rollover", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await db.beyondDays.update(day.id, { startedAt: new Date(Date.now() - TWO_DAYS_MS).toISOString() });

    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    await expect.poll(async () => (await db.beyondDays.get(day.id))?.status).toBe("ENDED");
    // Give any second, redundant in-flight-guarded call a moment to also
    // settle before counting rows.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(await db.beyondDays.count()).toBe(2); // the original + exactly one new one, never two new ones
  });
});
