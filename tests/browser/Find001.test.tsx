import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { noteShiftHandoff, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { createSavedMeal } from "../../src/application/nutritionCommands";

/** FIND-001: the top-bar icon opens search on every primary screen; a result opens where it lives. */

afterEach(() => {
  cleanup();
});

async function chestSession(weight: number) {
  const day = await startDay();
  const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, s.id, "machine-chest-press", 1, weight, 10);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
  return day;
}

async function searchFromTopBar(screen: Awaited<ReturnType<typeof render>>, text: string) {
  await screen.getByRole("button", { name: "Search everything" }).click();
  await screen.getByRole("textbox", { name: "Search everything" }).fill(text);
}

describe("FIND-001", () => {
  it("the top-bar search icon opens SEARCH from TODAY, TRAIN, BODY and MORE", async () => {
    await startDay();
    const screen = await render(<App />);
    for (const tab of ["TODAY", "TRAIN", "BODY", "MORE"]) {
      await screen.getByRole("button", { name: tab, exact: true }).click();
      await screen.getByRole("button", { name: "Search everything" }).click();
      await expect.element(screen.getByText("MORE // SEARCH")).toBeVisible();
    }
  });

  it("a LIFT result opens TRAIN → RECORDS at that lift's curve", async () => {
    await chestSession(100);
    await chestSession(110);
    const screen = await render(<App />);
    await searchFromTopBar(screen, "chest");
    await screen.getByRole("button", { name: "Open LIFT: Machine Chest Press" }).click();
    await expect.element(screen.getByRole("img", { name: /Strength curve/ })).toBeVisible();
    expect(document.querySelector('[aria-current="page"]')!.textContent).toContain("TRAIN");
  });

  it("a NOTE result opens HISTORY with its day open", async () => {
    const day = await chestSession(100);
    await noteShiftHandoff(day.id, "Gate code changed to 4412");
    const screen = await render(<App />);
    await searchFromTopBar(screen, "gate");
    await screen.getByRole("button", { name: /^Open NOTE: Gate code/ }).click();
    await expect.element(screen.getByText("MORE // HISTORY")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "HIDE" })).toBeVisible();
  });

  it("a MEAL result opens BODY with the meal entry open", async () => {
    await startDay();
    await createSavedMeal({ name: "Overnight oats", calories: 400, proteinG: 30, carbsG: 50, fatG: 10 });
    const screen = await render(<App />);
    await searchFromTopBar(screen, "oats");
    await screen.getByRole("button", { name: "Open MEAL: Overnight oats" }).click();
    await expect.element(screen.getByText("HIDE ADD MEAL")).toBeVisible();
  });
});
