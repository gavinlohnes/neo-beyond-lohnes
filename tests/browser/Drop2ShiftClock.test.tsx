import { beforeEach as optionalToolFixture } from "vitest";
import { setHiddenFeature } from "../../src/ui/hiddenFeatures";
optionalToolFixture(() => { for (const feature of ["minimumDay", "smallSteps", "foodLookup"] as const) setHiddenFeature(feature, true); });
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { logSleep, markWorkEnded, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { MAX_PHASE_ROWS } from "../../src/ui/screens/today/shiftClock";
import { DailyControls as TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";
import { openTodayTools } from "./helpers/todayTools";
import type { BeyondDay } from "../../src/domain/common/types";
import { openMealInBody } from "./helpers/mealSheet";

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
    await expect.poll(rows).toEqual(["QUICK_LOG", "TONIGHT"]);
    // No finished sessions yet: no Time-Fit duration, never a guess.
    await expect.element(screen.getByText("A · STANDARD", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("group", { name: "Protein 0 g · Water 0 oz", exact: true })).toBeVisible();
    // The per-schedule one-tap change stays visible.
    await expect.element(screen.getByRole("button", { name: "CHANGE TO OFF" })).toBeVisible();
    // An INTERRUPT-tier advisory (shift protection) is never folded into TOOLS.
    await expect.element(screen.getByText("Shift starts soon. Check water and protein before you go.", { exact: true })).toBeVisible();
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
  it("counts down to the shift end; WATER and MEAL stay one tap away and + LOG reaches the urge log", async () => {
    await saveQuitHabit({ name: "Drinking" });
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 22, 0));
    const onOpenBody = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} />);

    await expect.element(screen.getByRole("heading", { name: "On shift", exact: true })).toBeVisible();
    await expect.poll(stripHeadline).toBe("Shift ends in 8h");
    // TONIGHT-001: QUICK LOG leads (empty until there's a meal or water to repeat); the handoff note follows.
    await expect.poll(rows).toEqual(["QUICK_LOG", "SHIFT_HANDOFF"]);
    // Drop 1.6b: mid-shift, MARK WORK ENDED isn't in Attention (it waits for the last hour) — it's one
    // tap away in TOOLS for a night that ends early. The check-in still isn't prompted (ruling b).
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "Log water" }).click();
    await screen.getByRole("button", { name: "More → BODY water" }).click();
    expect(onOpenBody).toHaveBeenLastCalledWith("water");
    await openMealInBody(screen);
    expect(onOpenBody).toHaveBeenLastCalledWith("meal");
    await screen.getByRole("button", { name: "Open LOG" }).click();
    await screen.getByRole("dialog", { name: "LOG" }).getByRole("button", { name: /^Urge/ }).click();
    expect(onOpenBody).toHaveBeenLastCalledWith("urge");
  });
});

describe("Shift Clock — MARK WORK ENDED timing (Drop 1.6b)", () => {
  it("is in TOOLS mid-shift and in Attention from an hour before the scheduled end", async () => {
    await startDayAt(at(12, 16, 30));
    setClock(at(12, 22, 0));
    let screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "On shift", exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
    // Still a pending action, so WORK CONTEXT shows open inside TOOLS with MARK WORK ENDED.
    await openTodayTools(screen);
    await expect.element(screen.getByRole("button", { name: "MARK WORK ENDED" })).toBeVisible();
    await cleanup();

    setClock(at(13, 4, 59));
    screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "On shift", exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
    await cleanup();

    setClock(at(13, 5, 0));
    screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("button", { name: "MARK WORK ENDED" })).toBeVisible();
  });
});

