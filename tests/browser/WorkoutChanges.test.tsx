/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { holdToConfirm } from "./helpers/hold";

/**
 * GRAYSON-WORKOUT-CHANGES-001: the brief's phone check in a real browser. In A, SWAP the chest press: three chest moves
 * with last numbers. Pick one, log it, add a cable fly. Finish: "You changed this workout." KEEP FOR NEXT TIME. Next A
 * has both changes; UNDO puts A back. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
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
    await page.viewport(width, SHOTS ? 2000 : 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("GRAYSON-WORKOUT-CHANGES-001 changes in the live workout", () => {
  it("SWAP shows three chest moves with last numbers; swap, log, add, finish, KEEP; next A has both; UNDO puts A back", async () => {
    await createCustomExercise({ name: "Cable Fly", muscleGroup: "Chest", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    // An earlier workout with a dumbbell press, so it has last numbers.
    const earlier = await startDay();
    const past = await startWorkout(earlier.id, "B", "STANDARD", { overrideConfirmed: true });
    await logSet(earlier.id, past.id, "lat-pulldown", 1, 100, 10);
    await completeWorkout(earlier.id, past.id, "STANDARD", "PARTIAL");
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toBeVisible();

    await screen.getByRole("button", { name: "Swap Machine Chest Press" }).click();
    await expect.element(screen.getByRole("heading", { name: "Swap Machine Chest Press" })).toHaveFocus();
    const sheet = () => document.querySelector("[data-swap-sheet]")!;
    await expect.poll(() => sheet().querySelectorAll(".routine-picker__choice").length).toBe(3);
    expect(sheet().textContent).toContain("Same muscle: Chest");
    expect([...sheet().querySelectorAll(".routine-picker__choice")].every((b) => /Chest · .+ · (Last: .+|Not done yet)/.test(b.textContent ?? ""))).toBe(true);
    await axeClean("swap sheet", sheet());
    await noOverflow("swap sheet", sheet(), "swap");

    // His own Cable Fly (cable, used lately) ranks first; swap to another and add the fly after.
    const choices = [...sheet().querySelectorAll(".routine-picker__choice")].map((b) => b.querySelector("span")!.textContent!);
    expect(choices[0]).toBe("Cable Fly");
    const picked = choices.find((name) => name !== "Cable Fly")!;
    await screen.getByRole("button", { name: new RegExp(`^${picked}`) }).click();
    await expect.element(screen.getByRole("heading", { name: picked, exact: true })).toBeVisible();
    await expect.element(screen.getByText("Exercise 1 of 4", { exact: true })).toBeVisible();
    await screen.getByPlaceholder("lb").first().fill("50");
    await screen.getByPlaceholder("reps").first().fill("12");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 50 lb x 12", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "ADD EXERCISE" }).click();
    await screen.getByRole("button", { name: /^Cable Fly/ }).first().click();
    await expect.element(screen.getByRole("button", { name: /^Cable Fly — 0 of 3 sets/ })).toBeVisible();

    await holdToConfirm(screen.getByRole("button", { name: "PARTIAL" }));
    const keep = screen.getByRole("group", { name: "Changes to this workout" });
    await expect.element(keep).toHaveTextContent("You changed this workout.");
    await axeClean("keep line", keep.element());
    await shot("360-keep", keep.element());
    await screen.getByRole("button", { name: "KEEP FOR NEXT TIME" }).click();
    await expect.element(screen.getByRole("status").filter({ hasText: "will start this way next time" })).toBeVisible();
    await shot("360-kept", keep.element());

    const next = await resolveTemplateExercises("A", "STANDARD");
    expect(next[0]!.name).toBe(picked);
    expect(next.map((ex) => ex.name)).toContain("Cable Fly");
    expect(next.map((ex) => ex.name)).not.toContain("Machine Chest Press");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => JSON.stringify(await resolveTemplateExercises("A", "STANDARD"))).toBe(JSON.stringify(WORKOUT_TEMPLATES.A!.exercises));
  });

  it("asks nothing when nothing changed, and JUST TODAY leaves A as it was", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START WORKOUT" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toBeVisible();
    await screen.getByPlaceholder("lb").first().fill("100");
    await screen.getByPlaceholder("reps").first().fill("10");
    await screen.getByRole("button", { name: "LOG" }).first().click();
    await expect.element(screen.getByText("#1 — 100 lb x 10", { exact: true })).toBeVisible();
    // Remove an exercise from today, then finish.
    await screen.getByRole("button", { name: /^Triceps Pressdown — / }).click();
    await screen.getByRole("button", { name: "Swap Triceps Pressdown" }).click();
    await screen.getByRole("button", { name: "REMOVE FROM TODAY" }).click();
    await expect.element(screen.getByRole("button", { name: /^Triceps Pressdown — / })).not.toBeInTheDocument();
    await holdToConfirm(screen.getByRole("button", { name: "PARTIAL" }));
    await screen.getByRole("button", { name: "JUST TODAY" }).click();
    await expect.element(screen.getByText("Just today. A stays as it was.")).toBeVisible();
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
  });
});
