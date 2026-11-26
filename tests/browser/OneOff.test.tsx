/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveWorkoutSession, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getCustomTemplates } from "../../src/application/customTemplateQueries";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { db } from "../../src/persistence/db";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { WorkoutCall, useWorkoutCallQuestion } from "../../src/ui/screens/today/WorkoutCall";
import type { TonightState } from "../../src/application/tonightQueries";
import type { BeyondDay } from "../../src/domain/common/types";
import { holdToConfirm } from "./helpers/hold";

/**
 * GRAYSON-ONE-OFF-001: an empty workout, SAVE AS ROUTINE, and START / START EMPTY on TODAY.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
const RED = { energy: 1, stress: 5, mood: 1, soreness: 5, alcoholUrge: 0 } as const;
const settle = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
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
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}

function Card({ day, tonight, onOpenTrain }: { day: BeyondDay; tonight: TonightState; onOpenTrain: (d: string) => void }) {
  const question = useWorkoutCallQuestion(day.id, tonight);
  return <WorkoutCall phase="OFF" day={day} tonight={tonight} question={question} workoutLabel="A" minutes={{}} suggestedVariant="STANDARD"
    lastMainSleepMinutes={null} checkInLevel="GREEN" busy={false} onCheckIn={() => {}} onOpenTrain={onOpenTrain as never} onAnswered={() => {}} />;
}
const tonight = (planned: boolean | undefined): TonightState => ({ planned, trained: null, mealsLogged: 0, lastMealAt: null });

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("GRAYSON-ONE-OFF-001 TODAY's START", () => {
  it("a planned day: START sends the planned start, START EMPTY beside it; a rest day shows START EMPTY", async () => {
    const day = await startDay();
    const open = vi.fn();
    let screen = await render(<Card day={day} tonight={tonight(true)} onOpenTrain={open} />);
    const card = () => document.querySelector(".workout-call")!;
    await screen.getByRole("button", { name: "START · A" }).click();
    expect(open).toHaveBeenLastCalledWith("START_PLANNED");
    await screen.getByRole("button", { name: "START EMPTY" }).click();
    expect(open).toHaveBeenLastCalledWith("START_EMPTY");
    await axeClean("planned card", card());
    await noOverflow("planned card", card(), "today-planned");
    await cleanup();

    screen = await render(<Card day={day} tonight={tonight(false)} onOpenTrain={open} />);
    await expect.element(screen.getByText("Not today. A stays next.")).toBeVisible();
    expect(screen.getByRole("button", { name: /^START · / }).elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "START EMPTY" }).click();
    expect(open).toHaveBeenLastCalledWith("START_EMPTY");
    await axeClean("rest-day card", card());
    await noOverflow("rest-day card", card(), "today-rest");
  });

  it("START from TODAY begins the planned workout live, and an open session is resumed, not doubled", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen destination="START_PLANNED" />);
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toBeVisible();
    await expect.element(screen.getByText("Machine Chest Press", { exact: true }).first()).toBeVisible();
    await cleanup();
    await render(<TrainScreen destination="START_PLANNED" />);
    await settle(400);
    expect(await db.workoutSessions.count()).toBe(1);
  });

  it("a RED day still asks the override in TRAIN before anything starts", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const screen = await render(<TrainScreen destination="START_PLANNED" />);
    await expect.element(screen.getByRole("button", { name: "PROCEED ANYWAY" })).toBeVisible();
    expect(await getActiveWorkoutSession()).toBeUndefined();
  });
});

describe("GRAYSON-ONE-OFF-001 an empty workout", () => {
  it("START EMPTY: add two exercises, log, finish, SAVE AS ROUTINE (two taps) with UNDO; the turn stays", async () => {
    await createCustomExercise({ name: "Cable Curl", muscleGroup: "Arms", equipment: "Cable", repRangeLow: 10, repRangeHigh: 15 });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const before = await suggestTemplateForNextWorkout();
    const screen = await render(<TrainScreen destination="START_EMPTY" />);
    await expect.element(screen.getByRole("button", { name: "ADD EXERCISE" })).toBeVisible();
    const session = await getActiveWorkoutSession();
    expect(session?.templateId).toBe("");

    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await screen.getByRole("button", { name: /^Cable Curl/ }).first().click();
    await expect.element(screen.getByRole("heading", { name: "Cable Curl", exact: true })).toBeVisible();
    await screen.getByPlaceholder("lb").first().fill("30");
    await screen.getByPlaceholder("reps").first().fill("12");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 30 lb x 12", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await screen.getByRole("searchbox", { name: "Search" }).fill("pressdown");
    await screen.getByRole("button", { name: /^Triceps Pressdown/ }).first().click();
    await expect.element(screen.getByRole("heading", { name: "Triceps Pressdown", exact: true })).toBeVisible();
    await screen.getByPlaceholder("lb").first().fill("50");
    await screen.getByPlaceholder("reps").first().fill("12");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 50 lb x 12", { exact: true })).toBeVisible();

    await holdToConfirm(screen.getByRole("button", { name: "PARTIAL" }));
    const save = screen.getByRole("group", { name: "Save this workout as a routine" });
    await expect.element(save).toBeVisible();
    expect(screen.getByText("You changed this workout.").elements()).toHaveLength(0);
    await screen.getByRole("button", { name: "SAVE AS ROUTINE" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Routine name" })).toHaveValue(expect.stringMatching(/^Arms · /));
    await axeClean("save as routine", save.element());
    await noOverflow("save as routine", save.element(), "save-routine");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("status").filter({ hasText: "is in your routines" })).toBeVisible();
    const [routine] = await getCustomTemplates();
    expect(routine!.exercises.map((ex) => [ex.name, ex.sets])).toEqual([["Cable Curl", 1], ["Triceps Pressdown", 1]]);
    await shot("360-saved-routine", save.element());
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await getCustomTemplates()).length).toBe(0);
    expect(await suggestTemplateForNextWorkout()).toBe(before);
  });
});
