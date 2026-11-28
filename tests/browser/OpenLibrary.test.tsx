/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveWorkoutSession, getPerformedSets } from "../../src/application/trainQueries";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { getCustomExercises } from "../../src/application/exerciseLibraryQueries";
import { ExerciseLibraryScreen } from "../../src/ui/screens/more/ExerciseLibraryScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-OPEN-LIBRARY-001: the brief's phone check in a real browser. Search "cable" in the library: his own matches
 * first, then open ones with their muscles. Open one: its steps say "From the open exercise set". HIDE another: gone.
 * EDIT copies one into his exercises. ADD one to Routine A in 3 taps (search, pick, SAVE) and log a set. 320 px, axe.
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
    await page.viewport(width, SHOTS ? 2000 : 900); await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("GRAYSON-OPEN-LIBRARY-001 the open exercise library", () => {
  it("library search: his own first, then open ones; HOW TO shows its steps; HIDE and EDIT", { timeout: 30_000 }, async () => {
    const screen = await render(<ExerciseLibraryScreen />);
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await expect.element(screen.getByText("Search to find about 800 more from the open exercise set.")).toBeVisible();
    await userEvent.fill(screen.getByRole("textbox", { name: "Search exercise reference list" }), "cable");
    const open = screen.getByRole("group", { name: "Open exercise set matches" });
    await expect.element(open.getByText("Cable Chest Press", { exact: true })).toBeVisible();
    // His 55's Cable Crossover is listed above, once; the open copy of it is not.
    expect([...document.querySelectorAll("[data-open-exercise] .card-body")].map((el) => el.textContent)).not.toContain("Cable Crossover");
    expect(document.body.textContent!.indexOf("Cable Crossover")).toBeLessThan(document.body.textContent!.indexOf("Cable Chest Press"));
    await expect.element(open.getByText(/^Chest.* · Cable · open set$/).first()).toBeVisible();
    await expect.element(screen.getByText(/From free-exercise-db \(Unlicense \(public domain\)\), pinned at f00c92c7/)).toBeVisible();
    await axeClean("open set", document.querySelector("[data-open-library]")!);
    await fits("library search", document.querySelector("[data-open-library]")!, "library-cable");

    // HOW TO: the open steps, said where they come from.
    await screen.getByRole("button", { name: "How to do Cable Chest Press" }).click();
    await expect.element(screen.getByText("From the open exercise set")).toBeVisible();
    expect(document.querySelectorAll("[data-open-steps] li").length).toBeGreaterThan(1);
    await axeClean("open how-to", document.querySelector("[data-howto-sheet]")!);
    await shot("360-howto", document.querySelector("[data-howto-sheet]"));
    await screen.getByRole("button", { name: "CLOSE" }).click();

    // HIDE: gone from search; SHOW THEM AGAIN brings it back.
    await screen.getByRole("button", { name: "Hide Cable Chest Press from search" }).click();
    await expect.element(screen.getByText("Cable Chest Press is hidden from search.")).toBeVisible();
    expect(document.querySelector('[data-open-exercise="fedb-Cable_Chest_Press"]')).toBeNull();
    await screen.getByRole("button", { name: "SHOW THEM AGAIN" }).click();
    await expect.element(open.getByText("Cable Chest Press", { exact: true })).toBeVisible();

    // EDIT: a copy in his exercises; the open one hides.
    await screen.getByRole("button", { name: "Copy Cable Chest Press into my exercises to edit it" }).click();
    await expect.element(screen.getByText("Cable Chest Press is in your exercises now. Change it there.")).toBeVisible();
    await expect.poll(async () => (await getCustomExercises()).map((ex) => ex.name)).toContain("Cable Chest Press");
    expect(document.querySelector('[data-open-exercise="fedb-Cable_Chest_Press"]')).toBeNull();

    // Stretches stay hidden until he shows them.
    await userEvent.fill(screen.getByRole("textbox", { name: "Search exercise reference list" }), "stretch");
    await expect.element(screen.getByText("No open matches.")).toBeVisible();
    await screen.getByRole("checkbox", { name: "Show stretches" }).click();
    await expect.poll(() => document.querySelectorAll("[data-open-exercise]").length).toBeGreaterThan(5);
  });

  it("ADD an open exercise to Routine A in 3 taps and log a set", { timeout: 30_000 }, async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Edit workout A" }).click();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await expect.element(screen.getByText("Search to find more in the open exercise set.")).toBeVisible();
    // A big search caps the open matches and says so.
    await screen.getByRole("searchbox", { name: "Search" }).fill("barbell");
    await expect.element(screen.getByText(/^Showing 40 of \d+ from the open set\. Type more to narrow it\.$/)).toBeVisible();
    await axeClean("picker with open", document.querySelector("[data-routine-picker]")!);
    await fits("picker", document.querySelector("[data-routine-picker]")!, "picker-barbell");
    // Tap 1: search. Tap 2: pick. Tap 3: SAVE.
    await screen.getByRole("searchbox", { name: "Search" }).fill("cable chest press");
    await screen.getByRole("button", { name: /^Cable Chest Press.*open set/ }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A saved.");
    expect((await resolveTemplateExercises("A", "STANDARD")).at(-1)).toMatchObject({ exerciseId: "fedb-Cable_Chest_Press", name: "Cable Chest Press", repRangeLow: 8, repRangeHigh: 12 });
    await cleanup();

    // Log a set on it like any other exercise.
    const train = await render(<TrainScreen />);
    await train.getByRole("button", { name: "START WORKOUT" }).click();
    const session = (await getActiveWorkoutSession())!;
    const { logSet } = await import("../../src/application/trainCommands");
    await logSet(session.beyondDayId, session.id, "fedb-Cable_Chest_Press", 1, 50, 10);
    await expect.poll(async () => (await getPerformedSets(session.id)).find((s) => s.exerciseId === "fedb-Cable_Chest_Press")).toMatchObject({ weight: 50, reps: 10 });
  });
});
