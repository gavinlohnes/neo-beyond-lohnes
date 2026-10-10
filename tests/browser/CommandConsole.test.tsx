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
      for (const name of ["Log water in BODY", "Log a meal in BODY", "Open SYSTEM"]) {
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
    await screen.getByRole("button", { name: "Log water in BODY" }).click();
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
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open SYSTEM" })).toBeVisible();
  });

  it("retains UNKNOWN context without inferring a phase and keeps every workspace reachable", async () => {
    const day = await startDay();
    // Synthetic legacy unanswered day: no real records or Engine rules are changed.
    await db.beyondDays.update(day.id, { workContext: "UNKNOWN" });
    const screen = await render(<App />);
    await expect.poll(() => [...document.querySelectorAll("[data-shift-clock-row]")].map((element) => element.getAttribute("data-shift-clock-row")))
      .toEqual(["WORK_QUESTION", "CHECK_IN", "WORKOUT"]);
    await expect.poll(() => document.querySelector("[data-system-status]")?.getAttribute("data-system-status")).toBe("NO_READ");
    for (const destination of ["TRAIN", "BODY", "MORE"] as const) {
      await screen.getByRole("button", { name: "Open SYSTEM" }).click();
      await screen.getByRole("dialog").getByRole("button", { name: new RegExp(`^${destination} `) }).click();
      await expect.element(screen.getByRole("button", { name: destination, exact: true })).toHaveAttribute("aria-current", "page");
      await expect.poll(() => document.activeElement?.tagName).toBe("H1");
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
      await render(<App />);
      await expect.poll(() => document.querySelector("[data-system-status]")?.getAttribute("data-system-status")).toBe(level);
      await expect.poll(() => document.querySelectorAll(".console-guidance").length).toBe(1);
      expect(document.querySelectorAll(".today-field .command-surface").length).toBeLessThanOrEqual(1);
    });
  }

  it("keeps a single canonical recommendation when tools and inspection open", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<App />);
    await expect.element(screen.getByRole("region", { name: "Current recommendation" })).toBeVisible();
    await screen.getByText("How BEYOND decided", { exact: true }).click();
    await screen.getByRole("button", { name: "Open TOOLS" }).click();
    expect(document.querySelectorAll(".console-guidance")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "No action required", exact: true }).elements()).toHaveLength(1);
    expect(document.querySelectorAll(".today-field .command-surface").length).toBeLessThanOrEqual(1);
  });

  for (const width of [320, 360, 412]) {
    it(`presents state, recommendation, and immediate operations in operator order at ${width}px`, async () => {
      await page.viewport(width, 800);
      const day = await startDay();
      await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
      const screen = await render(<App />);

      await expect.element(screen.getByText("CURRENT STATE", { exact: true })).toBeVisible();

      const situation = document.querySelector<HTMLElement>(".today-situation");
      const guidance = document.querySelector<HTMLElement>(".console-guidance");
      const operations = document.querySelector<HTMLElement>(".console-operations");
      expect(situation).not.toBeNull();
      expect(guidance).not.toBeNull();
      expect(operations).not.toBeNull();
      expect(situation!.compareDocumentPosition(guidance!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(guidance!.compareDocumentPosition(operations!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await expect.element(screen.getByText("SYSTEM STATUS", { exact: true })).toBeVisible();
      await expect.element(screen.getByText("PRIMARY RECOMMENDATION", { exact: true })).toBeVisible();
      await expect.element(screen.getByRole("heading", { name: "Immediate operations", exact: true })).toBeVisible();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    });
  }

  it("reflows a wider standing-context control without horizontal overflow at 320px", async () => {
    await page.viewport(320, 800);
    await startDay();
    const screen = await render(<App />);
    const standing = screen.getByRole("button", { name: "CHANGE TO WORKING", exact: true });
    await expect.element(standing).toBeVisible();
    // Model wider fallback-font metrics observed in CI, without waiting
    // for font loading or weakening the actual viewport assertion.
    (standing.element() as HTMLButtonElement).style.minWidth = "232px";
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect(standing.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("does not abandon a TODAY write through same-tick persistent controls", async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 22));
    const day = await startDay();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "Log 8 oz water" })).toBeVisible();
    const original = db.events.add.bind(db.events);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const write = vi.spyOn(db.events, "add").mockImplementation((...args) => Dexie.Promise.resolve(gate).then(() => original(...args)));
    try {
      (screen.getByRole("button", { name: "Log 8 oz water" }).element() as HTMLButtonElement).click();
      (screen.getByRole("button", { name: "Log a meal in BODY" }).element() as HTMLButtonElement).click();
      (screen.getByRole("button", { name: "Log water in BODY" }).element() as HTMLButtonElement).click();
      (screen.getByRole("button", { name: "Open SYSTEM" }).element() as HTMLButtonElement).click();
      expect(screen.getByRole("dialog").elements()).toHaveLength(0);
      await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    } finally { release(); }
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(8);
    await expect.element(screen.getByText("8 oz recorded.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
    write.mockRestore();
  });

  it("keeps an unfinished meal when SYSTEM navigation's discard confirmation is canceled", async () => {
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished dinner");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await screen.getByRole("button", { name: "Open SYSTEM" }).click();
    await screen.getByRole("dialog").getByRole("button", { name: /^MORE / }).click();
    expect(confirm).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    await expect.element(screen.getByRole("dialog", { name: "SYSTEM", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Close SYSTEM" }).click();
    await screen.getByRole("button", { name: "Log a meal in BODY" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
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
      const resume = screen.getByRole("button", { name: "RESUME WORKOUT" }).element().getBoundingClientRect();
      expect(resume.bottom).toBeLessThanOrEqual(document.querySelector(".shell-nav")!.getBoundingClientRect().top);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    await screen.getByRole("button", { name: "Open SYSTEM" }).click();
    await screen.getByRole("button", { name: /MORE History/ }).click();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "RESUME WORKOUT" }).click();
    expect((await getActiveWorkoutSession())?.id).toBe(workout.id);
    expect(await db.performedSets.where("sessionId").equals(workout.id).count()).toBe(1);
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  });

  for (const width of [320, 360, 412]) {
    it(`keeps SYSTEM keyboard accessible and mobile layout readable at ${width}px`, async () => {
      await page.viewport(width, 800);
      await startDay();
      const screen = await render(<App />);
      const opener = screen.getByRole("button", { name: "Open SYSTEM" });
      await opener.click();
      await expect.element(screen.getByRole("dialog", { name: "SYSTEM", exact: true })).toBeVisible();
      await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Close SYSTEM");
      for (let i = 0; i < 8; i++) {
        await userEvent.tab();
        expect(document.activeElement?.closest("dialog")).not.toBeNull();
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const control of document.querySelectorAll<HTMLButtonElement>(".console-controls button, .console-system button")) {
        expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => document.activeElement).toBe(opener.element());
      // The handoff must survive native close and React's effect cleanup,
      // not merely pass while focus is transiently on the trigger.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      expect(document.activeElement).toBe(opener.element());
      await opener.click();
      await screen.getByRole("button", { name: /TODAY TOOLS/ }).click();
      await expect.poll(() => document.activeElement?.id).toBe("console-tools-heading");
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      expect(document.activeElement?.id).toBe("console-tools-heading");
      await expect.element(screen.getByRole("button", { name: "Close TOOLS" })).toBeVisible();
    });
  }
});
