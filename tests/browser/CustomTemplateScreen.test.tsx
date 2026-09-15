import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { CustomTemplateScreen } from "../../src/ui/screens/more/CustomTemplateScreen";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { createCustomTemplate } from "../../src/application/customTemplateCommands";
import { getCustomTemplates } from "../../src/application/customTemplateQueries";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates). Real-browser smoke
 * coverage for the one dedicated management surface, same treatment as
 * ExerciseLibraryScreen.test.tsx — proves it actually mounts and drives
 * real commands, not just that the underlying commands/queries work in
 * isolation (already covered by tests/integration/customWorkoutTemplates.test.ts).
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

describe("CustomTemplateScreen (real browser)", () => {
  it("renders with no templates and no console errors", async () => {
    const screen = await render(<CustomTemplateScreen />);
    await expect.element(screen.getByText("No custom templates yet.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("prompts to add exercises first when the library is empty", async () => {
    const screen = await render(<CustomTemplateScreen />);
    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await expect
      .element(screen.getByText("You don't have any saved exercises yet", { exact: false }))
      .toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can build a template from saved exercises and see it in the list", async () => {
    await createCustomExercise({ name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 });
    const screen = await render(<CustomTemplateScreen />);
    const myTemplates = screen.getByRole("group", { name: "My templates" });

    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await screen.getByPlaceholder("Template name").fill("Pull Day");
    await screen.getByRole("button", { name: "Barbell Row (Back)" }).click();
    await screen.getByRole("button", { name: "SAVE TEMPLATE" }).click();

    await expect.element(myTemplates.getByText("Pull Day", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("TRAIN-PROGRESSION-001: derives a real equipment-based increment through the actual screen, not the old flat placeholder", async () => {
    await createCustomExercise({ name: "Leg Press Machine", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 });
    const screen = await render(<CustomTemplateScreen />);

    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await screen.getByPlaceholder("Template name").fill("Leg Day");
    await screen.getByRole("button", { name: "Leg Press Machine (Legs)" }).click();
    await screen.getByRole("button", { name: "SAVE TEMPLATE" }).click();

    const [template] = await getCustomTemplates();
    expect(template!.exercises).toHaveLength(1);
    // Machine equipment -> 10lb (deriveIncrementLbs), not the old flat 5lb
    // placeholder every equipment type used to get regardless of what it was.
    expect(template!.exercises[0]!.incrementLbs).toBe(10);
    expect(consoleErrors).toEqual([]);
  });

  it("archiving a template removes it from the visible list", async () => {
    await createCustomTemplate({
      name: "Leg Day",
      exercises: [{ exerciseId: "x", name: "X", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 }],
    });
    const screen = await render(<CustomTemplateScreen />);
    const myTemplates = screen.getByRole("group", { name: "My templates" });
    await expect.element(myTemplates.getByText("Leg Day", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "ARCHIVE" }).click();
    await expect.element(myTemplates.getByText("No custom templates yet.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
