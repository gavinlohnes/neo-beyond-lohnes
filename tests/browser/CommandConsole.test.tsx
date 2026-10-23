import { commandResult } from "./helpers/command";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import Dexie from "dexie";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { startWorkout, logSet } from "../../src/application/trainCommands";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { MAX_PHASE_ROWS } from "../../src/ui/screens/today/shiftClock";
import { db } from "../../src/persistence/db";
import { searchCommand, openTodayTools, revealAllGood } from "./helpers/todayTools";
import { openMealInBody } from "./helpers/mealSheet";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  await page.viewport(360, 800);
  const { id: _id, createdAt: _created, updatedAt: _updated, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Production Command Console", () => {
  for (const [day, hour] of [[12, 17], [12, 22], [13, 7], [14, 17]]) {
    it(`keeps optional controls available without changing phase prompts (${day}/${hour})`, async () => {
      vi.setSystemTime(new Date(2026, 9, day, hour));
      await startDay();
      const screen = await render(<App />);
      for (const name of ["Log water", "Log a meal", "Open LOG"]) {
        await expect.element(screen.getByRole("button", { name })).toBeVisible();
      }
      expect(document.querySelectorAll("[data-shift-clock-row]").length).toBeLessThanOrEqual(MAX_PHASE_ROWS);
      if (day === 12) expect(screen.getByRole("button", { name: "ALL GOOD", exact: true }).elements()).toHaveLength(0);
      expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
      expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
    });
  }

  it("uses the existing water workflow, preserves failed input and undo, then returns through existing navigation", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log water" }).click();
    await screen.getByRole("button", { name: "Custom amount & entries" }).click();
    await expect.poll(() => document.activeElement?.textContent).toBe("+8 oz");
    await screen.getByRole("button", { name: "SHOW MANUAL ENTRY", exact: true }).click();
    await screen.getByRole("spinbutton", { name: "Custom (oz)" }).fill("11");
    const failure = vi.spyOn(db.events, "add").mockRejectedValue(new Error("Disk full"));
    await screen.getByRole("button", { name: "LOG WATER", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    await expect.element(screen.getByRole("spinbutton", { name: "Custom (oz)" })).toHaveValue(11);
    expect(await getEffectiveHydrationTotal(day.id)).toBe(0);
    failure.mockRestore();
    await screen.getByRole("button", { name: "LOG WATER", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(11);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(0);
    await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open LOG" })).toBeVisible();
  });

  it("retains UNKNOWN context without inferring a phase and keeps every workspace reachable", async () => {
    const day = await startDay();
    // Synthetic legacy unanswered day: no real records or Engine rules are changed.
    await db.beyondDays.update(day.id, { workContext: "UNKNOWN" });
    const screen = await render(<App />);
    await expect.poll(() => [...document.querySelectorAll("[data-shift-clock-row]")].map((element) => element.getAttribute("data-shift-clock-row")))
      .toEqual([]);
    // FIELD-AUTHORITY-001: NO READ is said once, by the check-in line, not echoed as STATUS.
    await expect.element(screen.getByRole("button", { name: "CHECK IN", exact: true })).toBeVisible();
    expect(document.querySelector("[data-system-status]")).toBeNull();
    // COMMAND-CENTER-001: TRAIN and BODY through COMMAND's search, COMMAND by its tab.
    for (const destination of ["TRAIN", "BODY", "COMMAND"] as const) {
      if (destination === "COMMAND") await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
      else {
        await searchCommand(screen, destination.toLowerCase());
        await screen.getByRole("button", { name: new RegExp(`^${destination} `) }).click();
      }
      await expect.element(screen.getByRole("button", { name: destination, exact: true })).toHaveAttribute("aria-current", "page");
      // COMMAND's tab returns to the search that was last used there; the others land on their heading.
      if (destination !== "COMMAND") await expect.poll(() => document.activeElement?.tagName).toBe("H1");
      await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    }
  });

  for (const [level, values] of [
    ["GREEN", { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 }],
    ["AMBER", { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 2 }],
    ["RED", { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 5 }],
  ] as const) {
    it(`keeps genuine ${level} System Status and one canonical guidance surface`, async () => {
      const day = await startDay();
      await submitCheckIn(day.id, values);
      const screen = await render(<App />);
      await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
      // FIELD-AUTHORITY-001: TODAY echoes the level only when no real recommendation is already speaking.
      const realNext = document.querySelector(".console-guidance .all-clear") === null;
      if (level !== "GREEN" && !realNext) await expect.poll(() => document.querySelector("[data-system-status]")?.getAttribute("data-system-status")).toBe(level);
      if (realNext) expect(document.querySelector("[data-system-status]")).toBeNull();
      await (await commandResult(screen, "SYSTEMS")).click();
      await expect.element(screen.getByRole("region", { name: "STATE" }).getByText(level, { exact: true }).first()).toBeVisible();
      await expect.poll(() => document.querySelectorAll(".console-guidance").length).toBe(1);
      expect(document.querySelectorAll(".today-field .command-surface").length).toBeLessThanOrEqual(1);
    });
  }

  it("keeps a single canonical recommendation when tools and inspection open", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<App />);
    await expect.element(screen.getByRole("region", { name: "Next action" })).toBeVisible();
    await screen.getByText("See the reasoning", { exact: true }).click();
    await openTodayTools(screen);
    await expect.poll(() => [...document.querySelectorAll<HTMLElement>(".console-guidance")].filter(el => el.getClientRects().length).length).toBe(1);
    // TONIGHT-001: the day-off workout question sits below, so the all-clear says so.
    expect(screen.getByRole("heading", { name: "Nothing urgent. One question below.", exact: true }).elements()).toHaveLength(1);
    expect(document.querySelectorAll(".today-field .command-surface").length).toBeLessThanOrEqual(1);
  });

  for (const width of [320, 360, 412]) {
    it(`presents state, recommendation, and immediate operations in operator order at ${width}px`, async () => {
      await page.viewport(width, 800);
      const day = await startDay();
      await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
      const screen = await render(<App />);

      await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();

      const situation = document.querySelector<HTMLElement>(".today-situation");
      const guidance = document.querySelector<HTMLElement>(".console-guidance");
      const operations = document.querySelector<HTMLElement>('.redesign-today > section[aria-label="Log"]');
      expect(situation).not.toBeNull();
      expect(guidance).not.toBeNull();
      expect(operations).not.toBeNull();
      expect(situation!.compareDocumentPosition(operations!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // FIELD-AUTHORITY-001: a real recommendation leads the log row; an all-clear follows it.
      const allClear = guidance!.querySelector(".all-clear") !== null;
      const [first, second] = allClear ? [operations!, guidance!] : [guidance!, operations!];
      expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // SUIT-001: SYSTEMS replaces the System Status line in the same place.
      expect(document.querySelector(".systems-line")).toBeNull();
      await expect.element(screen.getByRole("region", { name: "Next action" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "Immediate operations", exact: true }).elements()).toHaveLength(0);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    });
  }

  it("reflows a wider standing-context control without horizontal overflow at 320px", async () => {
    await page.viewport(320, 800);
    await startDay();
    const screen = await render(<App />);
    await (await commandResult(screen, "TODAY TOOLS")).click();
    const standing = screen.getByRole("button", { name: "CHANGE TO WORKING", exact: true });
    await expect.element(standing).toBeVisible();
    // Model wider fallback-font metrics observed in CI, without waiting
    // for font loading or weakening the actual viewport assertion.
    (standing.element() as HTMLButtonElement).style.minWidth = "232px";
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect(standing.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("does not abandon a TODAY write through same-tick persistent controls", async () => {
    // COMMAND-CENTER-001: QUICK_LOG's +8 oz is gone; TODAY's own quick check-in is the in-flight write.
    const day = await startDay();
    const screen = await render(<App />);
    // TONIGHT-001: on a day off the check-in opens from the wake card.
    await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
    const controls = ["Log a meal", "Log water", "Open LOG"].map(name => screen.getByRole("button", { name, exact: true }).element() as HTMLButtonElement);
    await screen.getByRole("button", { name: "CHECK IN", exact: true }).click();
    await revealAllGood(screen);
    await expect.element(screen.getByRole("button", { name: "ALL GOOD" })).toBeVisible();
    const original = db.events.add.bind(db.events);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const write = vi.spyOn(db.events, "add").mockImplementation((...args) => Dexie.Promise.resolve(gate).then(() => original(...args)));
    try {
      (screen.getByRole("button", { name: "ALL GOOD" }).element() as HTMLButtonElement).click();
      controls.forEach(button => button.click());
      await expect.element(screen.getByRole("dialog", { name: "CHECK IN", exact: true })).toBeVisible();
      expect(screen.getByRole("dialog").elements()).toHaveLength(1);
      await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    } finally { release(); }
    await expect.poll(async () => db.events.where("type").equals("STATE_CHECKED_IN").count()).toBe(1);
    // TONIGHT-001: on a day off the check-in lives in TOOLS; the wake card shows it as evidence.
    await expect.poll(() => document.querySelector(".console-guidance")?.textContent ?? "").not.toBe("");
    expect(await db.checkIns.where("beyondDayId").equals(day.id).count()).toBe(1);
    write.mockRestore();
  });

  it("keeps an unfinished meal through SYSTEM navigation without a discard dialog", async () => {
    await startDay();
    const screen = await render(<App />);
    await openMealInBody(screen);
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished dinner");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    const confirm = vi.spyOn(window, "confirm");
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "COMMAND", exact: true })).toHaveAttribute("aria-current", "page");
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    // Review B1: primary navigation ends the shortcut's focused view; the draft stays.
    await expect.element(screen.getByRole("heading", { name: "BODY", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await openMealInBody(screen);
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("preserves the exact active workout across SYSTEM navigation and visible resumption", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const workout = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, workout.id, "machine-chest-press", 1, 110, 10);
    const screen = await render(<App />);
    // Startup continuity still opens TRAIN automatically.
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "RESUME WORKOUT" })).toBeVisible();
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      // Measure the resting layout, as the axe checks below already do. The
      // 180ms tab entrance translates the whole pane by up to 6px; sampling
      // that in flight falsely reports clipping (also reproduced on master).
      for (const animation of document.getElementById("workspace-TODAY")!.getAnimations({ subtree: true })) {
        if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
      }
      const resume = screen.getByRole("button", { name: "RESUME WORKOUT" }).element().getBoundingClientRect();
      expect(resume.bottom).toBeLessThanOrEqual(document.querySelector(".shell-nav")!.getBoundingClientRect().top);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    await searchCommand(screen, "history");
    await screen.getByRole("button", { name: /^HISTORY Every record/ }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // HISTORY" })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "RESUME WORKOUT" }).click();
    expect((await getActiveWorkoutSession())?.id).toBe(workout.id);
    expect(await db.performedSets.where("sessionId").equals(workout.id).count()).toBe(1);
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  });

  for (const width of [320, 360, 412]) {
    it(`reaches TODAY TOOLS from COMMAND by keyboard with a readable layout at ${width}px`, async () => {
      // COMMAND-CENTER-001: the retired SYSTEM dialog's keyboard path is COMMAND's search.
      await page.viewport(width, 800);
      await startDay();
      const screen = await render(<App />);
      const search = await searchCommand(screen, "tools");
      await expect.element(screen.getByRole("button", { name: /^TODAY TOOLS / })).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const control of document.querySelectorAll<HTMLButtonElement>(".console-controls button, .command-result, .command-search input")) {
        if (control.getClientRects().length) expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      (search.element() as HTMLInputElement).focus();
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByRole("button", { name: "COMMAND", exact: true })).toHaveAttribute("aria-current", "page");
      await expect.poll(() => document.activeElement).toBe(screen.getByRole("button", { name: "BACK TO COMMAND", exact: true }).element());
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "BACK TO COMMAND", exact: true }).element());
      await expect.element(screen.getByRole("button", { name: "Close TOOLS" })).toBeVisible();
      // The query is still there on return to COMMAND.
      await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
      await expect.element(screen.getByRole("searchbox", { name: "Find a screen or action" })).toHaveValue("tools");
    });
  }
});
