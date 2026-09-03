import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import {
  startDay,
  endDay,
  submitCheckIn,
  startReset,
  startShiftDown,
  captureItem,
  logSleep,
  rateOutcome,
  recordRecommendation,
  setWorkContext,
  markWorkEnded,
  enableMinimumDay,
  logWater,
} from "../../src/application/commands";
import { byTimeThenSeq } from "../../src/application/queries";
import { archiveMission, createMission, createObligation, markObligationWaiting } from "../../src/application/intentCommands";
import { getObligation } from "../../src/application/intentQueries";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import type { ScheduledContext } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";
import { db } from "../../src/persistence/db";
import {
  getCurrentOperationalContext,
  type CurrentOperationalContext,
} from "../../src/application/currentContextQueries";
import { getActiveDay } from "../../src/application/queries";
import type { BeyondDay } from "../../src/domain/common/types";
import { startWorkout } from "../../src/application/trainCommands";

/**
 * Current Operational Context V1: getCurrentOperationalContext is
 * module-mocked so the async-ownership tests below can control retrieval
 * timing with deferred promises rather than racing real Dexie I/O. Every
 * other describe block in this file needs the real composed behavior, so
 * a per-test beforeEach resets the mock to delegate straight through to
 * it — only the async-ownership tests override that default per-test.
 * Same pattern as tests/browser/SearchScreen.test.tsx's searchAll mock.
 */
vi.mock("../../src/application/currentContextQueries", () => ({ getCurrentOperationalContext: vi.fn() }));

/**
 * refresh() lifecycle correction: getActiveDay() is also module-mocked
 * (partially — every other export of application/queries stays real) so
 * the async-ownership tests can control ITS resolution order directly,
 * not just getCurrentOperationalContext()'s. The root defect this guards
 * against was refresh() only capturing request ownership after its
 * getActiveDay() await, letting an older refresh whose read simply
 * resolves later regress `day`/`currentContext` — so these tests need to
 * be able to make an older refresh's getActiveDay() settle after a newer
 * refresh's, deterministically.
 */
vi.mock("../../src/application/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/queries")>();
  return { ...actual, getActiveDay: vi.fn() };
});

const currentContextMock = vi.mocked(getCurrentOperationalContext);
let realGetCurrentOperationalContext: typeof getCurrentOperationalContext;
const getActiveDayMock = vi.mocked(getActiveDay);
let realGetActiveDay: typeof getActiveDay;

beforeAll(async () => {
  const actual = await vi.importActual<typeof import("../../src/application/currentContextQueries")>(
    "../../src/application/currentContextQueries",
  );
  realGetCurrentOperationalContext = actual.getCurrentOperationalContext;
  const actualQueries = await vi.importActual<typeof import("../../src/application/queries")>(
    "../../src/application/queries",
  );
  realGetActiveDay = actualQueries.getActiveDay;
});

beforeEach(() => {
  // mockClear() resets call history (so a later test's "has it been called
  // yet" checks aren't spuriously satisfied by a prior test's residual
  // calls) without disturbing per-test mockReturnValueOnce/
  // mockImplementationOnce queuing done later in each test body.
  currentContextMock.mockClear();
  currentContextMock.mockImplementation((activeDay, now) => realGetCurrentOperationalContext(activeDay, now));
  getActiveDayMock.mockClear();
  getActiveDayMock.mockImplementation(() => realGetActiveDay());
});

/** A promise whose settlement a test controls, standing in for real Dexie retrieval timing. */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function trackUnhandledRejections() {
  const reasons: unknown[] = [];
  const onUnhandledRejection = (event: PromiseRejectionEvent) => reasons.push(event.reason);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return {
    reasons,
    async settle() {
      await new Promise((r) => setTimeout(r, 50));
    },
    stop() {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    },
  };
}

const FIXED_PREDICTION: ScheduledContext = { week: "A", todayIsScheduledWorkDay: true, phase: "SCHEDULED_SHIFT" };

async function submitCapture(screen: Awaited<ReturnType<typeof render>>, text: string) {
  await screen.getByPlaceholder("Capture a thought...").fill(text);
  await screen.getByRole("button", { name: "CAPTURE" }).click();
}

