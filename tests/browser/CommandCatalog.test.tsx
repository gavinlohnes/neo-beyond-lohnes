import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import Dexie from "dexie";
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
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
  dayId = (await startDay()).id;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });

const searchbox = (screen: Screen) => screen.getByRole("searchbox", { name: "Find a screen or action" });
async function openCommand(screen: Screen) {
  const tab = screen.getByRole("button", { name: "COMMAND", exact: true });
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
  PLAN: "COMMAND // PLAN TODAY", SYSTEMS: "COMMAND // SYSTEMS",
  HISTORY: "COMMAND // HISTORY", WEEKLY: "COMMAND // WEEKLY CHECK-IN", REVIEW: "COMMAND // REVIEW",
  SEARCH: "COMMAND // SEARCH", JOURNAL: "COMMAND // DECISION JOURNAL", INTENT: "COMMAND // MISSIONS & OBLIGATIONS",
  WORK_SCHEDULE: "COMMAND // WORK SCHEDULE", EXERCISE_LIBRARY: "COMMAND // EXERCISE LIBRARY", CUSTOM_TEMPLATES: "COMMAND // CUSTOM PROGRAMS",
};
const sectionTargets = {
  BACKUP: "safety-heading", NUTRITION_TARGETS: "command-nutrition-targets", QUIT_TRACKER: "command-quit-tracker",
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
      if (destination.kind === "tools") {
        await expect.poll(() => document.activeElement?.id).toBe("console-tools-heading");
        await expect.element(screen.getByRole("button", { name: "Close TOOLS" })).toBeVisible();
      } else if (destination.kind === "more") {
        await expect.element(screen.getByRole("heading", { name: commandHeadings[destination.view as keyof typeof commandHeadings], exact: true })).toBeVisible();
        // Inside COMMAND, a destination opens with focus on its way back, like every index row.
        await expect.poll(() => document.activeElement?.textContent).toBe("← BACK TO COMMAND");
        await screen.getByRole("button", { name: "← BACK TO COMMAND", exact: true }).click();
        await expect.element(screen.getByRole("heading", { name: "COMMAND", exact: true })).toBeVisible();
        // Back returns to the result that was used, with the query kept.
        await expect.element(searchbox(screen)).toHaveValue(entry.label.toLowerCase());
        await expect.poll(() => document.activeElement?.textContent ?? "").toContain(entry.label);
      } else if (destination.kind === "section") {
        const target = sectionTargets[destination.section];
        await expect.poll(() => !!document.activeElement?.closest(`#${target}`) || document.activeElement?.id === target).toBe(true);
        const details = document.getElementById(target)?.closest("details") ?? document.getElementById(target)?.querySelector("details");
        if (destination.section === "TIME_CAPSULE" || destination.section === "DIAGNOSTICS" || destination.section === "GUIDE") expect(details?.open).toBe(true);
      } else if (destination.kind === "body") {
        if (destination.focus === "urge") await expect.element(screen.getByRole("button", { name: "Log urge: Stress" })).toBeVisible();
        else {
          const target = destination.focus === "meal" ? "meal-return" : destination.focus === "weight" ? "body-bodyweight" : destination.focus === "water" ? "body-hydration" : "body-sleep";
          await expect.poll(() => destination.focus === "meal" ? document.activeElement?.id === target : !!document.activeElement?.closest(`#${target}`)).toBe(true);
        }
      } else if (destination.kind === "capture") {
        await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
        await expect.element(screen.getByRole("textbox", { name: "Capture a thought", exact: true })).toBeVisible();
      } else if (destination.kind === "stealth") {
        // SUIT-001: stealth covers the screen; Escape exits and nothing was written.
        await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => document.querySelector(".stealth")).toBeNull();
      } else {
        const tab = destination.kind === "workout" ? "TRAIN" : destination.tab;
        await expect.element(screen.getByRole("button", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
        await expect.poll(() => document.activeElement?.tagName).toBe("H1");
      }
      expect(await db.events.count()).toBe(eventCount);
      expect(await db.workoutSessions.count()).toBe(0);
      expect(await db.savedMeals.count()).toBe(0);
      for (const tab of ["TODAY", "TRAIN", "BODY", "COMMAND"]) await expect.element(screen.getByRole("button", { name: tab, exact: true })).toBeVisible();
    });
  }

  it("every former MORE destination is also reachable by browsing COMMAND's index", async () => {
    const screen = await render(<App />);
    await openCommand(screen);
    for (const name of ["WEEKLY CHECK-IN", "HISTORY", "REVIEW", "SEARCH", "DECISION JOURNAL", "MISSIONS & OBLIGATIONS", "WORK SCHEDULE", "EXERCISE LIBRARY", "CUSTOM PROGRAMS"]) {
      await expect.element(screen.getByRole("button", { name: `Open ${name}`, exact: true })).toBeVisible();
    }
    for (const name of ["PLAN TODAY", "CAPTURE", "EXPORT BACKUP", "SHARE BACKUP"]) await expect.element(screen.getByRole("button", { name, exact: true })).toBeVisible();
    for (const heading of ["Log", "Evidence", "Direction", "Training tools", "Data safety", "Settings", "Reminders"]) {
      await expect.element(screen.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await expect.element(screen.getByText("A place to start", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Diagnostic detail", { exact: true })).toBeVisible();
  });

  it("filters capabilities independently of personal record search; says so plainly when nothing matches", async () => {
    await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const screen = await render(<App />);
    await openCommand(screen);
    await searchbox(screen).fill("Synthetic lunch");
    await expect.element(screen.getByText("Nothing called “Synthetic lunch”. Try water, sleep, backup or schedule.")).toBeVisible();
    await screen.getByRole("button", { name: "Clear search" }).click();
    await expect.element(searchbox(screen)).toHaveValue("");
    await expect.poll(() => document.activeElement).toBe(searchbox(screen).element());
    await expect.element(screen.getByRole("heading", { name: "Evidence", exact: true })).toBeVisible();
    await searchbox(screen).fill("HYDRATION");
    await expect.element(screen.getByText("1 result", { exact: true })).toBeInTheDocument();
    await screen.getByRole("button", { name: "Clear search" }).click();
    await launch(screen, "SEARCH RECORDS");
    await screen.getByRole("textbox", { name: "Search everything" }).fill("Synthetic lunch");
    await expect.element(screen.getByRole("button", { name: /Synthetic lunch/ })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Search everything", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // SEARCH", exact: true })).toBeVisible();
  });

  it("keeps the Weekly Review reachable from COMMAND", async () => {
    const screen = await render(<App />);
    await openCommand(screen);
    await searchbox(screen).fill("weekly review");
    await screen.getByRole("button", { name: /^REVIEW COMMAND · Weekly review/ }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // REVIEW", exact: true })).toBeVisible();
  });

  it("retains meal drafts through catalog departure and reopens the same input", async () => {
    const screen = await render(<App />);
    await openCommand(screen); await launch(screen, "MEAL");
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished dinner");
    await screen.getByRole("button", { name: "RETURN TO COMMAND" }).click();
    await expect.element(screen.getByRole("button", { name: "COMMAND", exact: true })).toHaveAttribute("aria-current", "page");
    const confirm = vi.spyOn(window, "confirm");
    await launch(screen, "HISTORY");
    await expect.element(screen.getByRole("heading", { name: "COMMAND // HISTORY", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    // Review B1: primary navigation ends the shortcut's focused view; the draft stays.
    await expect.element(screen.getByRole("heading", { name: "BODY // DAILY RECORD" })).toBeVisible();
    await screen.getByRole("button", { name: "OPEN MEALS" }).click();
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("logs through the existing meal command once, survives read failure, returns/reopens and keeps undo", async () => {
    await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const screen = await render(<App />);
    await openCommand(screen); await launch(screen, "MEAL");
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeEnabled();
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read unavailable"));
    const log = screen.getByRole("button", { name: "LOG", exact: true }).element() as HTMLButtonElement;
    log.click(); log.click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal logged.");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    expect(await getTotalMealCalories(dayId)).toBe(500);
    await screen.getByRole("button", { name: "RETURN TO COMMAND" }).click();
    read.mockRestore();
    const restoredRead = db.savedMeals.toArray.bind(db.savedMeals);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(db.savedMeals, "toArray").mockImplementation(() => Dexie.Promise.resolve(gate).then(restoredRead));
    try {
      await launch(screen, "MEAL");
      await expect.element(screen.getByRole("button", { name: "RETURN TO COMMAND" })).toBeDisabled();
      // Keep the read gated beyond BODY's 250 ms shortcut positioning; the shell's
      // temporary heading is then the landing point while RETURN is disabled.
      await new Promise((resolve) => setTimeout(resolve, 300));
      document.getElementById("meal-surface-heading")!.focus();
      expect(document.activeElement?.id).toBe("meal-surface-heading");
    } finally { release(); }
    await expect.poll(() => document.activeElement?.id).toBe("meal-return");
    await expect.element(screen.getByRole("button", { name: "UNDO", exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
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
        expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
      }
      for (const animation of document.getAnimations()) animation.finish();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      // Keyboard: Tab from the search reaches the result; Enter in the search opens the first match.
      (searchbox(screen).element() as HTMLInputElement).focus();
      await userEvent.tab();
      await userEvent.tab();
      expect(document.activeElement?.textContent).toContain("HISTORY");
      (searchbox(screen).element() as HTMLInputElement).focus();
      await page.viewport(width, 420); // constrained visual space with phone keyboard
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByRole("heading", { name: "COMMAND // HISTORY", exact: true })).toBeVisible();
    });
  }
});
