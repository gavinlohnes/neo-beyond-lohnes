import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import {
  startDay,
  submitCheckIn,
  startShiftDown,
  captureItem,
  logSleep,
  rateOutcome,
  recordRecommendation,
} from "../../src/application/commands";
import { archiveMission, createMission, createObligation, markObligationWaiting } from "../../src/application/intentCommands";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";
import { db } from "../../src/persistence/db";

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

describe("TodayScreen // SUIT LAYER 01 (DEC-003) — WHY machinery panel", () => {
  it("is calm at rest — the machinery panel's content is not visible until WHY is opened", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("How BEYOND decided", { exact: true })).toBeVisible();
    // <details> content exists in the DOM but is not visible while closed.
    await expect.element(screen.getByText("State input", { exact: true })).not.toBeVisible();
  });

  it("opening WHY reveals the real check-in values, derived capacity, a matched rule, and the selection reason", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByText("How BEYOND decided", { exact: true }).click();

    // Real deterministic inputs — the exact values just submitted, not manufactured.
    await expect.element(screen.getByText("State input", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Energy", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("4", { exact: true }).first()).toBeVisible();

    // Real derived facts already computed by engine/capacity.ts.
    await expect.element(screen.getByText("Derived", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Capacity", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("GREEN", { exact: true })).toBeVisible();

    // Real rule evaluation and the actual selection sentence — no fabricated technical content.
    await expect.element(screen.getByText("Rules evaluated", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/No higher-priority rule matched/)).toBeVisible();
    await expect.element(screen.getByText(/^ENGINE /)).toBeVisible();
  });

  it("keeps prior outcome memory hidden while WHY is collapsed and reveals it only after WHY is opened", async () => {
    const day = await startDay();
    const prior = await submitCheckIn(day.id, GREEN);
    await recordRecommendation(day.id, prior.recommendation);
    await rateOutcome(day.id, prior.recommendation.id, "GOOD");
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Previous result", { exact: true })).not.toBeVisible();
    await expect.element(screen.getByText(/Last time this recommendation was recorded/)).not.toBeVisible();

    await screen.getByText("How BEYOND decided", { exact: true }).click();

    await expect.element(screen.getByText("Previous result", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/NO ACTION RECORDED · GOOD/)).toBeVisible();
  });

});

describe("TodayScreen (real browser) — cross-day outcome follow-up", () => {
  async function seedCrossDayFollowUp() {
    const priorDay = await startDay();
    const prior = await submitCheckIn(priorDay.id, GREEN);
    await recordRecommendation(priorDay.id, prior.recommendation);
    const currentDay = await startDay();
    const current = await submitCheckIn(currentDay.id, GREEN);
    return { priorDay, prior, currentDay, current };
  }

  it("survives reload, rates against the historical day, then feeds Prior Outcome Memory", async () => {
    const { priorDay, prior } = await seedCrossDayFollowUp();
    let screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();
    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "GOOD", exact: true }).click();
    await expect.element(screen.getByText("OUTCOME", { exact: true })).not.toBeInTheDocument();
    const outcomes = await db.outcomes.where("beyondDayId").equals(priorDay.id).toArray();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ recommendationId: prior.recommendation.id, rating: "GOOD" });

    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    await screen.getByText("How BEYOND decided", { exact: true }).click();
    await expect.element(screen.getByText("Previous result", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/NO ACTION RECORDED · GOOD/)).toBeVisible();
  });

  it("respects dismissal across a remount", async () => {
    await seedCrossDayFollowUp();

    let screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "DISMISS" }).click();
    expect(screen.getByText("OUTCOME", { exact: true }).elements()).toHaveLength(0);

    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    expect(screen.getByText("OUTCOME", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText(/Last time, BEYOND recommended/).elements()).toHaveLength(0);
  });

  it("renders only one OUTCOME row when multiple historical recommendations qualify", async () => {
    const firstDay = await startDay();
    const first = await submitCheckIn(firstDay.id, GREEN);
    await recordRecommendation(firstDay.id, first.recommendation);
    const secondDay = await startDay();
    const second = await submitCheckIn(secondDay.id, GREEN);
    await recordRecommendation(secondDay.id, second.recommendation);
    const currentDay = await startDay();
    await submitCheckIn(currentDay.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();
    expect(screen.getByText("OUTCOME", { exact: true }).elements()).toHaveLength(1);
  });
});