/**
 * Harvest Checkpoint 4: real-browser acceptance layer for TODAY —
 * exactly the surfaces Checkpoints 2/3 (COMMAND 3.0) changed most.
 * Real Dexie against real Chromium IndexedDB (see setup.ts), the same
 * application-layer commands the app itself uses to seed state — never
 * hand-constructed DOM fixtures standing in for real domain behavior.
 */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const YELLOW: CheckInValues = { energy: 2, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
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
  it("gives NO ACTION REQUIRED a quiet field before Support with no Attention section", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Support", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("No action required", { exact: true })).toBeVisible();
    expect(screen.getByText("Operate", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
    expect(document.querySelector(".today-field")?.getAttribute("data-field-state")).toBe("quiet");
    const allClear = document.querySelector(".all-clear");
    const support = screen.getByText("Support", { exact: true }).element();
    expect(allClear).not.toBeNull();
    expect(allClear!.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(parseFloat(getComputedStyle(allClear!).minHeight)).toBeGreaterThan(200);
  });

  it("runs the truthful hydration loop, confirms mechanically, then recedes to quiet", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await enableMinimumDay(day.id);
    await logWater(day.id, 28);
    const onOpenBody = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} />);

    await screen.getByRole("button", { name: "Open MINIMUM DAY" }).click();
    await expect.element(screen.getByRole("heading", { name: "Record what you drank" })).toBeVisible();
    expect(document.querySelector(".today-field")?.getAttribute("data-field-state")).toBe("earned");
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).filter((event) => event.type === "WATER_LOGGED")).toHaveLength(1);

    await screen.getByRole("button", { name: "+12 OZ" }).click();

    await expect.element(screen.getByText("12 oz recorded.", { exact: true })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Record what you drank" }).elements()).toHaveLength(0);
    await expect.element(screen.getByText("No action required", { exact: true })).toBeVisible();
    expect(document.querySelector(".today-field")?.getAttribute("data-field-state")).toBe("quiet");
    const waterEvents = (await db.events.where("beyondDayId").equals(day.id).toArray())
      .filter((event) => event.type === "WATER_LOGGED")
      .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
    expect(waterEvents).toHaveLength(2);
    expect(waterEvents.at(-1)?.payload).toMatchObject({ amountOz: 12 });

    await screen.getByRole("button", { name: "CORRECT IN BODY" }).click();
    expect(onOpenBody).toHaveBeenCalledOnce();
  });

  it("promotes missing state input without manufacturing an Engine action", async () => {
    await startDay();
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("Check in when you can", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/no current state input/i)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "ALL GOOD" })).toBeVisible();
  });

  it("expands one manual check-in surface and recedes it after quick resolution", async () => {
    await startDay();
    const screen = await render(<TodayScreen />);

    await screen.getByRole("button", { name: "MANUAL CHECK-IN" }).click();
    expect(screen.getByRole("button", { name: "ALL GOOD" }).elements()).toHaveLength(1);
    await expect.element(screen.getByText(/nothing here is filled in for you/i)).toBeVisible();

    await screen.getByRole("button", { name: "ALL GOOD" }).click();
    await expect.element(screen.getByText(/Last check-in: Energy 4/i)).toBeVisible();
    expect(screen.getByText(/nothing here is filled in for you/i).elements()).toHaveLength(0);
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);
  });
});

describe("TodayScreen (real browser) — accepted recommendation handoff", () => {
  it("records acceptance without execution, then focuses the existing SHIFT DOWN executor", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);

    expect(screen.getByText("GO TO SHIFT DOWN", { exact: true }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "I'll do this" }).click();
    await expect.element(screen.getByText("GO TO SHIFT DOWN", { exact: true })).toBeVisible();
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).some((event) => event.type === "SHIFT_DOWN_STARTED")).toBe(false);

    await screen.getByText("GO TO SHIFT DOWN", { exact: true }).click();
    const start = screen.getByRole("button", { name: "START SHIFT DOWN" }).element();
    expect(document.activeElement).toBe(start);
    expect((await db.events.where("beyondDayId").equals(day.id).toArray()).some((event) => event.type === "SHIFT_DOWN_STARTED")).toBe(false);
  });

  it("reconstructs after remount but disappears permanently once matching execution starts", async () => {
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, RED);
    await recordRecommendation(day.id, recommendation);
    let screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("GO TO SHIFT DOWN", { exact: true })).toBeVisible();

    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    await expect.element(screen.getByText("GO TO SHIFT DOWN", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "START SHIFT DOWN" }).click();
    await expect.element(screen.getByText("GO TO SHIFT DOWN", { exact: true })).not.toBeInTheDocument();

    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    expect(screen.getByText("GO TO SHIFT DOWN", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "CANCEL SHIFT DOWN" }).click();
    await expect.element(screen.getByText("SHIFT DOWN IN PROGRESS", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("GO TO SHIFT DOWN", { exact: true }).elements()).toHaveLength(0);
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

  it.each(["GOOD", "NEUTRAL", "BAD"] as const)(
    "records %s after END DAY while no BeyondDay is active",
    async (rating) => {
      const { priorDay, prior, currentDay } = await seedCrossDayFollowUp();
      await logSleep(currentDay.id, 480);
      const screen = await render(<TodayScreen />);

      await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();
      await screen.getByRole("button", { name: "END DAY" }).click();
      await expect.element(screen.getByText("Start your BEYOND Day", { exact: true })).toBeVisible();
      await expect.element(screen.getByText("OUTCOME", { exact: true })).toBeVisible();

      await screen.getByRole("button", { name: rating, exact: true }).click();
      await expect.element(screen.getByText("OUTCOME", { exact: true })).not.toBeInTheDocument();
      const outcomes = await db.outcomes.where("beyondDayId").equals(priorDay.id).toArray();
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]).toMatchObject({ recommendationId: prior.recommendation.id, rating });
    },
  );

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
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toContain("GREEN");
  });
});

