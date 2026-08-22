import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { startDay, submitCheckIn, startShiftDown, captureItem, logSleep } from "../../src/application/commands";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * Harvest Checkpoint 4: real-browser acceptance layer for TODAY —
 * exactly the surfaces Checkpoints 2/3 (COMMAND 3.0) changed most.
 * Real Dexie against real Chromium IndexedDB (see setup.ts), the same
 * application-layer commands the app itself uses to seed state — never
 * hand-constructed DOM fixtures standing in for real domain behavior.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const RED: CheckInValues = { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

// No manual db.open()/close() here (unlike the Node suite's pattern) —
// the real app never calls those either; Dexie auto-opens the singleton
// `db` on first table access. Explicitly closing it in afterEach raced
// against TodayScreen's own in-flight refresh() promises (its useEffect
// doesn't check "am I still mounted" before continuing), surfacing as
// DatabaseClosedError / "Dexie.delete('beyond') was blocked". Unmounting
// via cleanup() and leaving the actual close/delete to setup.ts's global
// afterEach (which runs after this one) avoids the race.
afterEach(() => {
  cleanup();
});

describe("TodayScreen (real browser) — ordinary/quiet state", () => {
  it("shows the recommendation as NOW and no Attention section on a GREEN day with nothing outstanding", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Tools", { exact: true })).toBeVisible();
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
  });
});

describe("TodayScreen (real browser) — active mode dominance", () => {
  it("makes an active SHIFT DOWN the dominant NOW surface, demoting the recommendation to a collapsed Tools row", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED); // STABILIZE -> suggestedCommand START_SHIFT_DOWN
    await startShiftDown(day.id, 10);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "COMPLETE SHIFT DOWN" })).toBeVisible();
    // The recommendation stepped back to a quiet, reopenable Tools row.
    await expect.element(screen.getByRole("button", { name: "Open RECOMMENDATION" })).toBeVisible();
  });
});

describe("TodayScreen (real browser) — Capture", () => {
  it("is available even with no BeyondDay started at all", async () => {
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByPlaceholder("Capture a thought...")).toBeVisible();
    await expect.element(screen.getByText("No day started yet.")).toBeVisible();
  });

  it("earns an Attention slot once an item is unresolved", async () => {
    await captureItem("call the dentist");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("call the dentist")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RESOLVE" })).toBeVisible();
  });
});

describe("TodayScreen (real browser) — END DAY relevance", () => {
  it("collapses to a quiet Tools row when nothing suggests ending the day", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "Open BEYONDDAY" })).toBeVisible();
  });

  it("surfaces in Attention once primary sleep is logged", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await logSleep(day.id, 420, "PRIMARY");

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/BeyondDay looks done/)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "END DAY" })).toBeVisible();
  });
});

describe("TodayScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startShiftDown(day.id, 10);
    await captureItem("something captured");

    await page.viewport(width, 800);
    await render(<TodayScreen />);

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});
