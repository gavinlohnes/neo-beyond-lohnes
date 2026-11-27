/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveWorkoutSession, getPerformedSets } from "../../src/application/trainQueries";
import { saveRoutineEdit } from "../../src/application/routineEditCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { applyRoutineEdit } from "../../src/domain/workout/routineEdit";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { RoutineEditor } from "../../src/ui/screens/train/RoutineEditor";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * GRAYSON-SET-TYPES-001: the brief's phone check in a real browser. Pick Failure on a set: it shows "to failure". Log
 * a working set, tap ADD DROP: a lighter set appears with no rest timer. Mark an exercise Timed, START, hold, DONE: it
 * logs the time and buzzed once at the target. 320 px and axe. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
const FIRST = WORKOUT_TEMPLATES.A!.exercises[0]!;
const settle = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
async function shot(name: string, el: Element | null) { if (SHOTS && el) await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement }); }
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function fits(label: string, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, SHOTS ? 1800 : 900); await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, document.querySelector(".train-screen, main") ?? document.body);
  }
  await page.viewport(360, 900);
}
async function startA() {
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "START WORKOUT" }).click();
  await expect.element(screen.getByRole("button", { name: "LOG" }).first()).toBeVisible();
  return screen;
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("GRAYSON-SET-TYPES-001 set kinds on TRAIN", () => {
  it("pick Failure: it logs with 0 left and says to failure; ADD DROP adds a lighter set with no rest timer", { timeout: 30_000 }, async () => {
    const screen = await startA();
    // One tap on Failure, and the picker says what it does.
    await screen.getByRole("radio", { name: "Failure" }).first().click();
    await expect.element(screen.getByText("A working set to failure: 0 reps left. Counts like any working set.").first()).toBeVisible();
    await axeClean("picker", document.querySelector(".set-kind")!.closest("div")!);
    await userEvent.fill(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }), "100");
    await userEvent.fill(screen.getByRole("spinbutton", { name: "Set 1 repetitions" }), "8");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("· to failure").first()).toBeVisible();
    const session = (await getActiveWorkoutSession())!;
    expect((await getPerformedSets(session.id)).find((s) => s.setKind === "FAILURE")).toMatchObject({ setNumber: 1, weight: 100, reps: 8, repsInReserve: 0 });
    // The failure set started rest; ADD DROP stops it and logs 20% lighter, same reps, at once.
    expect((await getActiveWorkoutSession())!.activeRestEndsAt).toBeTruthy();
    await screen.getByRole("button", { name: "Add a drop set after set 1" }).click();
    await expect.element(screen.getByText("drop — 80 lb x 8")).toBeVisible();
    expect((await getActiveWorkoutSession())!.activeRestEndsAt ?? null).toBeNull();
    const sets = await getPerformedSets(session.id);
    expect(sets.find((s) => s.setKind === "DROP")).toMatchObject({ setNumber: 1, weight: 80, reps: 8, dropOf: sets.find((s) => s.setKind === "FAILURE")!.id });
    // Set 2 is still the next one to log.
    await expect.element(screen.getByRole("spinbutton", { name: "Set 2 weight in pounds" })).toBeVisible();
    await axeClean("logged with drop", document.querySelector(".train-drop-row")!.parentElement!);
    await fits("set kinds", "kinds");
  });

  it("a timed exercise: START counts up, buzzes once at the target, DONE logs the time held", { timeout: 30_000 }, async () => {
    await saveRoutineEdit("A", { exercises: applyRoutineEdit(WORKOUT_TEMPLATES.A!.exercises, { kind: "SET", index: 0, change: { measure: "TIME", targetSec: 5 } }) });
    expect((await resolveTemplateExercises("A", "STANDARD"))[0]).toMatchObject({ measure: "TIME", targetSec: 5 });
    const vibrate = vi.spyOn(navigator, "vibrate").mockReturnValue(true);
    const screen = await startA();
    await expect.element(screen.getByText("Target 0:05")).toBeVisible();
    expect(document.querySelector('[aria-label="Set 1 repetitions"]')).toBeNull();
    await axeClean("timed set", document.querySelector("[data-timed-set]")!);
    vibrate.mockClear();
    await screen.getByRole("button", { name: "START SET 1" }).click();
    await expect.element(screen.getByRole("timer")).toHaveTextContent("0:00");
    await shot("360-timed-running", document.querySelector("[data-timed-set]"));
    // Hold past the target: one buzz, the rest timer's pattern.
    await expect.poll(() => vibrate.mock.calls.length, { timeout: 8000, interval: 200 }).toBe(1);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    await expect.element(screen.getByText("Target reached.")).toBeVisible();
    await settle(1100);
    expect(vibrate).toHaveBeenCalledTimes(1);
    await screen.getByRole("button", { name: "DONE" }).click();
    const session = (await getActiveWorkoutSession())!;
    await expect.poll(async () => (await getPerformedSets(session.id)).find((s) => s.exerciseId === FIRST.exerciseId)?.durationSec ?? 0).toBeGreaterThanOrEqual(5);
    const set = (await getPerformedSets(session.id)).find((s) => s.exerciseId === FIRST.exerciseId)!;
    expect(set.reps).toBe(0);
    await expect.element(screen.getByText(/held 0:0[5-9]/).first()).toBeVisible();
    // He can type the time instead: set 2.
    await userEvent.fill(screen.getByRole("spinbutton", { name: "Set 2 seconds held" }), "42");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText(/held 0:42/)).toBeVisible();
    await fits("timed", "timed");
  });

  it("the routine editor's Timed switch swaps the rep range for a target time", { timeout: 30_000 }, async () => {
    const { getRoutineView } = await import("../../src/application/routineEditQueries");
    const routine = (await getRoutineView("A"))!;
    const screen = await render(<RoutineEditor routine={routine} workoutActive={false} onCancel={() => {}} onDone={() => {}} />);
    await screen.getByRole("checkbox", { name: "Timed (hold for time)" }).first().click();
    await expect.element(screen.getByRole("group", { name: `${FIRST.name}: target time` })).toBeVisible();
    await expect.element(screen.getByText("0:30")).toBeVisible();
    await screen.getByRole("button", { name: `${FIRST.name}: target time up by 5 seconds` }).click();
    await expect.element(screen.getByText("0:35")).toBeVisible();
    await axeClean("routine editor timed", document.querySelector(".routine-editor")!);
    await shot("360-routine-timed", document.querySelector(".routine-editor"));
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.poll(async () => (await resolveTemplateExercises("A", "STANDARD"))[0]).toMatchObject({ measure: "TIME", targetSec: 35 });
  });
});