describe("TodayScreen // SUIT-001 (COMMAND PRESENCE) — STATUS severity and UNKNOWN capacity", () => {
  it("adds no severity modifier for GREEN capacity", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip!.className).toBe("status-strip status-strip--stacked");
    expect(document.querySelector(".status-strip__capacity")).toBeNull();
  });

  it("adds the yellow severity modifier and colors the capacity segment for YELLOW capacity", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, YELLOW);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Capacity is YELLOW", { exact: false })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip!.className).toBe("status-strip status-strip--stacked status-strip--yellow");
    const capacitySegment = document.querySelector(".status-strip__capacity");
    expect(capacitySegment).not.toBeNull();
    expect(capacitySegment!.textContent).toContain("YELLOW");
  });

  it("adds the red severity modifier and colors the capacity segment for RED capacity", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip!.className).toBe("status-strip status-strip--stacked status-strip--red");
    const capacitySegment = document.querySelector(".status-strip__capacity");
    expect(capacitySegment).not.toBeNull();
    expect(capacitySegment!.textContent).toContain("RED");
  });

  it("states capacity as UNKNOWN, with a neutral dot, before any check-in exists today", async () => {
    await startDay();

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Capacity", { exact: false })).toBeVisible();

    const strip = document.querySelector(".status-strip");
    expect(strip!.className).toBe("status-strip status-strip--stacked");
    expect(strip!.textContent).toContain("Capacity is UNKNOWN");
    expect(document.querySelector(".capacity-dot--unknown")).not.toBeNull();
    // UNKNOWN is not a severity — no warning/red modifier, no bolded segment.
    expect(document.querySelector(".status-strip__capacity")).toBeNull();
  });
});

describe("TodayScreen // SUIT-001 (COMMAND PRESENCE) — section headings and pre-day state", () => {
  it("renders ORIENT and SUPPORT as real level-2 headings, not decorative paragraphs", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { level: 2, name: "Orient", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("heading", { level: 2, name: "Support", exact: true })).toBeVisible();
  });

  it("renders ATTENTION as a real level-2 heading once an item has earned it", async () => {
    const priorDay = await startDay();
    const prior = await submitCheckIn(priorDay.id, GREEN);
    await recordRecommendation(priorDay.id, prior.recommendation);
    const currentDay = await startDay();
    await submitCheckIn(currentDay.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { level: 2, name: "Attention", exact: true })).toBeVisible();
  });

  it("presents the pre-day state as a heading + primary action, not an unlabeled card", async () => {
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { level: 2, name: "Start your BEYOND Day", exact: true })).toBeVisible();
    const startButton = screen.getByRole("button", { name: "START DAY", exact: true }).element();
    expect(startButton.className).toContain("btn-primary");
  });
});

/**
 * Current Operational Context V1 (bounded proof): the STATUS context
 * strip's workContext/schedule/post-shift arguments now come from
 * getCurrentOperationalContext() instead of three separately-assembled
 * pieces of state. These cases use an explicit WORK/OFF fact and an
 * explicit unresolved-post-shift fact specifically because
 * describeContextStrip branches on those before ever consulting the
 * schedule prediction — so the expected wording is exact and
 * clock-independent, not dependent on real "now" at test-run time.
 */
describe("TodayScreen // Current Operational Context V1 — context-strip wording preserved exactly", () => {
  it("renders 'Off today' for an explicit OFF work context", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Start your BEYOND Day", { exact: true })).not.toBeInTheDocument();
    await vi.waitFor(() => {
      const strip = document.querySelector(".status-strip");
      expect(strip?.textContent).toContain("Off today");
    });
  });

  it("renders the unresolved-post-shift wording, preempting the schedule phase, for an explicit unresolved WORK_PERIOD_ENDED fact", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await markWorkEnded(day.id);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Start your BEYOND Day", { exact: true })).not.toBeInTheDocument();
    await vi.waitFor(() => {
      const strip = document.querySelector(".status-strip");
      expect(strip?.textContent).toContain("Working today — shift ended, not yet shifted down");
    });
  });
});

