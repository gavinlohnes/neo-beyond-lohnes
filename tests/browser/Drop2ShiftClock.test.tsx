import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { logSleep, markWorkEnded, startDay, updateSchedulePattern } from "../../src/application/commands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { MAX_PHASE_ROWS } from "../../src/ui/screens/today/shiftClock";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";
import { openTodayTools } from "./helpers/todayTools";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * Drop 2 — Shift Clock, one real-browser pass per phase. The clock (Date
 * only) is pinned for each test; the owner's saved schedule makes Mon Oct
 * 12 2026 a Week A work night (18:00–06:00) and Wed Oct 14 a day off.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

async function saveOwnersSchedule() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
}

function setClock(when: Date) {
  vi.setSystemTime(when);
}

async function startDayAt(when: Date): Promise<BeyondDay> {
  setClock(when);
  return startDay();
}

function rows(): string[] {
  return [...document.querySelectorAll("[data-shift-clock-row]")].map((el) => el.getAttribute("data-shift-clock-row")!);
}

function stripHeadline(): string {
  return document.querySelector(".status-strip__headline")?.textContent ?? "";
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await page.viewport(360, 800);
  await saveOwnersSchedule();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Shift Clock — before shift (16:30 → 18:00)", () => {
  it("counts down to the shift and shows tonight's workout and fuel", async () => {
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 16, 40));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Before shift", exact: true })).toBeVisible();
    await expect.poll(stripHeadline).toBe("Shift in 1h 20m");
    await expect.poll(rows).toEqual(["TONIGHT", "FUEL"]);
    // No finished sessions yet: no Time-Fit duration, never a guess.
    await expect.element(screen.getByText("A · STANDARD", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Protein 0 g · Water 0 oz", { exact: true })).toBeVisible();
    // The per-schedule one-tap change stays visible.
    await expect.element(screen.getByRole("button", { name: "CHANGE TO OFF" })).toBeVisible();
    // An INTERRUPT-tier advisory (shift protection) is never folded into TOOLS.
    await expect.element(screen.getByText(/Shift is coming up and hydrate and protein still haven't been logged today/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Close TOOLS" }).elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("asks for nothing before the shift: no MARK WORK ENDED, no check-in prompt — the check-in waits in TOOLS (owner rulings a, b)", async () => {
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 16, 40));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Before shift", exact: true })).toBeVisible();
    await expect.poll(stripHeadline).toBe("Shift in 1h 20m");
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);
    expect(screen.getByText("Attention", { exact: true }).elements()).toHaveLength(0);

    await openTodayTools(screen);
    await expect.element(screen.getByRole("button", { name: "ALL GOOD" })).toBeVisible();
  });

  it("the TOOLS summary names only what's inside", async () => {
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 16, 40));
    const screen = await render(<TodayScreen />);

    const toolsRow = screen.getByRole("button", { name: "Open TOOLS" });
    await expect.element(toolsRow).toBeVisible();
    // No check-in yet, so no recommendation: SHIFT DOWN and RESET have nothing to offer, and aren't listed.
    await expect.poll(() => toolsRow.element().textContent ?? "").toContain("capture");
    expect(toolsRow.element().textContent).not.toMatch(/shift down|reset/i);
  });
});

describe("Shift Clock — on shift (18:00 → 06:00)", () => {
  it("counts down to the shift end and logs water in one tap", async () => {
    await saveQuitHabit({ name: "Drinking" });
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 22, 0));
    const onOpenBody = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} />);

    await expect.element(screen.getByRole("heading", { name: "On shift", exact: true })).toBeVisible();
    await expect.poll(stripHeadline).toBe("Shift ends in 8h");
    await expect.poll(rows).toEqual(["QUICK_LOG", "FUEL"]);
    // Once the shift has started MARK WORK ENDED is offered (ruling a); the check-in still isn't prompted (ruling b).
    await expect.element(screen.getByRole("button", { name: "MARK WORK ENDED" })).toBeVisible();
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "Log 8 oz water" }).click();
    await expect.element(screen.getByText("8 oz recorded.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Protein 0 g · Water 8 oz", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    expect(onOpenBody).toHaveBeenLastCalledWith("meal");
    await screen.getByRole("button", { name: "Log an urge in BODY" }).click();
    expect(onOpenBody).toHaveBeenLastCalledWith("urge");
  });
});