describe("TodayScreen // SUIT LAYER 01 (DEC-003) — STATUS operational readout", () => {
  it("renders the STATUS line as a .status-strip, with the same real context/capacity content as before", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toContain("GREEN");
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

describe("TodayScreen (real browser) — Commitments (Intent & Commitment Spine, Drop 02)", () => {
  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  it("adds no new visual footprint when there are zero unresolved Obligations", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();
    expect(screen.getByText("COMMITMENT", { exact: true }).elements()).toHaveLength(0);
  });

  it("a QUIET obligation (no dueAt/plannedAt) shows only as a quiet Tools row, never in Attention", async () => {
    await createObligation({ title: "Someday maybe" });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    // FIELD ALPHA Gate A correction: the collapsed row's accessible
    // name is the fixed role "COMMITMENT" (it used to be the
    // obligation's own title, which could visually collide with
    // TODAY's "Now" section header) — the title itself still shows, in
    // the summary line.
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    await expect.element(screen.getByText(/Someday maybe/)).toBeVisible();
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
  });

  it("an OVERDUE obligation earns an Attention slot and is inspectable read-only via VIEW", async () => {
    await createObligation({ title: "Renew passport", dueAt: dateOffset(-1) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const onViewCommitments = vi.fn();
    const screen = await render(<TodayScreen onViewCommitments={onViewCommitments} />);

    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    await expect.element(screen.getByText(/Renew passport/)).toBeVisible();

    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await expect.element(screen.getByText(/Overdue/)).toBeVisible();
    // Read-only: no satisfy/release/mark-waiting control on TODAY.
    expect(screen.getByRole("button", { name: "SATISFY" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "VIEW" }).click();
    expect(onViewCommitments).toHaveBeenCalledTimes(1);
  });

  /**
   * Intent Lifecycle Integrity — owner-approved correction (2026-08-23,
   * see docs/UX_DECISIONS.md). The exact FIELD-reported defect, on the
   * primary screen it actually affected: an OVERDUE obligation whose
   * parent Mission is ARCHIVED must produce no COMMITMENT card and no
   * Attention slot at all, even though it remains status OPEN.
   */
  it("an OVERDUE obligation linked to an ARCHIVED Mission earns no COMMITMENT card and no Attention slot", async () => {
    const mission = await createMission({ title: "Old direction" });
    await createObligation({ title: "Renew passport", missionId: mission.id, dueAt: dateOffset(-1) });
    await archiveMission(mission.id);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Now", { exact: true })).toBeVisible();
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("COMMITMENT", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText(/Renew passport/).elements()).toHaveLength(0);
  });

  it("a WAITING obligation never earns Attention, even with a past dueAt", async () => {
    const obligation = await createObligation({ title: "Blocked on someone else", dueAt: dateOffset(-3) });
    await markObligationWaiting(obligation.id);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    await expect.element(screen.getByText(/Blocked on someone else/)).toBeVisible();
  });

  it("a PLANNED_TODAY obligation earns an Attention slot", async () => {
    await createObligation({ title: "Write the report", plannedAt: dateOffset(0) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Attention", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    await expect.element(screen.getByText(/Write the report/)).toBeVisible();
  });

  it("shows explicit Mission context only after the linked headline commitment is expanded", async () => {
    const mission = await createMission({ title: "Build a durable career" });
    await createObligation({ title: "Finish certification", missionId: mission.id, plannedAt: dateOffset(0) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    expect(screen.getByText("Mission: Build a durable career", { exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await expect.element(screen.getByText("Mission: Build a durable career", { exact: true })).toBeVisible();
  });

  it("leaves a standalone headline commitment unchanged when expanded", async () => {
    await createObligation({ title: "Renew passport", plannedAt: dateOffset(0) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();

    expect(screen.getByText(/^Mission:/).elements()).toHaveLength(0);
  });

  it("keeps an archived Mission's linked obligation out of current TODAY context", async () => {
    const mission = await createMission({ title: "Former direction" });
    await createObligation({ title: "Close remaining loop", missionId: mission.id, plannedAt: dateOffset(0) });
    await archiveMission(mission.id);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    expect(screen.getByRole("button", { name: "Open COMMITMENT" }).elements()).toHaveLength(0);
    expect(screen.getByText("Mission: Former direction (archived)", { exact: true }).elements()).toHaveLength(0);
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
