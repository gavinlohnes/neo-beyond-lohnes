import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { ExerciseLibraryScreen } from "../../src/ui/screens/more/ExerciseLibraryScreen";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library). Real-browser smoke
 * coverage for the one dedicated management surface, same treatment as
 * JournalScreen.test.tsx — proves it actually mounts and drives real
 * commands, not just that the underlying commands/queries work in
 * isolation (already covered by tests/integration/exerciseLibrary.test.ts).
 */

let consoleErrors: unknown[];
let restoreConsoleError: () => void;

beforeEach(() => {
  consoleErrors = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    original(...args);
  };
  restoreConsoleError = () => {
    console.error = original;
  };
});

afterEach(() => {
  cleanup();
  restoreConsoleError();
});

describe("ExerciseLibraryScreen (real browser)", () => {
  it("renders with no saved exercises and no console errors", async () => {
    const screen = await render(<ExerciseLibraryScreen />);
    await expect.element(screen.getByText("No exercises saved yet.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can add an exercise from the reference library in one tap", async () => {
    const screen = await render(<ExerciseLibraryScreen />);
    const myExercises = screen.getByRole("group", { name: "My exercises" });
    await screen.getByRole("button", { name: "ADD EXERCISE" }).first().click();
    await screen.getByPlaceholder("Search by name, muscle group, or equipment").fill("Barbell Bench Press");
    // exact: true matters here — getByRole's name match is substring by
    // default, and "ADD" is itself a substring of "ADD EXERCISE" (the
    // disclosure's own toggle/submit buttons), so an unqualified match
    // would resolve .first() back to the toggle and re-close the panel
    // instead of hitting this library row's own ADD button.
    await screen.getByRole("button", { name: "ADD", exact: true }).first().click();
    // Scoped to the saved list specifically — "Barbell Bench Press" also
    // legitimately appears in the reference-list picker below (the entry
    // just added from), so an unscoped page-wide text match is ambiguous.
    await expect.element(myExercises.getByText("Barbell Bench Press", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can add a fully custom exercise through the manual form", async () => {
    const screen = await render(<ExerciseLibraryScreen />);
    const myExercises = screen.getByRole("group", { name: "My exercises" });
    await screen.getByRole("button", { name: "ADD EXERCISE" }).first().click();
    await screen.getByPlaceholder("Exercise name").fill("Reverse Lunge to Press");
    await screen.getByPlaceholder("Equipment (e.g. Barbell, Bodyweight)").fill("Kettlebell");
    await screen.getByRole("button", { name: "ADD EXERCISE" }).last().click();
    await expect.element(myExercises.getByText("Reverse Lunge to Press", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("archiving an exercise removes it from the visible list", async () => {
    await createCustomExercise({ name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable", repRangeLow: 8, repRangeHigh: 12 });
    const screen = await render(<ExerciseLibraryScreen />);
    const myExercises = screen.getByRole("group", { name: "My exercises" });
    // "Seated Cable Row" is also a reference-list entry (still browsable,
    // unaffected by what's been saved) — scope to the saved list so this
    // assertion targets the record actually under test, not its source.
    await expect.element(myExercises.getByText("Seated Cable Row", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "ARCHIVE" }).click();
    await expect.element(myExercises.getByText("No exercises saved yet.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
