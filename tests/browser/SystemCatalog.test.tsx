import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import Dexie from "dexie";
import { App } from "../../src/app/App";
import { SYSTEM_CAPABILITIES } from "../../src/ui/systemCatalog";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { getTotalMealCalories } from "../../src/application/nutritionQueries";
import { startWorkout, logSet } from "../../src/application/trainCommands";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

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
async function open(screen: Screen) {
  await screen.getByRole("button", { name: "Open SYSTEM" }).click();
  await expect.element(screen.getByRole("dialog", { name: "SYSTEM", exact: true })).toBeVisible();
}
async function launch(screen: Screen, label: string) {
  const entry = SYSTEM_CAPABILITIES.find((capability) => capability.label === label)!;
  await screen.getByRole("button", { name: `${entry.label} ${entry.description}`, exact: true }).click();
}
const moreHeadings = {
  HISTORY: "MORE // HISTORY", WEEKLY: "MORE // WEEKLY CHECK-IN", REVIEW: "MORE // REVIEW",
  SEARCH: "MORE // SEARCH", JOURNAL: "MORE // DECISION JOURNAL", INTENT: "MORE // MISSIONS & OBLIGATIONS",
  WORK_SCHEDULE: "MORE // WORK SCHEDULE", EXERCISE_LIBRARY: "MORE // EXERCISE LIBRARY", CUSTOM_TEMPLATES: "MORE // CUSTOM PROGRAMS",
};
describe("production SYSTEM catalog", () => {
  for (const entry of SYSTEM_CAPABILITIES) {
    it(`opens the real ${entry.label} destination without logging or starting anything`, async () => {
      const screen = await render(<App />);
      await open(screen);
      const eventCount = await db.events.count();
      await launch(screen, entry.label);
      await expect.poll(() => document.querySelector("dialog[open]")).toBeNull();
      const destination = entry.destination;
      if (destination.kind === "tools") {
        await expect.poll(() => document.activeElement?.id).toBe("console-tools-heading");
        await expect.element(screen.getByRole("button", { name: "Close TOOLS" })).toBeVisible();
      } else if (destination.kind === "more") {
        await expect.element(screen.getByRole("heading", { name: moreHeadings[destination.view as keyof typeof moreHeadings], exact: true })).toBeVisible();
        await expect.poll(() => document.activeElement?.tagName).toBe("H1");
        await screen.getByRole("button", { name: "← BACK TO MORE", exact: true }).click();
        await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEM", exact: true })).toBeVisible();
      } else if (destination.kind === "body") {
        const target = destination.focus === "meal" ? "meal-return" : destination.focus === "weight" ? "body-bodyweight" : destination.focus === "water" ? "body-hydration" : "body-sleep";
        await expect.poll(() => destination.focus === "meal" ? document.activeElement?.id === target : !!document.activeElement?.closest(`#${target}`)).toBe(true);
      } else {
        const tab = destination.kind === "workout" ? "TRAIN" : destination.tab;
        await expect.element(screen.getByRole("button", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
        await expect.poll(() => document.activeElement?.tagName).toBe("H1");
      }
      expect(await db.events.count()).toBe(eventCount);
      expect(await db.workoutSessions.count()).toBe(0);
      expect(await db.savedMeals.count()).toBe(0);
      for (const tab of ["TODAY", "TRAIN", "BODY", "MORE"]) await expect.element(screen.getByRole("button", { name: tab, exact: true })).toBeVisible();
    });
  }

  it("filters capabilities independently of personal record search, clears and resets on reopen", async () => {
    await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const screen = await render(<App />);
    await open(screen);
    const query = screen.getByRole("searchbox", { name: "Find a capability" });
    await query.fill("Synthetic lunch");
    await expect.element(screen.getByText("No matching capability. Clear the search to browse.")).toBeVisible();
    await screen.getByRole("button", { name: "CLEAR", exact: true }).click();
    await expect.element(query).toHaveValue("");
    await expect.element(screen.getByText("18 capabilities", { exact: true })).toBeVisible();
    await query.fill("HYDRATION");
    await expect.element(screen.getByText("1 capability", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Close SYSTEM" }).click();
    await open(screen);
    await expect.element(query).toHaveValue("");
    await launch(screen, "SEARCH RECORDS");
    await screen.getByRole("textbox", { name: "Search everything" }).fill("Synthetic lunch");
    await expect.element(screen.getByRole("button", { name: /Synthetic lunch/ })).toBeVisible();
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Search everything", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "MORE // SEARCH", exact: true })).toBeVisible();
  });

  it("retains meal drafts when catalog departure is canceled and reopens the same journey", async () => {
    const screen = await render(<App />);
    await open(screen); await launch(screen, "MEAL");
    await screen.getByRole("button", { name: "SHOW MANUAL MACROS" }).click();
    await screen.getByRole("textbox", { name: "New meal name" }).fill("Unfinished dinner");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Log a meal in BODY");
    await open(screen);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await launch(screen, "HISTORY");
    expect(confirm).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole("dialog", { name: "SYSTEM", exact: true })).toBeVisible();
    await launch(screen, "MEAL");
    await expect.element(screen.getByRole("textbox", { name: "New meal name" })).toHaveValue("Unfinished dinner");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(0);
  });

  it("logs through the existing meal command once, survives read failure, returns/reopens and keeps undo", async () => {
    await createSavedMeal({ name: "Synthetic lunch", calories: 500, proteinG: 30, carbsG: 50, fatG: 15 });
    const screen = await render(<App />);
    await open(screen); await launch(screen, "MEAL");
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeEnabled();
    const read = vi.spyOn(db.savedMeals, "toArray").mockRejectedValue(new Error("Read unavailable"));
    const log = screen.getByRole("button", { name: "LOG", exact: true }).element() as HTMLButtonElement;
    log.click(); log.click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Meal logged.");
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
    expect(await getTotalMealCalories(dayId)).toBe(500);
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    read.mockRestore();
    const restoredRead = db.savedMeals.toArray.bind(db.savedMeals);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(db.savedMeals, "toArray").mockImplementation(() => Dexie.Promise.resolve(gate).then(restoredRead));
    try {
      await open(screen); await launch(screen, "MEAL");
      await expect.element(screen.getByRole("button", { name: "RETURN TO TODAY" })).toBeDisabled();
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
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await open(screen); await launch(screen, "WORKOUT");
    await expect.poll(() => getActiveWorkoutSession().then((session) => session?.id)).toBe(active.id);
    expect(await db.workoutSessions.count()).toBe(1);
    expect(await db.performedSets.where("sessionId").equals(active.id).count()).toBe(1);
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  });

  for (const width of [320, 360, 412]) {
    for (const queryText of ["", "history", "nonexistent-tool"]) {
      it(`closes SYSTEM with one Escape from the focused ${queryText || "empty"} search at ${width}px`, async () => {
        await page.viewport(width, 800);
        const screen = await render(<App />);
        await open(screen);
        const query = screen.getByRole("searchbox", { name: "Find a capability" });
        await query.fill(queryText);
        await expect.element(query).toHaveValue(queryText);
        await expect.poll(() => document.activeElement).toBe(query.element());
        if (queryText === "history") {
          await expect.element(screen.getByText("1 capability", { exact: true })).toBeVisible();
        } else if (queryText) {
          await expect.element(screen.getByText("No matching capability. Clear the search to browse.")).toBeVisible();
        } else {
          await expect.element(screen.getByText("18 capabilities", { exact: true })).toBeVisible();
        }
        // Real keyboard input exercises the native search-field Escape default.
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => document.querySelector("dialog[open]")).toBeNull();
        await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Open SYSTEM");
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        expect(document.activeElement?.getAttribute("aria-label")).toBe("Open SYSTEM");
        await open(screen);
        await expect.element(query).toHaveValue("");
        await expect.element(screen.getByText("18 capabilities", { exact: true })).toBeVisible();
      });
    }
  }

  for (const width of [320, 360, 412]) {
    it(`supports touch, keyboard and readable layout at ${width}px`, async () => {
      await page.viewport(width, 800);
      const screen = await render(<App />);
      await open(screen);
      await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Close SYSTEM");
      for (let i = 0; i < 25; i++) {
        await userEvent.tab();
        expect(document.activeElement?.closest("dialog")).not.toBeNull();
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      for (const control of document.querySelectorAll<HTMLElement>("dialog button, dialog input")) {
        expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
      }
      await expect.element(screen.getByRole("button", { name: "Close SYSTEM" })).toBeVisible();
      expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
      await userEvent.keyboard("{Escape}");
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Open SYSTEM");
      await open(screen);
      await screen.getByRole("searchbox", { name: "Find a capability" }).fill("history");
      await page.viewport(width, 420); // constrained visual space with phone keyboard
      expect(document.querySelector("dialog")!.getBoundingClientRect().height).toBeLessThanOrEqual(420);
      const result = screen.getByRole("button", { name: "HISTORY MORE · Complete chronological records", exact: true }).element();
      expect(result.getBoundingClientRect().bottom).toBeLessThanOrEqual(document.querySelector("dialog")!.getBoundingClientRect().bottom - 16);
      await launch(screen, "HISTORY");
      await expect.element(screen.getByRole("heading", { name: "MORE // HISTORY", exact: true })).toBeVisible();
    });
  }
});
