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
  // GRAYSON-ROUTINE-EDIT-001: creating and editing now open TRAIN's one routine editor (tests/browser/RoutineEdit.test.tsx
  // covers the editor itself). These keep this screen's own promises.
  async function create(screen: Awaited<ReturnType<typeof render>>, name: string, picks: RegExp[]) {
    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await screen.getByRole("textbox", { name: "Name" }).fill(name);
    for (const pick of picks) {
      await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
      await screen.getByRole("button", { name: pick }).click();
    }
  }

  it("renders with no templates and no console errors", async () => {
    const screen = await render(<CustomTemplateScreen />);
    await expect.element(screen.getByText("No custom templates yet.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("with an empty personal library, the bundled library is still there to build from", async () => {
    const screen = await render(<CustomTemplateScreen />);
    await screen.getByRole("button", { name: "CREATE TEMPLATE" }).click();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await expect.element(screen.getByRole("button", { name: /^Barbell Bench Press/ })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can build a template from saved exercises and see it in the list", async () => {
    await createCustomExercise({ name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 });
    const screen = await render(<CustomTemplateScreen />);
    await create(screen, "Pull Day", [/^Barbell Row.*yours/]);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("group", { name: "My templates" }).getByText("Pull Day", { exact: true })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("SUPERSET-001: marks an exercise as a superset with the next one, and the last one can't be", async () => {
    await createCustomExercise({ name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 });
    await createCustomExercise({ name: "Face Pull", muscleGroup: "Shoulders", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    const screen = await render(<CustomTemplateScreen />);
    await create(screen, "Pull pair", [/^Barbell Row.*yours/, /^Face Pull.*yours/]);
    const boxes = screen.getByRole("checkbox", { name: "Superset with next" });
    expect(boxes.elements()).toHaveLength(1);
    await boxes.click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getCustomTemplates())[0]?.exercises.map((e) => e.supersetWithNext ?? false)).toEqual([true, false]);
  });

  it("TEMPLATE-EDIT-001: edits a saved template in place: name, sets and superset, keeping its rep ranges", async () => {
    const row = await createCustomExercise({ name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 });
    const pull = await createCustomExercise({ name: "Face Pull", muscleGroup: "Shoulders", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    const before = await createCustomTemplate({ name: "Pull pair", exercises: [row, pull].map((e) => ({ exerciseId: e.id, name: e.name, sets: 3, repRangeLow: e.repRangeLow, repRangeHigh: e.repRangeHigh, incrementLbs: 5 })) });
    const screen = await render(<CustomTemplateScreen />);

    await screen.getByRole("button", { name: "Edit Pull pair" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Pull pair");
    await screen.getByRole("textbox", { name: "Name" }).fill("Pull superset");
    await screen.getByRole("button", { name: "Barbell Row: sets up" }).click();
    await screen.getByRole("checkbox", { name: "Superset with next" }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();

    await expect.poll(async () => (await getCustomTemplates())[0]?.name).toBe("Pull superset");
    const [after] = await getCustomTemplates();
    expect(after!.id).toBe(before.id);
    expect(after!.exercises.map((e) => [e.exerciseId, e.sets, e.supersetWithNext ?? false])).toEqual([[row.id, 4, true], [pull.id, 3, false]]);
    expect(after!.exercises.map((e) => [e.repRangeLow, e.repRangeHigh, e.incrementLbs])).toEqual(before.exercises.map((e) => [e.repRangeLow, e.repRangeHigh, e.incrementLbs]));
    await expect.element(screen.getByRole("button", { name: "CREATE TEMPLATE" })).toBeVisible();
  });

  it("TEMPLATE-EDIT-001: keeps exercises no longer in the library while editing, and can remove them", async () => {
    const { archiveCustomExercise } = await import("../../src/application/exerciseLibraryCommands");
    const row = await createCustomExercise({ name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", repRangeLow: 6, repRangeHigh: 10 });
    const pull = await createCustomExercise({ name: "Face Pull", muscleGroup: "Shoulders", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    await createCustomTemplate({ name: "Pull pair", exercises: [row, pull].map((e) => ({ exerciseId: e.id, name: e.name, sets: 3, repRangeLow: e.repRangeLow, repRangeHigh: e.repRangeHigh, incrementLbs: 5 })) });
    await archiveCustomExercise(pull.id);
    const screen = await render(<CustomTemplateScreen />);
    await screen.getByRole("button", { name: "Edit Pull pair" }).click();
    await screen.getByRole("button", { name: "More for Face Pull" }).click();
    await screen.getByRole("button", { name: "REMOVE" }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getCustomTemplates())[0]?.exercises.map((e) => e.name)).toEqual(["Barbell Row"]);
  });

  it("TRAIN-PROGRESSION-001: derives a real equipment-based increment through the actual screen, not the old flat placeholder", async () => {
    await createCustomExercise({ name: "Leg Press Machine", muscleGroup: "Legs", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 });
    const screen = await render(<CustomTemplateScreen />);
    await create(screen, "Leg Day", [/^Leg Press Machine/]);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.poll(async () => (await getCustomTemplates()).length).toBe(1);
    const [template] = await getCustomTemplates();
    expect(template!.exercises).toHaveLength(1);
    // Machine equipment -> 10lb (deriveIncrementLbs), not the old flat 5lb placeholder.
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