describe("Shift Clock — after shift (06:00 → main sleep)", () => {
  it("asks one workout question, closes the night, and keeps SHIFT DOWN (MARK WORK ENDED, the plan) and the check-in in TOOLS", async () => {
    await saveQuitHabit({ name: "Drinking", postShiftPlan: "Shower, eat, bed by 9" });
    const day = await startDayAt(at(12, 16, 30));
    // Time-Fit: three finished C sessions (47/48/49 min), then a finished B — so C is next, at ~48 min.
    const session = (id: string, templateId: string, d: number, minutes: number) => ({
      id,
      schemaVersion: 1,
      // Earlier lived days: a session finished today would answer the workout call (TONIGHT-001).
      beyondDayId: `earlier-${d}`,
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
    // TONIGHT-001: RECOVER asks one question; SHIFT DOWN (with MARK WORK ENDED and the plan) and the
    // check-in wait one tap away in TOOLS, and neither is repeated in Attention.
    await expect.poll(rows).toEqual(["WORKOUT_CALL", "NIGHT_CLOSED", "MAIN_SLEEP"]);
    expect(screen.getByRole("button", { name: "MARK WORK ENDED" }).elements()).toHaveLength(0);
    expect(screen.getByText("Check in when you can", { exact: true }).elements()).toHaveLength(0);
    await expect.element(screen.getByText("Full session · ~48 min", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "LOG MAIN SLEEP" }).click();
    expect(onOpenBody).toHaveBeenCalledWith("sleep");

    await openTodayTools(screen);
    await screen.getByRole("button", { name: "Open SHIFT DOWN" }).click();
    await expect.element(screen.getByText("Your plan: Shower, eat, bed by 9", { exact: true })).toBeVisible();
    // SHIFT DOWN folds MARK WORK ENDED in (TOOLS' WORK CONTEXT card offers it too, as before).
    const shiftDown = screen.getByText("Your plan: Shower, eat, bed by 9", { exact: true }).element().closest("[data-tools-item]") as HTMLElement;
    const markEnded = [...shiftDown.querySelectorAll("button")].filter((button) => button.textContent === "MARK WORK ENDED");
    expect(markEnded).toHaveLength(1);
    markEnded[0]!.click();
    await expect.poll(() => screen.getByRole("button", { name: "MARK WORK ENDED" }).elements().length).toBe(0);

    // Check-in produces the same guidance; the console renders it once.
    await screen.getByRole("button", { name: "CHECK IN FIRST" }).click();
    await screen.getByRole("button", { name: "ALL GOOD" }).click();
    await expect.poll(() => document.querySelector(".console-guidance")?.textContent ?? "").toContain("Shift down after work");
    expect(document.querySelectorAll(".console-guidance")).toHaveLength(1);
    await expect.poll(() => document.querySelector(".workout-call")?.textContent ?? "").toMatch(/Check-in GREEN/);

    // The answer opens TRAIN with the chosen session.
    await screen.getByRole("button", { name: /^TRAIN · C/ }).click();
    await expect.poll(() => onOpenTrain.mock.calls.at(-1)?.[0]).toBe("WORKOUT_STANDARD");
    expect(screen.getByText("Operate", { exact: true }).elements()).toHaveLength(0);
    expect(rows().length).toBeLessThanOrEqual(MAX_PHASE_ROWS);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("ends when main sleep is logged: the rest of the day asks the workout question and offers quick log", async () => {
    const day = await startDayAt(at(12, 16, 30));
    await markWorkEnded(day.id);
    setClock(at(13, 14, 0));
    await logSleep(day.id, 420, "PRIMARY");
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "After sleep", exact: true })).toBeVisible();
    await expect.poll(rows).toEqual(["WORKOUT_CALL", "QUICK_LOG"]);
  });
});

describe("Minimum Day after a YELLOW check-in (Drop 1.6b, amended by TONIGHT-001)", () => {
  it("is no longer offered on TODAY; WATER stays on the first screen", async () => {
    const day = await startDayAt(at(12, 16, 30));
    setClock(at(13, 6, 10));
    await markWorkEnded(day.id);
    setClock(at(13, 6, 20));
    await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 2 });
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Train or sleep?" })).toBeVisible();
    // Owner ruling 2026-10-19: Gavin never uses Minimum Day; it stays reachable in COMMAND → Today tools.
    expect(screen.getByText("Minimum Day is available if it helps.", { exact: true }).elements()).toHaveLength(0);
    await openTodayTools(screen);
    expect(screen.getByRole("button", { name: "Open MINIMUM DAY" }).elements()).toHaveLength(0);
    await document.fonts.ready;
    const actions = document.querySelector(".console-controls") as HTMLElement;
    expect(actions.getBoundingClientRect().bottom).toBeLessThanOrEqual(736);
    expect(await db.events.where("type").equals("MINIMUM_DAY_ENABLED").count()).toBe(0);
  });
});

describe("Shift Clock — day off", () => {
  it("keeps check-in contextual and shows its canonical guidance once in the console; fuel stays above the action row", async () => {
    await startDayAt(at(14, 16, 30));
    setClock(at(14, 17, 0));
    const screen = await render(<TodayScreen />);

    await expect.element(screen.getByRole("heading", { name: "Day off", exact: true })).toBeVisible();
    await expect.poll(rows).toEqual(["WORKOUT_CALL", "QUICK_LOG"]);
    // POLISH-002: the context sentence stays for screen readers; the hero's meta line shows the mode.
    await expect.poll(() => document.querySelector(".status-strip__headline")?.textContent).toBe("Off · per schedule");
    expect(screen.getByRole("group", { name: /^Protein .* · Water/ }).elements()).toHaveLength(1);

    // TONIGHT-001: the check-in waits behind the wake card's CHECK IN FIRST, and guidance shows once.
    await screen.getByRole("button", { name: "CHECK IN FIRST" }).click();
    await screen.getByRole("button", { name: "ALL GOOD" }).click();
    await expect.poll(() => document.querySelector(".console-guidance")?.textContent ?? "").toContain("Nothing urgent. One question below.");
    expect(document.querySelectorAll(".console-guidance")).toHaveLength(1);
    await expect.poll(() => document.querySelector(".workout-call")?.textContent ?? "").toMatch(/Check-in GREEN/);

    // Every tool is one tap away.
    await openTodayTools(screen);
    await expect.element(screen.getByRole("group", { name: "Protein 0 g · Water 0 oz", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open SHIFT DOWN" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open RESET" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open WORK CONTEXT" })).toBeVisible();
    // TONIGHT-001: Minimum Day is reachable from COMMAND → Today tools, not TODAY's own TOOLS.
    expect(screen.getByRole("button", { name: "Open MINIMUM DAY" }).elements()).toHaveLength(0);
    await expect.element(screen.getByPlaceholder("Capture a thought...")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "Open END DAY" })).toBeVisible();
    // The strip's one-tap change is the only one, even with TOOLS open.
    expect(screen.getByRole("button", { name: "CHANGE TO WORKING" }).elements()).toHaveLength(1);
  });
});