describe("TodayScreen // Current Operational Context V1 — async request ownership", () => {
  it("clears an already-installed context A the moment an accepted refresh adopts day B, instead of rendering it merged with day B while day B's own context is still pending", async () => {
    // 1. Establish active day A.
    const dayA = await startDay();
    await setWorkContext(dayA.id, "WORK", "MANUAL");
    currentContextMock.mockImplementationOnce(() =>
      Promise.resolve({ workContext: "WORK", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION }),
    );

    // 2. Allow context A to resolve successfully and verify it is visibly
    // installed — the prior out-of-order test never got this far (its
    // "older" request never actually won), which was the gap here: this
    // one must actually install day A's context before moving on.
    const screen = await render(<TodayScreen />);
    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Working today");
    });
    expect(document.querySelector(".status-strip")?.textContent).not.toContain("Off today");

    // 3. Transition to active day B.
    await endDay(dayA.id, "EXPLICIT_END_DAY");
    const dayBBeforeWorkContext = await startDay();
    await setWorkContext(dayBBeforeWorkContext.id, "OFF", "MANUAL");
    // Re-read from the real query (bypassing the mock) so the object handed
    // to getActiveDayMock below reflects the just-applied "OFF" write.
    const dayB = (await realGetActiveDay())!;

    // 4/5. Trigger the next refresh and let getActiveDay() for B resolve
    // right away, so TODAY adopts day B...
    getActiveDayMock.mockImplementationOnce(async () => dayB);
    // 6. ...while day B's own context composition is held pending.
    const contextBDeferred = createDeferred<CurrentOperationalContext>();
    currentContextMock.mockImplementationOnce(() => contextBDeferred.promise);

    await submitCapture(screen, "trigger the refresh that adopts day B");

    // 7. While context B is still pending, day A's "Working today" context
    // must NOT still be rendered for day B — the truthful fallback for the
    // newly-adopted day (day.workContext, same path used for a still-
    // loading or failed read) must show instead.
    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    });
    expect(document.querySelector(".status-strip")?.textContent).not.toContain("Working today");

    // 8/9. Resolve context B — the correct, now-current context renders.
    contextBDeferred.resolve({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION });
    await vi.waitFor(() => {
      expect(currentContextMock).toHaveBeenCalledWith({ id: dayB.id, workContext: "OFF" });
    });
    expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    expect(document.querySelector(".status-strip")?.textContent).not.toContain("Working today");
  });

  it("decides ownership by refresh invocation order, not by which refresh's getActiveDay() settles first — an older refresh must never regain ownership of day or currentContext", async () => {
    const dayA = await startDay();
    await setWorkContext(dayA.id, "WORK", "MANUAL");

    // Mount refresh (A) begins first — hold its getActiveDay() pending so
    // it settles LAST, after the second refresh's own getActiveDay().
    const dayADeferred = createDeferred<BeyondDay | undefined>();
    getActiveDayMock.mockImplementationOnce(() => dayADeferred.promise);

    const screen = await render(<TodayScreen />);
    await vi.waitFor(() => expect(getActiveDayMock).toHaveBeenCalledTimes(1));

    // Day transitions entirely outside the still-pending mount refresh.
    await endDay(dayA.id, "EXPLICIT_END_DAY");
    const dayBBeforeWorkContext = await startDay();
    await setWorkContext(dayBBeforeWorkContext.id, "OFF", "MANUAL");
    // Re-read from the real query (bypassing the mock) so the object handed
    // to getActiveDayMock below reflects the just-applied "OFF" write —
    // startDay()'s own return value is a pre-write snapshot.
    const dayB = (await realGetActiveDay())!;

    // Capture refresh (B) begins second but its getActiveDay() resolves
    // FIRST — the exact out-of-order shape the root defect mishandled.
    getActiveDayMock.mockImplementationOnce(async () => dayB);
    // workContext: null makes the status strip fall back to reading
    // `day.workContext` directly (see TodayScreen.tsx's status-strip
    // render), isolating the `day` state assertion below from
    // `currentContext` state.
    currentContextMock.mockImplementationOnce(() =>
      Promise.resolve({ workContext: null, hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION }),
    );

    await submitCapture(screen, "second refresh begins and resolves first");

    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    });
    expect(currentContextMock).toHaveBeenCalledTimes(1);
    expect(currentContextMock).toHaveBeenCalledWith({ id: dayB.id, workContext: "OFF" });

    // Day A's stale getActiveDay() finally resolves, arriving last, with
    // the older day.
    dayADeferred.resolve(dayA);
    await new Promise((r) => setTimeout(r, 50));

    // A must never regain ownership: both `day` and `currentContext` stay
    // on B — A's context composition must never even have started.
    expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    expect(currentContextMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the newer day/context installed and produces no unhandled rejection when an older, superseded refresh's getActiveDay() rejects after a newer refresh already succeeded", async () => {
    const dayA = await startDay();
    const tracker = trackUnhandledRejections();

    const dayADeferred = createDeferred<BeyondDay | undefined>();
    getActiveDayMock.mockImplementationOnce(() => dayADeferred.promise); // mount refresh (A) — pending

    const screen = await render(<TodayScreen />);
    await vi.waitFor(() => expect(getActiveDayMock).toHaveBeenCalledTimes(1));

    await endDay(dayA.id, "EXPLICIT_END_DAY");
    const dayB = await startDay();
    getActiveDayMock.mockImplementationOnce(async () => dayB); // capture refresh (B) — succeeds first
    currentContextMock.mockImplementationOnce(() =>
      Promise.resolve({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION }),
    );

    await submitCapture(screen, "newer refresh installs day/context successfully");
    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    });

    // The older refresh's getActiveDay() finally rejects, well after the
    // newer refresh already installed day B and its context.
    dayADeferred.reject(new Error("stale active-day read failed"));
    await tracker.settle();

    expect(tracker.reasons).toEqual([]);
    expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    tracker.stop();
  });

  it("ignores an older context request that resolves after a newer one from the same refresh cycle, across three overlapping requests in any resolution order", async () => {
    const day = await startDay();
    const first = createDeferred<CurrentOperationalContext>();
    const second = createDeferred<CurrentOperationalContext>();
    const third = createDeferred<CurrentOperationalContext>();
    currentContextMock
      .mockImplementationOnce(() => first.promise) // mount refresh
      .mockImplementationOnce(() => second.promise) // 1st capture's refresh
      .mockImplementationOnce(() => third.promise); // 2nd capture's refresh

    const screen = await render(<TodayScreen />);
    await submitCapture(screen, "first capture");
    await submitCapture(screen, "second capture");

    // Resolve out of request order: second (middle) first, then first
    // (oldest), then third (truly latest) last — only third's value may
    // ever be reflected, regardless of arrival order.
    second.resolve({ workContext: "WORK", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION });
    await new Promise((r) => setTimeout(r, 20));
    first.resolve({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION });
    await new Promise((r) => setTimeout(r, 20));
    third.resolve({ workContext: "WORK", hasUnresolvedPostShift: true, schedulePrediction: FIXED_PREDICTION });

    await vi.waitFor(() => {
      const strip = document.querySelector(".status-strip");
      expect(strip?.textContent).toContain("Working today — shift ended, not yet shifted down");
    });
  });

  it("never lets context assembled for a prior BeyondDay render once a later day is current", async () => {
    const dayA = await startDay();
    const first = createDeferred<CurrentOperationalContext>(); // belongs to day A
    const second = createDeferred<CurrentOperationalContext>(); // belongs to day B
    currentContextMock.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);

    const screen = await render(<TodayScreen />);

    // Day transitions entirely outside the component — refresh() will
    // independently discover day B is now active via its own real
    // getActiveDay() read (unmocked) the next time it runs.
    await endDay(dayA.id, "EXPLICIT_END_DAY");
    await startDay();
    await submitCapture(screen, "after day transition");

    second.resolve({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION });
    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    });

    // Day A's stale context arrives late — must not overwrite day B's.
    first.resolve({ workContext: "WORK", hasUnresolvedPostShift: true, schedulePrediction: FIXED_PREDICTION });
    await new Promise((r) => setTimeout(r, 50));
    const strip = document.querySelector(".status-strip");
    expect(strip?.textContent).toContain("Off today");
    expect(strip?.textContent).not.toContain("shift ended, not yet shifted down");
  });

  it("produces no unhandled rejection when a context request fails, and clears a stale successful context rather than continuing to show it", async () => {
    const day = await startDay();
    const tracker = trackUnhandledRejections();
    currentContextMock
      .mockResolvedValueOnce({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION })
      .mockRejectedValueOnce(new Error("boom"));

    const screen = await render(<TodayScreen />);
    await vi.waitFor(() => {
      expect(document.querySelector(".status-strip")?.textContent).toContain("Off today");
    });

    await submitCapture(screen, "triggers the failing refresh");
    await tracker.settle();

    expect(tracker.reasons).toEqual([]);
    // The prior successful ("Off today") context must not keep being shown
    // as if it were still current once the request that would refresh it
    // has failed — it falls back to the pre-V1 state path instead (day
    // started with the default UNKNOWN work context, so never "Off today").
    expect(document.querySelector(".status-strip")?.textContent).not.toContain("Off today");
    tracker.stop();
  });

  it("does not update state or leak an unhandled rejection when unmounted while a context request is pending (success arrives late)", async () => {
    await startDay();
    const deferred = createDeferred<CurrentOperationalContext>();
    currentContextMock.mockReturnValueOnce(deferred.promise);
    const tracker = trackUnhandledRejections();

    const screen = await render(<TodayScreen />);
    // Wait for the request to actually be in flight (mock called, .then/.catch
    // attached) before unmounting — otherwise unmount could race ahead of
    // refresh()'s own earlier real getActiveDay() await.
    await vi.waitFor(() => expect(currentContextMock).toHaveBeenCalled());
    await screen.unmount();

    deferred.resolve({ workContext: "OFF", hasUnresolvedPostShift: false, schedulePrediction: FIXED_PREDICTION });
    await tracker.settle();
    expect(tracker.reasons).toEqual([]);
    tracker.stop();
  });

  it("does not update state or leak an unhandled rejection when unmounted while a context request is pending (rejection arrives late)", async () => {
    await startDay();
    const deferred = createDeferred<CurrentOperationalContext>();
    currentContextMock.mockReturnValueOnce(deferred.promise);
    const tracker = trackUnhandledRejections();

    const screen = await render(<TodayScreen />);
    await vi.waitFor(() => expect(currentContextMock).toHaveBeenCalled());
    await screen.unmount();

    deferred.reject(new Error("stale failure after unmount"));
    await tracker.settle();
    expect(tracker.reasons).toEqual([]);
    tracker.stop();
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

  it("keeps unrelated Engine guidance in Attention while RESET owns Operate", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED); // recommends SHIFT DOWN
    await startReset(day.id, 3); // a different foreground operation

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("RESET IN PROGRESS", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("ENGINE GUIDANCE", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Stabilize first", { exact: true })).toBeVisible();
  });

  it("names a RESET + SHIFT DOWN conflict and keeps both recovery controls available", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startReset(day.id, 3);
    await startShiftDown(day.id, 10);

    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByText("OPERATION CONFLICT", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "COMPLETE RESET" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "COMPLETE SHIFT DOWN" })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("names an active workout + RESET conflict without concealing either recovery path", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    await startWorkout(day.id, "A", "STANDARD");
    await startReset(day.id, 3);

    const onOpenTrain = vi.fn();
    const screen = await render(<TodayScreen onOpenTrain={onOpenTrain} />);

    await expect.element(screen.getByText("OPERATION CONFLICT", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RESUME WORKOUT" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "COMPLETE RESET" })).toBeVisible();
    await screen.getByRole("button", { name: "RESUME WORKOUT" }).click();
    expect(onOpenTrain).toHaveBeenCalledWith("WORKOUT");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("lets an unstarted SHIFT DOWN picker collapse and reopen without writing session events", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);

    await screen.getByRole("button", { name: "Open SHIFT DOWN" }).click();
    await expect.element(screen.getByRole("button", { name: "START SHIFT DOWN" })).toBeVisible();
    await screen.getByRole("button", { name: "COLLAPSE" }).click();
    await expect.element(screen.getByRole("button", { name: "Open SHIFT DOWN" })).toBeVisible();
    await screen.getByRole("button", { name: "Open SHIFT DOWN" }).click();
    await expect.element(screen.getByRole("button", { name: "START SHIFT DOWN" })).toBeVisible();

    const shiftEvents = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter((event) =>
      event.type.startsWith("SHIFT_DOWN_"),
    );
    expect(shiftEvents).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});

describe("TodayScreen (real browser) — Work Context progressive resolution", () => {
  it("subordinates the answered YES setup and promotes MARK WORK ENDED as the next valid operation", async () => {
    await page.viewport(320, 800);
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Working today", exact: true })).toBeVisible();
    const markEnded = screen.getByRole("button", { name: "MARK WORK ENDED" }).element();
    expect(markEnded.className).toContain("btn-primary");
    expect(screen.getByRole("heading", { name: "Are you working today?" }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "CHANGE WORK CONTEXT" }).click();
    await expect.element(screen.getByRole("heading", { name: "Are you working today?" })).toBeVisible();
    await screen.getByRole("button", { name: "MARK WORK ENDED" }).click();
    await expect.element(screen.getByRole("button", { name: "Open WORK CONTEXT" })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });

  it("keeps the NO path compact and truthful", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("button", { name: "Open WORK CONTEXT" })).toBeVisible();
    await expect.element(screen.getByText("Off today.", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
  });
});

describe("TodayScreen (real browser) — Capture", () => {
  it("is available even with no BeyondDay started at all", async () => {
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByPlaceholder("Capture a thought...")).toBeVisible();
    await expect.element(screen.getByText("Start your BEYOND Day", { exact: true })).toBeVisible();
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

describe("TodayScreen (real browser) — Capture to Obligation handoff", () => {
  it("opens a pre-filled title panel, creates the Obligation, resolves the Capture, and shows confirmation", async () => {
    const capture = await captureItem("renew the car registration");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("renew the car registration")).toBeVisible();

    await screen.getByRole("button", { name: "→ OBLIGATION" }).click();
    const titleInput = screen.getByRole("textbox", { name: "New obligation title" });
    await expect.element(titleInput).toHaveValue("renew the car registration");

    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    await expect.element(screen.getByText(/Obligation created: renew the car registration/)).toBeVisible();
    // The capture row (with its RESOLVE button) is gone — the item is
    // resolved, not merely hidden. The same title now legitimately
    // appears again as the new Obligation's own commitment text, so this
    // checks row identity (RESOLVE), not the text's absence.
    await expect.element(screen.getByRole("button", { name: "RESOLVE" })).not.toBeInTheDocument();

    const obligations = await db.obligations.toArray();
    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({ title: "renew the car registration", status: "OPEN" });
    const stored = await db.captureItems.get(capture.id);
    expect(stored?.status).toBe("RESOLVED");
  });

  it("cancels back to the plain row without creating anything", async () => {
    await captureItem("maybe later");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "→ OBLIGATION" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New obligation title" })).toBeVisible();

    await screen.getByRole("button", { name: "CANCEL" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New obligation title" })).not.toBeInTheDocument();
    await expect.element(screen.getByText("maybe later")).toBeVisible();
    expect(await db.obligations.count()).toBe(0);
  });
});

describe("TodayScreen (real browser) — Capture Intelligence (chrono-node + Compromise date proposals)", () => {
  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  it("pre-fills a detected due date, which is still editable, and carries it into the created Obligation", async () => {
    await captureItem("call the dentist tomorrow");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "→ OBLIGATION" }).click();

    const dueInput = screen.getByLabelText("Due date");
    await expect.element(dueInput).toHaveValue(dateOffset(1));
    await expect.element(screen.getByText(/Detected from/)).toBeVisible();

    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    await expect.element(screen.getByText(/Obligation created:/)).toBeVisible();

    const obligations = await db.obligations.toArray();
    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({ title: "call the dentist tomorrow", dueAt: dateOffset(1) });
  });

  it("does not suggest a date for text with none, and leaves the due field blank/optional", async () => {
    await captureItem("buy milk");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "→ OBLIGATION" }).click();

    const dueInput = screen.getByLabelText("Due date");
    await expect.element(dueInput).toHaveValue("");
    await expect.element(screen.getByText(/Detected from/)).not.toBeInTheDocument();

    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    const obligations = await db.obligations.toArray();
    expect(obligations[0]?.dueAt).toBeUndefined();
  });

  it("lets the operator clear a detected date so it is never silently committed", async () => {
    await captureItem("call the dentist tomorrow");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "→ OBLIGATION" }).click();

    const dueInput = screen.getByLabelText("Due date");
    await expect.element(dueInput).toHaveValue(dateOffset(1));
    await dueInput.fill("");
    await expect.element(screen.getByText(/Detected from/)).not.toBeInTheDocument();

    await screen.getByRole("button", { name: "CREATE OBLIGATION" }).click();
    const obligations = await db.obligations.toArray();
    expect(obligations[0]?.dueAt).toBeUndefined();
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

  it("keeps an ACTIVE workout accessible and returns the operator to TRAIN instead of ending the day", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const workout = await startWorkout(day.id, "A", "STANDARD");
    const openTrain = vi.fn();
    const screen = await render(<TodayScreen onOpenTrain={openTrain} />);

    await screen.getByRole("button", { name: "Open BEYONDDAY" }).click();
    await screen.getByRole("button", { name: "END DAY" }).click();

    await expect.element(screen.getByText(/Workout in progress/)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RETURN TO WORKOUT" })).toBeVisible();
    expect((await db.beyondDays.get(day.id))?.status).toBe("ACTIVE");
    expect((await db.workoutSessions.get(workout.id))?.status).toBe("ACTIVE");

    await screen.getByRole("button", { name: "RETURN TO WORKOUT" }).click();
    expect(openTrain).toHaveBeenCalledWith("WORKOUT");
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

    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
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
    // TODAY's "Orient" section header) — the title itself still shows, in
    // the summary line.
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    await expect.element(screen.getByText(/Someday maybe/)).toBeVisible();
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);
  });

  it("an OVERDUE obligation earns an Attention slot and remains inspectable via VIEW", async () => {
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
    await expect.element(screen.getByRole("button", { name: "SATISFY COMMITMENT" })).toBeVisible();

    await screen.getByRole("button", { name: "VIEW" }).click();
    expect(onViewCommitments).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation, cancellation does not mutate, and confirmation satisfies the exact displayed commitment", async () => {
    const headline = await createObligation({ title: "Renew passport", dueAt: dateOffset(-2) });
    const other = await createObligation({ title: "Write the report", dueAt: dateOffset(0) });
    const day = await startDay();
    const { recommendation } = await submitCheckIn(day.id, GREEN);
    const originalTrace = structuredClone(recommendation.trace);

    const screen = await render(<TodayScreen />);
    expect(screen.getByRole("button", { name: "SATISFY COMMITMENT" }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await screen.getByRole("button", { name: "SATISFY COMMITMENT" }).click();

    await expect.element(screen.getByText(/Mark “Renew passport” satisfied/)).toBeVisible();
    expect((await getObligation(headline.id))!.status).toBe("OPEN");
    await screen.getByRole("button", { name: "CANCEL" }).click();
    expect((await getObligation(headline.id))!.status).toBe("OPEN");

    await screen.getByRole("button", { name: "SATISFY COMMITMENT" }).click();
    await screen.getByRole("button", { name: "CONFIRM SATISFACTION" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Commitment satisfied: Renew passport.");
    expect(document.activeElement).toBe(screen.getByRole("status").element());
    expect((await getObligation(headline.id))!.status).toBe("SATISFIED");
    expect((await getObligation(other.id))!.status).toBe("OPEN");
    await expect.element(screen.getByText(/Write the report/)).toBeVisible();

    const storedRecommendation = await db.recommendations.get(recommendation.id);
    expect(storedRecommendation).toMatchObject(recommendation);
    expect(storedRecommendation!.trace).toEqual(originalTrace);
  });

  it("persists across remount and removes the commitment when no eligible obligation remains", async () => {
    const obligation = await createObligation({ title: "Renew passport", dueAt: dateOffset(-1) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    let screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await screen.getByRole("button", { name: "SATISFY COMMITMENT" }).click();
    await screen.getByRole("button", { name: "CONFIRM SATISFACTION" }).click();
    expect((await getObligation(obligation.id))!.status).toBe("SATISFIED");
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).not.toBeInTheDocument();

    await screen.rerender(<></>);
    await screen.rerender(<TodayScreen />);
    expect(screen.getByRole("button", { name: "Open COMMITMENT" }).elements()).toHaveLength(0);
  });

  it("coalesces duplicate confirmation activation into one canonical satisfaction event", async () => {
    const obligation = await createObligation({ title: "Renew passport", dueAt: dateOffset(-1) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await screen.getByRole("button", { name: "SATISFY COMMITMENT" }).click();
    const confirm = screen.getByRole("button", { name: "CONFIRM SATISFACTION" });
    await Promise.allSettled([confirm.click(), confirm.click()]);

    await expect.element(screen.getByRole("status")).toHaveTextContent("Commitment satisfied: Renew passport.");
    expect(screen.getByRole("alert").elements()).toHaveLength(0);
    const satisfactionEvents = (await db.events.where("obligationId").equals(obligation.id).toArray()).filter(
      (event) => event.type === "OBLIGATION_SATISFIED",
    );
    expect(satisfactionEvents).toHaveLength(1);
  });

  it("reports a stale missing record truthfully, refreshes it away, and does not indicate success", async () => {
    const obligation = await createObligation({ title: "Renew passport", dueAt: dateOffset(-1) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await screen.getByRole("button", { name: "Open COMMITMENT" }).click();
    await screen.getByRole("button", { name: "SATISFY COMMITMENT" }).click();
    await db.obligations.delete(obligation.id);
    await screen.getByRole("button", { name: "CONFIRM SATISFACTION" }).click();

    await expect.element(screen.getByRole("alert")).toHaveTextContent("the commitment no longer exists");
    expect(document.activeElement).toBe(screen.getByRole("alert").element());
    expect(screen.getByText(/Commitment satisfied:/).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Open COMMITMENT" }).elements()).toHaveLength(0);
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

    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();
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

describe("TodayScreen (real browser) — ADVISORY (Intelligence Spine consumption)", () => {
  function dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  it("does not duplicate the headline Commitment's own obligation as a second ADVISORY note", async () => {
    await createObligation({ title: "Write the report", plannedAt: dateOffset(0) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "Open COMMITMENT" })).toBeVisible();
    // Exactly one occurrence of this obligation's text anywhere on the page — the
    // Commitments card's own summary, not a second copy from ADVISORY.
    expect(screen.getByText(/Write the report/).elements().length).toBe(1);
    expect(screen.getByText("ADVISORY", { exact: true }).elements().length).toBe(0);
  });

  it("still surfaces a second, non-headline attention-worthy obligation in ADVISORY", async () => {
    // Commitments only ever names the single headline obligation, plus a plain
    // count of anything else unresolved (see CommitmentsCard.tsx) — the second
    // obligation's own identity is real information that lives only in ADVISORY.
    await createObligation({ title: "Renew passport", dueAt: dateOffset(0) });
    await createObligation({ title: "File expense report", dueAt: dateOffset(0) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);

    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("ADVISORY", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("File expense report — DUE_TODAY", { exact: true })).toBeVisible();
  });
});

describe("TodayScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375, 412])("has no horizontal overflow at %ipx", async (width) => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    await startShiftDown(day.id, 10);
    await captureItem("something captured");

    await page.viewport(width, 800);
    await render(<TodayScreen />);

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

/**
 * VISUAL-001 (Hybrid Foundation) introduced the structural-geometry
 * primitive below, verified against the real rendered DOM/computed
 * styles — not just source inspection. Every previous TodayScreen test
 * above (including the RED/SHIFT-DOWN/CAPTURE narrow-width case just
 * above, which already exercises .command-surface) still passes
 * unmodified, so this only adds coverage for what's new.
 *
 * VISUAL-001's own Red Budget correction (primary actions neutral, not
 * red) is reversed by LAUNCH-VISION-001 (2026-09-03, direct owner
 * ruling) — see docs/UX_DECISIONS.md's "Visual system — red budget"
 * entry. The first test below now asserts the current, opposite truth.
 */
describe("TodayScreen (real browser) — LAUNCH-VISION-001 red CTA & structural geometry", () => {
  it("a primary action is filled with the red accent token, not the old neutral action tokens", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("Orient", { exact: true })).toBeVisible();

    // The GREEN/NO_ACTION_REQUIRED primary action — .btn-primary, per
    // describeRecommendationAction — is the one guaranteed .btn-primary
    // present in this exact state (ALL GOOD is .btn-secondary, not the
    // one under test here).
    const el = screen.getByRole("button", { name: "No action needed" }).element();
    const bg = getComputedStyle(el).backgroundColor;
    // --action-primary-bg is var(--accent) again as of LAUNCH-VISION-001
    // = #c81e2c = rgb(200, 30, 44). The old neutral value it replaced,
    // #f2f2f2 = rgb(242, 242, 242), is what VISUAL-001 had set.
    expect(bg).not.toBe("rgb(242, 242, 242)");
    expect(bg).toBe("rgb(200, 30, 44)");
  });

  it("the dominant recommendation surface (.command-surface) carries the one earned structural cut", async () => {
    // RED capacity's STABILIZE recommendation is genuinely dominant
    // (isDominant && !isAllClear) — unlike GREEN/NO_ACTION_REQUIRED above,
    // which renders the deliberately different .all-clear silhouette.
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "I'll do this" })).toBeVisible();

    const surface = document.querySelector(".command-surface");
    expect(surface).not.toBeNull();
    expect(getComputedStyle(surface!).clipPath).not.toBe("none");
    // The cut is restricted to .command-surface — an ordinary
    // .equipment-row tool (e.g. ALL GOOD / State check-in, both present
    // in this exact GREEN state) must not have picked it up.
    const ordinaryRow = document.querySelector(".equipment-row");
    expect(ordinaryRow).not.toBeNull();
    expect(getComputedStyle(ordinaryRow!).clipPath).toBe("none");
  });

  // VISUAL-002: useRedCapacityOverrideGate is shared by TODAY (declining
  // a RED-capacity STABILIZE recommendation) and TRAIN (starting a
  // STANDARD workout under RED) — exercised here via TODAY's real call
  // site, per the mission's "prove semantic-truth fixes on a real
  // rendered call site" requirement.
  it("declining a RED-capacity STABILIZE recommendation shows a real warning panel with a real danger action and a real secondary CANCEL", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "Not doing this" })).toBeVisible();
    await screen.getByRole("button", { name: "Not doing this" }).click();

    const panel = document.querySelector(".card--warning");
    expect(panel).not.toBeNull();
    expect(getComputedStyle(panel!).borderColor).toBe("rgb(200, 48, 46)"); // --danger: #c8302e

    const proceed = screen.getByRole("button", { name: "PROCEED ANYWAY" }).element();
    expect(proceed.className).toContain("btn-danger");
    expect(proceed.className).not.toContain("btn-primary");

    const cancel = screen.getByRole("button", { name: "CANCEL" }).element();
    expect(cancel.className).toContain("btn-secondary");
    expect(cancel.className).not.toContain("btn-primary");
    // No inline background override left over from the pre-VISUAL-002
    // btn-primary-plus-inline-style pattern.
    expect((cancel as HTMLElement).style.background).toBe("");
  });
});
