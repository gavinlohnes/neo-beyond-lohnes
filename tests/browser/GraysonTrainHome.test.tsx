/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { createCustomTemplate } from "../../src/application/customTemplateCommands";
import { getCustomTemplates } from "../../src/application/customTemplateQueries";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { createRoutine } from "../../src/application/routineCommands";
import { App } from "../../src/app/App";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-TRAIN-HOME-001: the brief's phone check in a real browser. On TRAIN, LIBRARY opens the exercise library and
 * comes back to the workout. In MORE, ROUTINES · WORKOUTS opens TRAIN's routines. Archive a routine from TRAIN, then
 * UNDO. MORE says SHIFT ROUTINES and the checklists are all there. 320 px and axe. Nothing is written by navigating.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
const settle = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
async function shot(name: string, el: Element | null) { if (SHOTS && el) await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement }); }
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function fits(label: string, root: Element, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, SHOTS ? 1800 : 900); await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("GRAYSON-TRAIN-HOME-001 TRAIN as the one home for training", () => {
  it("LIBRARY on TRAIN: one tap in, find an exercise, back to the workout", { timeout: 30_000 }, async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "LIBRARY", exact: true })).toBeVisible();
    const acts = document.querySelector(".train-routine-acts");
    await axeClean("start row", acts!);
    await fits("start row", acts!, "start-row");
    await screen.getByRole("button", { name: "LIBRARY", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Exercise library" })).toHaveFocus();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await userEvent.fill(screen.getByRole("textbox", { name: "Search exercise reference list" }), "cable");
    await expect.element(screen.getByRole("group", { name: "Open exercise set matches" }).getByText("Cable Chest Press", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("checkbox", { name: "Show stretches" })).toBeVisible();
    await axeClean("library in TRAIN", document.querySelector("[data-train-library]")!);
    await fits("library in TRAIN", document.querySelector("[data-train-library]")!, "library");
    await screen.getByRole("button", { name: "BACK TO WORKOUT" }).first().click();
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    expect(document.querySelector("[data-train-library]")).toBeNull();
    expect(await db.workoutSessions.count()).toBe(0);
  });

  it("MORE's ROUTINES · WORKOUTS opens TRAIN's routines; ARCHIVE in TRAIN with UNDO", { timeout: 30_000 }, async () => {
    await createCustomTemplate({ name: "Leg Day", exercises: [{ exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 }] });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("program");
    await screen.getByRole("button", { name: /^ROUTINES · WORKOUTS/ }).click();
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
    await expect.element(screen.getByRole("heading", { name: "Routines" })).toHaveFocus();
    const list = screen.getByRole("list", { name: "Your routines" });
    await expect.element(list.getByText("Leg Day", { exact: true })).toBeVisible();
    await expect.element(list.getByText("Workout A", { exact: false }).first()).toBeVisible();
    // Archive in 2 taps: the list is open (1), ARCHIVE (2). UNDO brings it back.
    await screen.getByRole("button", { name: "Archive Leg Day" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Leg Day archived.");
    await expect.poll(async () => (await getCustomTemplates()).length).toBe(0);
    await axeClean("routines with archived", document.querySelector("[data-routine-list]")!);
    await fits("routines", document.querySelector("[data-routine-list]")!, "routines-archived");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getCustomTemplates()).map((t) => t.name)).toEqual(["Leg Day"]);
  });

  it("keeps routine edit and archive available during a workout without changing the live session", { timeout: 30_000 }, async () => {
    const legDay = await createCustomTemplate({ name: "Leg Day", exercises: [{ exerciseId: "leg-press", name: "Leg Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 10 }] });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await screen.getByRole("button", { name: "START WORKOUT", exact: true }).click();
    await expect.poll(async () => await getActiveWorkoutSession()).toBeTruthy();
    const activeId = (await getActiveWorkoutSession())!.id;

    await screen.getByRole("button", { name: "MORE", exact: true }).click();
    await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("program");
    await screen.getByRole("button", { name: /^ROUTINES · WORKOUTS/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Routines" })).toHaveFocus();
    await expect.element(screen.getByRole("button", { name: "Archive Leg Day" })).toBeVisible();

    await screen.getByRole("button", { name: "Edit Leg Day" }).click();
    await expect.element(screen.getByText("Your workout in progress keeps its exercises. This applies from the next one.")).toBeVisible();
    await screen.getByRole("textbox", { name: "Name" }).fill("Leg Day Later");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getCustomTemplates()).find((r) => r.id === legDay.id)?.name).toBe("Leg Day Later");
    expect((await getActiveWorkoutSession())?.id).toBe(activeId);

    await screen.getByRole("button", { name: "Archive Leg Day Later" }).click();
    await expect.poll(async () => (await getCustomTemplates()).some((r) => r.id === legDay.id)).toBe(false);
    expect((await getActiveWorkoutSession())?.id).toBe(activeId);
  });

  it("MORE says SHIFT ROUTINES, and his checklists are all there under their old key", { timeout: 30_000 }, async () => {
    await createRoutine({ title: "Pre-shift", moment: "BEFORE_SHIFT", steps: ["Shower", "Pack lunch"] });
    await createRoutine({ title: "Wind down", moment: "AFTER_SHIFT", steps: ["Stretch"] });
    const before = await db.events.count();
    const screen = await render(<MoreScreen initialView="ROUTINES" />);
    await expect.element(screen.getByRole("heading", { name: "MORE // SHIFT ROUTINES" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "YOUR SHIFT ROUTINES" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Pre-shift" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Wind down" })).toBeVisible();
    await shot("360-shift-routines", document.body);
    await cleanup();
    // Search: "routine" finds both, "shift" the checklists.
    const menu = await render(<MoreScreen />);
    await menu.getByRole("searchbox", { name: "Find a screen or action" }).fill("routine");
    await expect.element(menu.getByRole("button", { name: /^SHIFT ROUTINES/ })).toBeVisible();
    await expect.element(menu.getByRole("button", { name: /^ROUTINES · WORKOUTS/ })).toBeVisible();
    expect(await db.events.count()).toBe(before);
  });
});
