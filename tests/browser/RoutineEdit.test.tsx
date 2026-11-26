/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { getCustomTemplates } from "../../src/application/customTemplateQueries";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { CustomTemplateScreen } from "../../src/ui/screens/more/CustomTemplateScreen";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * GRAYSON-ROUTINE-EDIT-001: the brief's phone check in a real browser. TRAIN → EDIT on A, move the second exercise to
 * the top, set its rest to 2:00, SAVE, START: it's first and rest starts at 2:00. UNDO puts A back. RESET TO ORIGINAL.
 * Then MORE · Custom programs opening the same editor. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
const settle = (ms = 80) => new Promise<void>((r) => setTimeout(r, ms));
async function shot(name: string, el: Element | null) {
  if (!SHOTS || !el) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement });
}
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string, root: Element, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, SHOTS ? 2400 : 900);
    await settle(120);
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}
const editor = () => document.querySelector("[data-routine-editor]")!;
const rows = () => [...document.querySelectorAll("[data-routine-row]")].map((row) => row.getAttribute("data-routine-row"));

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("GRAYSON-ROUTINE-EDIT-001 one routine editor", () => {
  it("EDIT on A: move the second exercise up, rest 2:00, SAVE, START: it's first and rest starts at 2:00; UNDO puts A back", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByRole("button", { name: "Edit workout A" })).toBeVisible();
    await axeClean("workout card", document.querySelector(".command-surface")!);
    await shot("360-card", document.querySelector(".command-surface"));
    await screen.getByRole("button", { name: "Edit workout A" }).click();
    await expect.element(screen.getByRole("heading", { name: "Edit Workout A" })).toHaveFocus();
    await shot("editor-before", editor());

    // Move in one tap; focus stays on the moved exercise's control (keyboard reorder).
    await screen.getByRole("button", { name: "Move Pec Deck up" }).click();
    expect(rows()).toEqual(["pec-deck", "machine-chest-press", "leg-press", "triceps-pressdown"]);
    await expect.element(screen.getByRole("button", { name: "Move Pec Deck down" })).toHaveFocus();
    // Rest: "Usual" (1:30 default) + 2 × 15 s = 2:00.
    const restUp = screen.getByRole("button", { name: "Pec Deck: rest up by 15 seconds" });
    await restUp.click(); await restUp.click();
    await expect.element(screen.getByRole("group", { name: "Pec Deck: rest" })).toHaveTextContent("2:00");
    await axeClean("editor", editor());
    await noOverflow("editor", editor(), "editor");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();

    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A saved.");
    await axeClean("routine list", document.querySelector("[data-routine-list]")!);
    await shot("list-saved", document.querySelector("[data-routine-list]"));
    await screen.getByRole("button", { name: "BACK" }).click();

    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toBeVisible();
    await expect.element(screen.getByText("Pec Deck", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Exercise 1 of 4", { exact: true })).toBeVisible();
    await screen.getByPlaceholder("lb").first().fill("80");
    await screen.getByPlaceholder("reps").first().fill("12");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.poll(async () => {
      const s = await getActiveWorkoutSession();
      return s?.activeRestEndsAt ? Math.round((Date.parse(s.activeRestEndsAt) - Date.now()) / 1000) : null;
    }).toBeGreaterThanOrEqual(118);
    const s = await getActiveWorkoutSession();
    expect(Math.round((Date.parse(s!.activeRestEndsAt!) - Date.now()) / 1000)).toBeLessThanOrEqual(120);
  });

  it("UNDO after SAVE puts A back, and RESET TO ORIGINAL brings back the code's A (with UNDO)", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Edit workout A" }).click();
    await screen.getByRole("button", { name: "Leg Press: sets up" }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A saved.");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Undone.");
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);

    await screen.getByRole("button", { name: "Edit Workout A" }).click();
    await screen.getByRole("button", { name: "More for Triceps Pressdown" }).click();
    await screen.getByRole("button", { name: "REMOVE" }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Workout A · edited")).toBeVisible();
    await screen.getByRole("button", { name: "Edit Workout A" }).click();
    await screen.getByRole("button", { name: "RESET TO ORIGINAL" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A is back to the original.");
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await resolveTemplateExercises("A", "STANDARD")).length).toBe(3);
  });

  it("ADD EXERCISE lists his own first, adds in three taps, and SWAP takes a library exercise", async () => {
    await createCustomExercise({ name: "Cable Fly", muscleGroup: "Chest", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Edit workout A" }).click();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await expect.element(screen.getByRole("button", { name: /^Cable Fly/ })).toBeVisible();
    const picker = document.querySelector("[data-routine-picker]")!;
    expect(picker.querySelector(".routine-picker__choice")?.textContent).toContain("Cable Fly");
    await axeClean("picker", picker);
    await noOverflow("picker", picker, "picker");
    await screen.getByRole("button", { name: /^Cable Fly/ }).click();
    expect(rows().at(-1)).toMatch(/.+/);
    await screen.getByRole("button", { name: "More for Leg Press" }).click();
    await screen.getByRole("button", { name: "SWAP" }).click();
    await screen.getByRole("searchbox", { name: "Search" }).fill("hack");
    await expect.element(screen.getByText("Nothing matches “hack”.")).toBeVisible();
    await screen.getByRole("searchbox", { name: "Search" }).fill("back squat");
    await screen.getByRole("button", { name: /^Back Squat/ }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A saved.");
    const next = await resolveTemplateExercises("A", "STANDARD");
    expect(next.map((ex) => ex.name)).toEqual(["Machine Chest Press", "Pec Deck", "Back Squat", "Triceps Pressdown", "Cable Fly"]);
    expect(next[2]).toMatchObject({ exerciseId: "lib-back-squat", sets: 3, repRangeLow: 6, repRangeHigh: 10, incrementLbs: 10 });
  });

  it("refuses a rep range with the low end above the high end before saving", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Edit workout A" }).click();
    // The steppers can't cross: at 8–8 "from" up is disabled.
    for (let i = 0; i < 4; i++) await screen.getByRole("button", { name: "Leg Press: reps to down" }).click();
    await expect.element(screen.getByRole("button", { name: "Leg Press: reps from up" })).toBeDisabled();
    await expect.element(screen.getByRole("button", { name: "Leg Press: reps to down" })).toBeDisabled();
  });

  it("MORE · Custom programs opens the same editor: create from A/B/C movements and the library, rename with UNDO, keyboard move", async () => {
    const screen = await render(<CustomTemplateScreen />);
    await expect.element(screen.getByText("No custom templates yet.")).toBeVisible();
    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await screen.getByRole("textbox", { name: "Name" }).fill("Pull Day");
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await screen.getByRole("button", { name: /^Lat Pulldown/ }).click();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await screen.getByRole("button", { name: /^Face Pull/ }).click();
    await screen.getByRole("checkbox", { name: "Superset with next" }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("group", { name: "My templates" }).getByText("Pull Day", { exact: true })).toBeVisible();
    const [created] = await getCustomTemplates();
    expect(created!.exercises.map((e) => [e.exerciseId, e.supersetWithNext ?? false, e.incrementLbs])).toEqual([["lat-pulldown", true, 5], ["lib-face-pull", false, 5]]);

    await screen.getByRole("button", { name: "Edit Pull Day" }).click();
    await screen.getByRole("textbox", { name: "Name" }).fill("Pull");
    // Keyboard: focus ↓ on the first row and press Enter.
    (document.querySelector('[aria-label="Move Lat Pulldown down"]') as HTMLButtonElement).focus();
    await userEvent.keyboard("{Enter}");
    expect(rows()).toEqual(["lib-face-pull", "lat-pulldown"]);
    await axeClean("more editor", editor());
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Pull saved.");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getCustomTemplates())[0]!.name).toBe("Pull Day");
    expect((await getCustomTemplates())[0]!.exercises.map((e) => e.exerciseId)).toEqual(["lat-pulldown", "lib-face-pull"]);
    await screen.getByRole("button", { name: "ARCHIVE" }).click();
    await expect.element(screen.getByText("No custom templates yet.")).toBeVisible();
  });
});
