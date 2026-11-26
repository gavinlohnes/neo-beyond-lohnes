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
 * GRAYSON-TRAIN-HOWTO-001: HOW TO from the exercise library and from the live workout. VITE_WALKTHROUGH_SHOTS=<dir>
 * saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const sheet = () => document.querySelector("[data-howto-sheet]") as HTMLElement | null;
async function settle(ms = 120) { await new Promise<void>((r) => setTimeout(r, ms)); }
async function shot(name: string) {
  if (!SHOTS) return;
  await settle();
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}
async function axeClean(label: string) {
  const r = await axe.run(sheet()!, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
/** The library rows sit in the ADD EXERCISE disclosure; search narrows them to one. */
async function findInLibrary(screen: Awaited<ReturnType<typeof render>>, name: string) {
  const summary = [...document.querySelectorAll("summary")].find((s) => s.textContent?.includes("ADD EXERCISE"));
  if (summary && !(summary.parentElement as HTMLDetailsElement).open) summary.click();
  await screen.getByRole("textbox", { name: "Search exercise reference list" }).fill(name);
}
async function noOverflow(label: string, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 800);
    await settle();
    expect(sheet()!.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(sheet()!.clientWidth);
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name && width !== 360) await shot(`${width}-${name}`);
  }
  await page.viewport(360, 800);
}

beforeEach(async () => {
  await page.viewport(360, 800);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("GRAYSON-TRAIN-HOWTO-001 HOW TO", () => {
  it("opens from the library by keyboard, links to ACE in a new tab, edits, survives a reload and resets", async () => {
    let screen = await render(<ExerciseLibraryScreen />);
    await findInLibrary(screen, "Seated Cable Row");
    const open = screen.getByRole("button", { name: "How to do Seated Cable Row" });
    await expect.element(open).toBeVisible();
    (open.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("dialog", { name: "Seated Cable Row" })).toBeVisible();
    await expect.poll(() => document.activeElement).toBe(sheet());
    await expect.element(screen.getByText("Horizontal pull · back and arms")).toBeVisible();
    const watch = screen.getByRole("link", { name: /WATCH ON ACE/ });
    expect(watch.element().getAttribute("href")).toBe("https://www.acefitness.org/resources/everyone/exercise-library/48/seated-row/");
    expect(watch.element().getAttribute("target")).toBe("_blank");
    expect(watch.element().getAttribute("rel")).toContain("noopener");
    await axeClean("sheet");
    await shot("360-sheet");
    await noOverflow("sheet", "sheet");

    await screen.getByRole("button", { name: "EDIT" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Setup" })).toHaveFocus();
    await screen.getByRole("textbox", { name: "Setup" }).fill("Seat at notch 4, chest pad touching.");
    await screen.getByRole("textbox", { name: "Cue 1" }).fill("Elbows past the ribs");
    await axeClean("edit");
    await shot("360-edit");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Saved as your version.")).toBeVisible();
    await expect.element(screen.getByText("Horizontal pull · back and arms · your version")).toBeVisible();

    // Reload: his version is still there.
    await cleanup();
    screen = await render(<ExerciseLibraryScreen />);
    await findInLibrary(screen, "Seated Cable Row");
    await screen.getByRole("button", { name: "How to do Seated Cable Row" }).click();
    await expect.element(screen.getByText("Seat at notch 4, chest pad touching.")).toBeVisible();
    await expect.element(screen.getByText("Elbows past the ribs")).toBeVisible();
    await screen.getByRole("button", { name: "RESET" }).click();
    await expect.element(screen.getByText("Back to the original guide.")).toBeVisible();
    await expect.element(screen.getByText("Sit braced with a neutral torso and begin with the cable taut.")).toBeVisible();

    // Escape closes and returns focus to HOW TO.
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => sheet()).toBeNull();
    await expect.poll(() => (document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("How to do Seated Cable Row");
  });

  it("shows no link where none is set", async () => {
    const screen = await render(<ExerciseLibraryScreen />);
    await findInLibrary(screen, "Pec Deck");
    await screen.getByRole("button", { name: "How to do Pec Deck", exact: true }).click();
    await expect.element(screen.getByText("No video link for this one yet. EDIT to add one.")).toBeVisible();
    expect(screen.getByRole("link", { name: /WATCH/ }).elements()).toHaveLength(0);
  });

  it("opens over the live workout while rest keeps counting behind it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let clock = new Date(2026, 10, 24, 18).getTime();
    vi.setSystemTime(clock);
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const session = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await startRest(session.id, 90);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "How to do Machine Chest Press" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Machine Chest Press" })).toBeVisible();
    await expect.element(screen.getByText("Set the seat so the handles begin around mid-chest. Keep your upper back supported and feet planted.")).toBeVisible();
    const before = document.querySelector(".train-live-rest")?.textContent;
    clock += 5000; vi.setSystemTime(clock);
    await expect.poll(() => document.querySelector(".train-live-rest")?.textContent, { timeout: 3000 }).not.toBe(before);
    // TRAIN re-rendering every second never pulls focus out of the open sheet.
    await expect.poll(() => sheet()!.contains(document.activeElement)).toBe(true);
    await axeClean("live sheet");
    await shot("360-sheet-over-live-workout-in-rest");
    await noOverflow("live sheet", "sheet-over-live-workout-in-rest");
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.poll(() => sheet()).toBeNull();
  });
});
