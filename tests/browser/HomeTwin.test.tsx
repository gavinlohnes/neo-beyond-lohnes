import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { RoutinesPanel } from "../../src/ui/screens/train/RoutineEditor";
import { getHomeTwinView } from "../../src/application/homeTwin";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-HOME-STRETCH-001 slice C in the routine editor: BUILD TWIN on A, change one pick, SAVE TWIN; then after an
 * edit to A, UPDATE TWIN. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const twin = () => document.querySelector<HTMLElement>(".home-twin");
beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); });

describe("the home twin in the routine editor", () => {
  it("BUILD TWIN proposes lift by lift; he changes one and drops one; SAVE TWIN saves; nothing before that", async () => {
    const screen = await render(<RoutinesPanel workoutActive={false} onChanged={() => {}} onClose={() => {}} />);
    await screen.getByRole("button", { name: "Edit Workout A", exact: true }).click();
    await expect.element(screen.getByText(/None yet\./)).toBeVisible();
    await screen.getByRole("button", { name: "BUILD TWIN", exact: true }).click();
    const heading = screen.getByRole("heading", { name: "Home twin of Workout A" });
    await expect.element(heading).toBeVisible();
    await expect.poll(() => document.activeElement === heading.element()).toBe(true);
    await expect.element(screen.getByText("Machine Chest Press → Incline Push-Up · 3 × 6–15")).toBeVisible();
    await expect.element(screen.getByText(/^Leg Press → Bodyweight Squat/)).toBeVisible();
    expect(await db.customWorkoutTemplates.count()).toBe(0);
    for (const b of twin()!.querySelectorAll("button")) expect(Math.round(b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    expect((await axe.run(twin()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/twin-review-${w}.png`, element: twin()! }); }
    await page.viewport(360, 900);

    await screen.getByRole("combobox", { name: "Home move for Leg Press" }).selectOptions("home-split-squat");
    await screen.getByRole("button", { name: "Drop Pec Deck's home move", exact: true }).click();
    await screen.getByRole("button", { name: "SAVE TWIN", exact: true }).click();
    await expect.element(screen.getByText("Workout A · HOME saved. Start it from HOME on TRAIN.")).toBeVisible();
    const saved = (await getHomeTwinView("A"))!.twin!;
    expect(saved.exercises.map((e) => [e.name, e.sets])).toEqual([["Incline Push-Up", 3], ["Split Squat", 3], ["Close-Grip Push-Up", 2]]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/twin-saved-360.png`, element: twin()! });
  });

  it("after he edits a routine that has a twin, the save line offers UPDATE TWIN, which opens the same review", async () => {
    const screen = await render(<RoutinesPanel workoutActive={false} onChanged={() => {}} onClose={() => {}} />);
    await screen.getByRole("button", { name: "Edit Workout A", exact: true }).click();
    await screen.getByRole("button", { name: "BUILD TWIN", exact: true }).click();
    await screen.getByRole("button", { name: "SAVE TWIN", exact: true }).click();
    await expect.element(screen.getByText(/^Workout A · HOME saved/)).toBeVisible();
    // Edit A: one more set of the chest press, SAVE.
    await screen.getByRole("button", { name: "Machine Chest Press: sets up", exact: true }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText(/^Your home twin still has the old lifts\./)).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/update-twin-360.png`, element: document.querySelector(".home-twin__nudge") as HTMLElement });
    await screen.getByRole("button", { name: "UPDATE TWIN", exact: true }).click();
    await expect.element(screen.getByText("Machine Chest Press → Incline Push-Up · 4 × 6–15")).toBeVisible();
    await screen.getByRole("button", { name: "SAVE TWIN", exact: true }).click();
    await expect.poll(async () => (await getHomeTwinView("A"))!.twin!.exercises[0]!.sets).toBe(7);
  });
});
