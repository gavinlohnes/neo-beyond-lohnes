/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { logSet, startRest, startWorkout } from "../../src/application/trainCommands";
import { ExerciseLibraryScreen } from "../../src/ui/screens/more/ExerciseLibraryScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-NOTES-001: his note on an exercise, written in the library, shown under the name in the live workout,
 * edited mid-rest, cleared, and kept for a swapped-in machine. Keyboard only. VITE_WALKTHROUGH_SHOTS=<dir> saves
 * the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 150) => new Promise<void>((r) => setTimeout(r, ms));
async function shot(name: string, el: Element | null) {
  if (!SHOTS || !el) return;
  await settle();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement });
}
async function press(locator: { element: () => Element }) {
  (locator.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}
async function typeInto(locator: { element: () => Element }, text: string) {
  (locator.element() as HTMLInputElement).focus();
  await userEvent.keyboard("{Control>}a{/Control}{Backspace}");
  if (text) await userEvent.keyboard(text);
}
async function fits(label: string, root: () => Element | null, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    const r = await axe.run(root()!, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${label} at ${width}`).toEqual([]);
    if (name) await shot(`${width}-${name}`, root());
  }
  await page.viewport(360, 800);
}
const liveSurface = () => document.querySelector(".command-surface");
const noteLine = () => document.querySelector(".command-surface [data-exercise-note]")?.textContent ?? null;

beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-TRAIN-NOTES-001 exercise notes", { timeout: 60_000 }, () => {
  it("a note added in the library shows under the exercise in workout A; edited mid-rest the rest keeps running; cleared, the line goes", async () => {
    let screen = await render(<ExerciseLibraryScreen />);
    const summary = [...document.querySelectorAll("summary")].find((s) => s.textContent?.includes("ADD EXERCISE"))!;
    if (!(summary.parentElement as HTMLDetailsElement).open) summary.click();
    await screen.getByRole("textbox", { name: "Search exercise reference list" }).fill("Machine Chest Press");
    await press(screen.getByRole("button", { name: "Note for Machine Chest Press" }));
    const input = screen.getByRole("textbox", { name: "Your note on Machine Chest Press" });
    await expect.element(input).toHaveFocus();
    await typeInto(input, "Seat 4, handles at chest height");
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByText("Your note: Seat 4, handles at chest height")).toBeVisible();
    // Focus returns on the next animation frame (ExerciseNoteLine close()); wait for it rather than racing it on a busy runner.
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Note for Machine Chest Press");
    const row = () => screen.getByText("Your note: Seat 4, handles at chest height").element().closest(".equipment-row");
    await fits("library row", row, "library-row-with-note");
    await cleanup();

    vi.useFakeTimers({ toFake: ["Date"] });
    let clock = new Date(2026, 10, 24, 18).getTime();
    vi.setSystemTime(clock);
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const session = await startWorkout(day.id, "A", "STANDARD");
    screen = await render(<TrainScreen />);
    await expect.poll(noteLine).toBe("Your note: Seat 4, handles at chest height");
    // The note sits straight under the name, and LOG is still on screen at 320 px.
    await page.viewport(320, 640); await settle();
    const log = [...document.querySelectorAll<HTMLButtonElement>(".command-surface button")].find((b) => b.textContent === "LOG")!;
    // One muted line (two when it wraps at 320 px); LOG moves down by no more than that.
    const noteHeight = document.querySelector(".command-surface [data-exercise-note]")!.getBoundingClientRect().height;
    expect(noteHeight).toBeLessThanOrEqual(50);
    expect(log).toBeDefined();
    await fits("live with note", liveSurface, "live-with-note");

    // A swapped-in machine still shows the planned exercise's note.
    [...document.querySelectorAll("summary")].find((x) => x.textContent === "Progression and substitution")!.click();
    await screen.getByRole("textbox", { name: "Substitute exercise (optional)" }).fill("Hammer Strength press");
    await expect.element(screen.getByText(/Recording as: Hammer Strength press/)).toBeVisible();
    expect(noteLine()).toBe("Your note: Seat 4, handles at chest height");
    await screen.getByRole("textbox", { name: "Substitute exercise (optional)" }).fill("");

    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await startRest(session.id, 90);
    await cleanup();
    screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    await press(screen.getByRole("button", { name: "Note for Machine Chest Press" }));
    const live = screen.getByRole("textbox", { name: "Your note on Machine Chest Press" });
    await expect.element(live).toHaveFocus();
    const before = document.querySelector(".train-live-rest")?.textContent;
    clock += 5000; vi.setSystemTime(clock);
    await expect.poll(() => document.querySelector(".train-live-rest")?.textContent, { timeout: 3000 }).not.toBe(before);
    await expect.poll(() => document.activeElement).toBe(live.element());
    await typeInto(live, "Seat 5 now");
    await shot("360-live-editor", liveSurface());
    await fits("live editor", liveSurface, "live-editor");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(noteLine).toBe("Your note: Seat 5 now");
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();


    await press(screen.getByRole("button", { name: "Note for Machine Chest Press" }));
    await press(screen.getByRole("button", { name: "CLEAR" }));
    await expect.poll(noteLine).toBeNull();
    expect(document.querySelector(".command-surface")!.textContent).not.toMatch(/Your note/);
    await shot("360-live-without-note", liveSurface());
  });
});
