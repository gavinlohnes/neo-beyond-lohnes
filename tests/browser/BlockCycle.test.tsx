/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { getBlockState } from "../../src/application/trainingBlock";
import { TrainProgress } from "../../src/ui/screens/train/TrainProgress";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * GRAYSON-BLOCK-CYCLE-001: the brief's phone check in a real browser. START A BLOCK (5 weeks) in 2 taps; TRAIN says
 * the week; week 5 shows fewer sets at the same weights; on the last day the review shows its lines and changes; accept
 * one, UNDO, NEXT BLOCK. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
const settle = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
const at = (m: number, d: number, y = 2026) => new Date(y, m, d, 20, 0);
async function shot(name: string, el: Element | null) { if (SHOTS && el) await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement }); }
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string, root: Element, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, SHOTS ? 1800 : 900); await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(11, 2)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-BLOCK-CYCLE-001 a block on TRAIN", () => {
  it("START A BLOCK in 2 taps; the week shows on TRAIN; week 5 is lighter, with NORMAL THIS WEEK", { timeout: 30_000 }, async () => {
    let screen = await render(<TrainProgress active />);
    await screen.getByRole("button", { name: "START A BLOCK" }).click();
    await expect.element(screen.getByRole("heading", { name: "Start a block" })).toHaveFocus();
    await axeClean("setup", document.querySelector("[data-block-setup]")!);
    await shot("360-setup", document.querySelector("[data-block-setup]"));
    await screen.getByRole("button", { name: "START", exact: true }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Block saved: 5 weeks.");
    await expect.element(screen.getByRole("heading", { name: "Block starts Monday, Dec 7" })).toBeVisible();
    await cleanup();

    vi.setSystemTime(at(11, 9));
    screen = await render(<TrainProgress active />);
    await expect.element(screen.getByRole("heading", { name: "Block · week 1 of 5" })).toBeVisible();
    await cleanup();

    vi.setSystemTime(at(0, 6, 2027));
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("Light week: same weights, fewer sets.")).toBeVisible();
    await expect.element(screen.getByText("Block · week 5 of 5 · light week")).toBeVisible();
    const full = WORKOUT_TEMPLATES.A!.exercises.reduce((t, e) => t + e.sets, 0);
    await expect.element(screen.getByText("prescribed sets", { exact: false })).toBeVisible();
    expect(document.querySelector(".train-suggest-count")?.textContent).not.toContain(`${full} prescribed`);
    await screen.getByRole("button", { name: "NORMAL THIS WEEK" }).click();
    await expect.poll(() => document.querySelector(".train-suggest-count")?.textContent).toContain(`${full} prescribed`);
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
  });

  // Seeds four workouts and checks three widths: real work, so a busy CI runner gets 30 s.
  it("the review on the last day: lines with numbers, ACCEPT with UNDO, SKIP, NEXT BLOCK", { timeout: 30_000 }, async () => {
    const { startBlock } = await import("../../src/application/trainingBlock");
    await startBlock({ weeks: 4, focus: ["Chest"] });
    for (const [d, w] of [[8, 100], [15, 105], [22, 110], [29, 115]] as const) {
      vi.setSystemTime(at(11, d));
      const day = await startDay();
      const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
      await logSet(day.id, s.id, "machine-chest-press", 1, w, 10);
      await completeWorkout(day.id, s.id, "STANDARD", "PARTIAL");
    }
    vi.setSystemTime(at(0, 3, 2027));
    const screen = await render(<TrainProgress active />);
    await screen.getByRole("button", { name: "REVIEW THE BLOCK" }).click();
    const review = () => document.querySelector("[data-block-review]")!;
    await expect.element(screen.getByRole("heading", { name: "Your block review" })).toHaveFocus();
    await expect.element(screen.getByText("Sessions: 4 done.")).toBeVisible();
    await expect.element(screen.getByText(/^Main lifts \(estimated 1RM\): Machine Chest Press/)).toBeVisible();
    await axeClean("review", review());
    await noOverflow("review", review(), "review");
    await screen.getByRole("button", { name: "Accept: Add one set to Machine Chest Press." }).click();
    await expect.poll(async () => (await resolveTemplateExercises("A", "STANDARD"))[0]!.sets).toBe(4);
    await shot("360-accepted", review());
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(async () => (await resolveTemplateExercises("A", "STANDARD"))[0]!.sets).toBe(3);
    await screen.getByRole("button", { name: "Skip: Add one set to Machine Chest Press." }).click();
    expect((await resolveTemplateExercises("A", "STANDARD"))[0]!.sets).toBe(3);
    await screen.getByRole("button", { name: "NEXT BLOCK" }).click();
    await expect.poll(async () => (await getBlockState()).block?.startDate).toBe("2027-01-04");
  });
});
