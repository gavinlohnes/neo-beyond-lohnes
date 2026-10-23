import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import Dexie from "dexie";
import { setHiddenFeature } from "../../src/ui/hiddenFeatures";
import { App } from "../../src/app/App";
import { SYSTEM_CAPABILITIES } from "../../src/ui/systemCatalog";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { getTotalMealCalories } from "../../src/application/nutritionQueries";
import { startWorkout, logSet } from "../../src/application/trainCommands";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * COMMAND-CENTER-001: the capability catalog moved from TODAY's SYSTEM dialog
 * into the COMMAND tab's search. Every entry is reached from COMMAND by search
 * and opens its real destination without logging or starting anything.
 */
type Screen = Awaited<ReturnType<typeof render>>;
let dayId: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  for (const feature of ["minimumDay", "smallSteps", "foodLookup"] as const) setHiddenFeature(feature, true);
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  dayId = (await startDay()).id;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });

const searchbox = (screen: Screen) => screen.getByRole("searchbox", { name: "Find a screen or action" });
async function openCommand(screen: Screen) {
  const tab = screen.getByRole("button", { name: "MORE", exact: true });
  await tab.click();
  if (searchbox(screen).elements().length === 0) await tab.click();
  await expect.element(searchbox(screen)).toBeVisible();
}
async function launch(screen: Screen, label: string) {
  const entry = SYSTEM_CAPABILITIES.find((capability) => capability.label === label)!;
  await searchbox(screen).fill(label.toLowerCase());
  await screen.getByRole("button", { name: `${entry.label} ${entry.description}`, exact: true }).click();
}
const commandHeadings = {
  REPORT: "AFTER ACTION REPORT", MIRROR: "MIRROR",
  PLAN: "MORE // PLAN TODAY", SYSTEMS: "MORE // SYSTEMS",
  HISTORY: "MORE // HISTORY", WEEKLY: "MORE // WEEKLY CHECK-IN", REVIEW: "MORE // REVIEW",
  SEARCH: "MORE // SEARCH", JOURNAL: "MORE // DECISION JOURNAL", INTENT: "MORE // MISSIONS & OBLIGATIONS",
  WORK_SCHEDULE: "MORE // WORK SCHEDULE", EXERCISE_LIBRARY: "MORE // EXERCISE LIBRARY", CUSTOM_TEMPLATES: "MORE // CUSTOM PROGRAMS",
};
const sectionTargets = {
  HIDDEN_FEATURES: "command-hidden-features", BACKUP: "safety-heading", NUTRITION_TARGETS: "command-nutrition-targets", QUIT_TRACKER: "command-quit-tracker",
  TIME_CAPSULE: "command-time-capsule", REMINDERS: "reminders-heading", DIAGNOSTICS: "command-diagnostics", GUIDE: "command-guide",
};