describe("Shift Clock — after shift (06:00 → main sleep)", () => {
  it("leads with SHIFT DOWN (MARK WORK ENDED folded in, with the plan), then check-in, workout and main sleep", async () => {
    await saveQuitHabit({ name: "Drinking", postShiftPlan: "Shower, eat, bed by 9" });
    const day = await startDayAt(at(12, 16, 30));
    // Time-Fit: three finished C sessions (47/48/49 min), then a finished B — so C is next, at ~48 min.
    const session = (id: string, templateId: string, d: number, minutes: number) => ({
      id,
      schemaVersion: 1,
      beyondDayId: day.id,
      templateId,
      sessionType: "STANDARD",
      status: "COMPLETED",
      startedAt: at(d, 7).toISOString(),
      endedAt: new Date(at(d, 7).getTime() + minutes * 60_000).toISOString(),
    });
    await db.workoutSessions.bulkAdd([session("c1", "C", 1, 47), session("c2", "C", 3, 48), session("c3", "C", 5, 49), session("b1", "B", 7, 50)]);

    setClock(at(13, 7, 0));
    const onOpenBody = vi.fn();
    const onOpenTrain = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} onOpenTrain={onOpenTrain} />);

    await expect.element(screen.getByRole("heading", { name: "After shift", exact: true })).toBeVisible();
    await expect.poll(rows).toEqual(["SHIFT_DOWN", "CHECK_IN", "WORKOUT", "MAIN_SLEEP"]);
    await expect.element(screen.getByText("Your plan: Shower, eat, bed by 9", { exact: true })).toBeVisible();
    // MARK WORK ENDED appears once — folded into SHIFT DOWN, not repeated in Attention.
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(1);
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByText("C · STANDARD · ~48 min", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "OPEN TRAIN" }).click();
    expect(onOpenTrain).toHaveBeenCalledWith("WORKOUT");
    await screen.getByRole("button", { name: "LOG MAIN SLEEP" }).click();
    expect(onOpenBody).toHaveBeenCalledWith("sleep");

    // Mark work ended, then check in: the check-in row becomes the recommendation (SHIFT DOWN), in place.
    await screen.getByRole("button", { name: "MARK WORK ENDED" }).click();
    await expect.poll(() => screen.getByRole("button", { name: "MARK WORK ENDED" }).elements().length).toBe(0);
    await screen.getByRole("button", { name: "ALL GOOD" }).click();
    const checkInRow = document.querySelector('[data-shift-clock-row="CHECK_IN"]') as HTMLElement;
    await expect.poll(() => checkInRow.textContent ?? "").toContain("Shift down after work");
    await expect.poll(() => checkInRow.textContent ?? "").toMatch(/Checked in/);
    expect(screen.getByText("Operate", { exact: true }).elements()).toHaveLength(0);
    expect(rows().length).toBeLessThanOrEqual(MAX_PHASE_ROWS);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("ends when main sleep is logged: the rest of the day shows check-in and workout", async () => {
    const day = await startDayAt(at(12, 16, 30));
    await markWorkEnded(day.id);
    setClock(at(13, 14, 0));
    await logSleep(day.id, 420, "PRIMARY");
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "After sleep", exact: true })).toBeVisible();
    await expect.poll(rows).toEqual(["CHECK_IN", "WORKOUT"]);
  });
});

describe("Shift Clock — day off", () => {
  it("puts the check-in on top until it's done, then shows the recommendation in its place; fuel waits in TOOLS", async () => {
    await startDayAt(at(14, 16, 30));
    setClock(at(14, 17, 0));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Day off", exact: true })).toBeVisible();
    await expect.poll(rows).toEqual(["CHECK_IN", "WORKOUT"]);
    await expect.element(screen.getByText("Off · per schedule", { exact: true })).toBeVisible();
    expect(screen.getByText(/^Protein .* · Water/).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "ALL GOOD" }).click();
    const checkInRow = document.querySelector('[data-shift-clock-row="CHECK_IN"]') as HTMLElement;
    await expect.poll(() => checkInRow.textContent ?? "").toContain("No action required");

    // Every tool is one tap away.
    await openTodayTools(screen);
    await expect.element(screen.getByText(/^Protein 0 g · Water 0 oz$/)).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open SHIFT DOWN" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open RESET" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open WORK CONTEXT" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open MINIMUM DAY" })).toBeVisible();
    await expect.element(screen.getByPlaceholder("Capture a thought...")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open BEYONDDAY" })).toBeVisible();
    // The strip's one-tap change is the only one, even with TOOLS open.
    expect(screen.getByRole("button", { name: "CHANGE TO WORKING" }).elements()).toHaveLength(1);
  });
});
