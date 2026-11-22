import { startDay, submitCheckIn } from "../../src/application/commands";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { afterEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { getTrainingProgramme } from "../../src/application/trainingProgramme";
import { db } from "../../src/persistence/db";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("sets a programme, starts its template through TRAIN, and clears it at 360px without changing the workout", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 17));
  await page.viewport(360, 900);
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "EDIT PROGRAMME", exact: true }).click();
  await screen.getByRole("combobox", { name: "Programme mode" }).selectOptions("WEEKDAYS");
  await screen.getByRole("combobox", { name: "Monday", exact: true }).selectOptions("A");
  expect((await getTrainingProgramme()).programme).toBeNull();
  await screen.getByRole("button", { name: "SAVE PROGRAMME", exact: true }).click();
  await expect.element(screen.getByText(/^Planned today: Workout A/)).toBeVisible();
  expect(await db.workoutSessions.count()).toBe(0);
  const panel = screen.getByRole("region", { name: "My programme", exact: true });
  expect((await axe.run(panel.element())).violations).toEqual([]);
  await screen.getByRole("button", { name: "START PLANNED WORKOUT", exact: true }).click();
  await expect.poll(() => db.workoutSessions.count()).toBe(1);
  expect((await db.workoutSessions.toArray())[0]!.templateId).toBe("A");
  await screen.getByRole("button", { name: "EDIT PROGRAMME", exact: true }).click();
  await screen.getByRole("button", { name: "CONFIRM CLEAR PROGRAMME", exact: true }).click();
  await expect.poll(async () => (await getTrainingProgramme()).programme).toBeNull();
  expect(await db.workoutSessions.count()).toBe(1);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("a planned STANDARD session still requires the existing RED override confirmation", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 17));
  await page.viewport(360, 900);
  const day = await startDay(); await submitCheckIn(day.id, { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "1": "A" } }, null);
  const before = await db.recommendations.toArray();
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "START PLANNED WORKOUT", exact: true }).click();
  await expect.element(screen.getByText("CONFIRM OVERRIDE", { exact: true })).toBeVisible();
  expect(await db.workoutSessions.count()).toBe(0);
  await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
  expect(await db.recommendations.toArray()).toEqual(before);
  await screen.getByRole("button", { name: "START PLANNED WORKOUT", exact: true }).click();
  await screen.getByRole("button", { name: "PROCEED ANYWAY", exact: true }).click();
  await expect.poll(() => db.workoutSessions.count()).toBe(1);
  expect((await db.workoutSessions.toArray())[0]!.templateId).toBe("A");
});

it("reviews and activates three saved workouts, shows evidence, and starts the next member at 360px", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 17));
  await page.viewport(360, 900);
  const templates = await createCustomTemplateSet((["Grayson A", "Grayson B", "Grayson C"] as const).map((name, index) => ({
    name,
    exercises: WORKOUT_TEMPLATES[["A", "B", "C"][index] as "A" | "B" | "C"]!.exercises,
  })));
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "ACTIVATE A → B → C", exact: true }).click();
  await expect.element(screen.getByRole("group", { name: "Review A → B → C activation" })).toBeVisible();
  await screen.getByRole("combobox", { name: "Sequence A", exact: true }).selectOptions(templates[0]!.id);
  await screen.getByRole("combobox", { name: "Sequence B", exact: true }).selectOptions(templates[1]!.id);
  await screen.getByRole("combobox", { name: "Sequence C", exact: true }).selectOptions(templates[2]!.id);
  await expect.element(screen.getByText("A · Grayson A", { exact: true })).toBeVisible();
  expect((await getTrainingProgramme()).programme).toBeNull();
  await screen.getByRole("button", { name: "CONFIRM ACTIVATION", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Next: A · Grayson A", exact: true })).toBeVisible();
  await expect.element(screen.getByText(/Sequence activated with A selected first/)).toBeVisible();
  const saved = (await getTrainingProgramme()).programme;
  expect(saved?.mode).toBe("SEQUENCE");
  expect(saved?.mode === "SEQUENCE" ? saved.members.map((member) => member.templateId) : []).toEqual(templates.map((template) => template.id));
  const panel = screen.getByRole("region", { name: "My programme", exact: true });
  expect((await axe.run(panel.element())).violations).toEqual([]);
  await screen.getByRole("button", { name: "START NEXT · A", exact: true }).click();
  await expect.poll(() => db.workoutSessions.count()).toBe(1);
  expect((await db.workoutSessions.toArray())[0]!.templateId).toBe(templates[0]!.id);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});