describe("COMMAND catalog", () => {
  for (const entry of SYSTEM_CAPABILITIES) {
    it(`opens the real ${entry.label} destination from COMMAND without logging or starting anything`, async () => {
      if (entry.label === "URGE") await saveQuitHabit({ name: "Drinking" });
      const screen = await render(<App />);
      await openCommand(screen);
      const eventCount = await db.events.count();
      await launch(screen, entry.label);
      const destination = entry.destination;
      if (destination.kind === "tools" || destination.kind === "daily") {
        await expect.element(screen.getByRole("heading", { name: destination.kind === "daily" && destination.tool === "CAPTURE" ? "CAPTURE" : destination.kind === "daily" && destination.tool === "SHIFT_HANDOFF" ? "SHIFT HANDOFF NOTES" : "DAILY CONTROLS", exact: true })).toBeVisible();
        await expect.element(screen.getByRole("button", { name: "BACK TO MORE", exact: true })).toBeVisible();
      } else if (destination.kind === "more") {
        await expect.element(screen.getByRole("heading", { name: commandHeadings[destination.view as keyof typeof commandHeadings], exact: true })).toBeVisible();
        // Inside COMMAND, a destination opens with focus on its way back, like every index row.
        await expect.poll(() => document.activeElement?.textContent).toBe("BACK TO MORE");
        await screen.getByRole("button", { name: "BACK TO MORE", exact: true }).click();
        await expect.element(screen.getByRole("heading", { name: "MORE", exact: true })).toBeVisible();
        // Back returns to the result that was used, with the query kept.
        await expect.element(searchbox(screen)).toHaveValue(entry.label.toLowerCase());
        await expect.poll(() => document.activeElement?.textContent ?? "").toContain(entry.label);
      } else if (destination.kind === "section") {
        const target = sectionTargets[destination.section];
        await expect.poll(() => !!document.activeElement?.closest(`#${target}`) || document.activeElement?.id === target).toBe(true);
        const details = document.getElementById(target)?.closest("details") ?? document.getElementById(target)?.querySelector("details");
        if (destination.section === "TIME_CAPSULE" || destination.section === "DIAGNOSTICS" || destination.section === "GUIDE") expect(details?.open).toBe(true);
      } else if (destination.kind === "body" || destination.kind === "record" || destination.kind === "capture") {
        const title = destination.kind === "capture" ? "NOTE" : destination.kind === "record" ? destination.target === "protein" ? "PROTEIN ONLY" : "MY MEALS" : { water: "WATER", meal: "MEAL", foodLookup: "FOOD LOOKUP", sleep: "SLEEP", weight: "BODYWEIGHT", urge: "URGE" }[destination.focus];
        await expect.element(screen.getByRole("dialog", { name: title, exact: true })).toBeVisible();
        await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toHaveAttribute("aria-current", "page");
      } else if (destination.kind === "stealth") {
        // SUIT-001: stealth covers the screen; Escape exits and nothing was written.
        await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => document.querySelector(".stealth")).toBeNull();
      } else {
        const tab = destination.kind === "workspace" ? destination.tab === "BODY" ? "DATA" : destination.tab : "TRAIN";
        await expect.element(screen.getByRole("button", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
        await expect.poll(() => document.activeElement?.tagName).toBe("H1");
      }
      expect(await db.events.count()).toBe(eventCount);
      expect(await db.workoutSessions.count()).toBe(0);
      expect(await db.savedMeals.count()).toBe(0);
      for (const tab of ["TODAY", "TRAIN", "DATA", "MORE"]) await expect.element(screen.getByRole("button", { name: tab, exact: true })).toBeVisible();
    });
  }

  it("every former MORE destination is also reachable by browsing COMMAND's index", async () => {
    const screen = await render(<App />);
    await openCommand(screen);
    // The pre-redesign destination inventory is deliberately independent of the current catalog.
    const before = ["WATER", "MEAL", "FOOD LOOKUP", "SLEEP", "BODYWEIGHT", "NOTE", "URGE", "SYSTEMS", "STEALTH", "TODAY TOOLS", "PLAN TODAY", "TRAIN", "WORKOUT", "EXERCISE LIBRARY", "CUSTOM PROGRAMS", "MISSIONS & OBLIGATIONS", "WORK SCHEDULE", "IMPORT HEALTH DATA", "DATA", "WEEKLY CHECK-IN", "REVIEW", "HISTORY", "DECISION JOURNAL", "SEARCH RECORDS", "BACKUP & RECOVERY", "NUTRITION TARGETS", "QUIT TRACKER SETTINGS", "TIME CAPSULE", "CHECK-IN REMINDER", "DIAGNOSTICS", "A PLACE TO START"];
    for (const name of before) expect(SYSTEM_CAPABILITIES.some((entry) => entry.label === name)).toBe(true);
    for (const summary of document.querySelectorAll<HTMLDetailsElement>(".command-group")) summary.open = true;
    for (const entry of SYSTEM_CAPABILITIES) await expect.element(screen.getByRole("button", { name: `${entry.label} ${entry.description}`, exact: true })).toBeVisible();
    for (const name of ["EXPORT BACKUP", "SHARE BACKUP"]) await expect.element(screen.getByRole("button", { name, exact: true })).toBeVisible();
    await expect.element(screen.getByText("A place to start", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Diagnostic detail", { exact: true })).toBeVisible();
  });

  it("finds named meals alongside capabilities and keeps full record search available", async () => {
    await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const screen = await render(<App />);
    await openCommand(screen);
    await searchbox(screen).fill("Synthetic lunch");
    await expect.element(screen.getByRole("button", { name: "Synthetic lunch Saved meal · choose servings", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Clear search" }).click();
    await expect.element(searchbox(screen)).toHaveValue("");
    await expect.poll(() => document.activeElement).toBe(searchbox(screen).element());
    expect([...document.querySelectorAll<HTMLElement>(".command-group > summary")].find((el) => el.textContent === "Review")!.getClientRects().length).toBeGreaterThan(0);
    await searchbox(screen).fill("HYDRATION");
    await expect.element(screen.getByText("1 result", { exact: true })).toBeInTheDocument();
    await screen.getByRole("button", { name: "Clear search" }).click();
    await launch(screen, "SEARCH RECORDS");
    await screen.getByRole("textbox", { name: "Search everything" }).fill("Synthetic lunch");
    await expect.element(screen.getByRole("button", { name: /Synthetic lunch/ })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Search everything", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // SEARCH", exact: true })).toBeVisible();
  });

  it("keeps the Weekly Review reachable from COMMAND", async () => {
    const screen = await render(<App />);
    await openCommand(screen);
    await searchbox(screen).fill("weekly review");
    await screen.getByRole("button", { name: /^REVIEW Weekly review/ }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // REVIEW", exact: true })).toBeVisible();
  });

  it("retains meal drafts through catalog departure and reopens the same input", async () => {
    const screen = await render(<App />);
    await openCommand(screen); await launch(screen, "MEAL");
    await screen.getByRole("button", { name: "NEW MEAL", exact: true }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished dinner");
    await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toHaveAttribute("aria-current", "page");
    const confirm = vi.spyOn(window, "confirm");
    await launch(screen, "HISTORY");
    await expect.element(screen.getByRole("heading", { name: "MORE // HISTORY", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "BACK TO MORE", exact: true }).click();
    await launch(screen, "MEAL"); await screen.getByRole("button", { name: "NEW MEAL", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("logs once from COMMAND and keeps undo through a gated sheet read, without stealing focus", async () => {
    await createSavedMeal({ name: "Synthetic dinner", calories: 600, proteinG: 35, carbsG: 70, fatG: 20 });
    const screen = await render(<App />); await openCommand(screen); await launch(screen, "MEAL");
    await screen.getByRole("button", { name: "Log Synthetic dinner", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "UNDO", exact: true })).toBeVisible();
    const restoredRead = db.savedMeals.toArray.bind(db.savedMeals); let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(db.savedMeals, "toArray").mockImplementation(() => Dexie.Promise.resolve(gate).then(restoredRead));
    await launch(screen, "MEAL");
    const close = screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true });
    try { await expect.element(close).toBeVisible(); close.element().focus(); }
    finally { release(); }
    await expect.element(screen.getByRole("button", { name: "Log Synthetic dinner", exact: true })).toBeVisible();
    await expect.element(close).toHaveFocus();
    await close.click(); expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(() => getTotalMealCalories(dayId)).toBe(0);
  });

  it("resumes the existing active workout without adding or losing a session or set", async () => {
    const active = await startWorkout(dayId, "A", "STANDARD");
    await logSet(dayId, active.id, "machine-chest-press", 1, 110, 10);
    const screen = await render(<App />);
    await openCommand(screen); await launch(screen, "WORKOUT");
    await expect.poll(() => getActiveWorkoutSession().then((session) => session?.id)).toBe(active.id);
    expect(await db.workoutSessions.count()).toBe(1);
    expect(await db.performedSets.where("sessionId").equals(active.id).count()).toBe(1);
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  });

  for (const width of [320, 360, 412]) {
    it(`supports touch, keyboard and readable layout at ${width}px`, async () => {
      await page.viewport(width, 800);
      const screen = await render(<App />);
      await openCommand(screen);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      await searchbox(screen).fill("history");
      for (const control of document.querySelectorAll<HTMLElement>("#workspace-COMMAND .command-results .command-result, #workspace-COMMAND .command-search input, #workspace-COMMAND .command-search button")) {
        expect(Math.round(control.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
        expect(parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
      }
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body)).violations).toEqual([]);
      // Keyboard: Tab from the search reaches the result; Enter in the search opens the first match.
      (searchbox(screen).element() as HTMLInputElement).focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement?.textContent).toContain("HISTORY");
      (searchbox(screen).element() as HTMLInputElement).focus();
      await page.viewport(width, 420); // constrained visual space with phone keyboard
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByRole("heading", { name: "MORE // HISTORY", exact: true })).toBeVisible();
    });
  }
});
