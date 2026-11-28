/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { getCustomExercises } from "../../src/application/exerciseLibraryQueries";
import { startRest, startWorkout } from "../../src/application/trainCommands";
import { EXERCISE_LIBRARY } from "../../src/domain/workout/exerciseLibrary";
import { ExerciseLibraryScreen } from "../../src/ui/screens/more/ExerciseLibraryScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-BODYMAP-001: tap a muscle to find its exercises (library and live-workout swap). The figure is
 * BEYOND's own; every region is also a button. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 150) => new Promise<void>((r) => setTimeout(r, ms));
const map = () => document.querySelector("[data-body-map]") as HTMLElement | null;
async function shot(name: string) { if (SHOTS && map()) { await settle(); await page.screenshot({ path: `${SHOTS}/${name}.png`, element: map()! }); } }
async function checks(label: string, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    // Legible at 320: the figure is at least 260 px wide and every group has a 44 px button.
    expect(document.querySelector(".body-map__svg")!.getBoundingClientRect().width, `${label} figure at ${width}`).toBeGreaterThanOrEqual(260);
    for (const b of map()!.querySelectorAll<HTMLElement>("button")) expect(b.getBoundingClientRect().height, `${b.textContent} at ${width}`).toBeGreaterThanOrEqual(44);
    const small = [...map()!.querySelectorAll<HTMLElement>("p, h3, h4, button, label")].filter((el) => el.checkVisibility() && Number.parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.textContent);
    expect(small, `${label} small text at ${width}`).toEqual([]);
    const r = await axe.run(map()!, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${label} at ${width}`).toEqual([]);
    if (name) await shot(`${width}-${name}`);
  }
  await page.viewport(360, 900);
}
const listed = () => [...document.querySelectorAll("[data-body-map] [data-entry]")].map((e) => e.getAttribute("data-entry"));

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-TRAIN-BODYMAP-001 body map", { timeout: 60_000 }, () => {
  it("in the library: tapping each region lists its exercises, the list buttons work by keyboard, equipment narrows", async () => {
    await createCustomExercise({ name: "Hammer Strength Press", muscleGroup: "Chest", equipment: "Machine", repRangeLow: 8, repRangeHigh: 12 });
    const screen = await render(<ExerciseLibraryScreen />);
    await screen.getByRole("button", { name: "BY MUSCLE" }).click();
    await expect.element(screen.getByRole("heading", { name: "Exercises by muscle" })).toBeVisible();

    for (const region of ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs", "Glutes"]) {
      (document.querySelector(`[data-region="${region}"]`) as SVGGElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const expected = EXERCISE_LIBRARY.filter((e) => e.muscleGroup === region).map((e) => e.id);
      // Library entries, by membership: GRAYSON-HOME-STRETCH-001's home moves are library entries under home-* ids.
      const libraryIds = new Set(EXERCISE_LIBRARY.map((e) => e.id));
      await expect.poll(() => listed().filter((id) => libraryIds.has(id!))).toEqual(expected);
      expect(document.querySelector(`[data-region="${region}"]`)!.classList.contains("body-map__region--selected")).toBe(true);
    }

    // The keyboard way in: a button per group, with its count.
    const fullBody = screen.getByRole("button", { name: `Full Body, ${EXERCISE_LIBRARY.filter((e) => e.muscleGroup === "Full Body").length} exercises` });
    (fullBody.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(fullBody).toHaveAttribute("aria-pressed", "true");
    const chest = screen.getByRole("button", { name: /^Chest, \d+ exercises$/ });
    (chest.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const custom = (await getCustomExercises())[0]!;
    await expect.poll(() => listed()[0]).toBe(custom.id);
    await expect.element(screen.getByText("Machine · yours")).toBeVisible();
    await checks("library chest", "map-chest");

    await screen.getByRole("button", { name: "Machine", exact: true }).click();
    await expect.poll(() => [...document.querySelectorAll("[data-body-map] [data-entry] .body-map__line")].every((p) => p.textContent!.startsWith("Machine"))).toBe(true);
    expect(JSON.parse(localStorage.getItem("beyond.bodyMap.v1")!)).toEqual({ equipment: ["Machine"] });
    await checks("equipment filter", "map-chest-machine");

    // His own exercise's group is his to change from the list.
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Group for Hammer Strength Press" }).element() as HTMLSelectElement, "Shoulders");
    await expect.poll(async () => (await getCustomExercises())[0]!.muscleGroup).toBe("Shoulders");
    await expect.poll(() => listed().includes(custom.id)).toBe(false);

    await screen.getByRole("button", { name: "How to do Machine Chest Press" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Machine Chest Press" })).toBeVisible();
  });

  it("FIND BY MUSCLE opens on the current exercise's group mid-rest, and a pick fills the swap like a quick-pick", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let clock = new Date(2026, 10, 24, 18).getTime();
    vi.setSystemTime(clock);
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const session = await startWorkout(day.id, "A", "STANDARD");
    await startRest(session.id, 90);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    [...document.querySelectorAll("summary")].find((x) => x.textContent === "Progression and substitution")!.click();
    await screen.getByRole("button", { name: "FIND BY MUSCLE" }).click();
    await expect.element(screen.getByRole("button", { name: /^Chest, \d+ exercises$/ })).toHaveAttribute("aria-pressed", "true");
    await shot("360-find-by-muscle-live");
    await checks("live swap", "find-by-muscle-live");

    const before = document.querySelector(".train-live-rest")?.textContent;
    clock += 5000; vi.setSystemTime(clock);
    await expect.poll(() => document.querySelector(".train-live-rest")?.textContent, { timeout: 3000 }).not.toBe(before);

    await screen.getByRole("button", { name: "Swap in Cable Crossover" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Substitute exercise (optional)" })).toHaveValue("Cable Crossover");
    await expect.element(screen.getByText(/Recording as: Cable Crossover/)).toBeVisible();
    expect(map()).toBeNull();
  });
});
