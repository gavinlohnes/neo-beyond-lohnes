import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { buildSequenceProgramme } from "../../src/application/trainingProgrammeQueries";
import { getTrainingProgramme, saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-HOME-STRETCH-001 slice A on TRAIN: SET UP HOME, USE THESE, then START AT HOME in one tap; without a
 * sequence, HOME A, B and C offered directly. VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const region = () => document.querySelector<HTMLElement>(".home-start");

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 2, 17));
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

async function sequence() {
  const gym = await createCustomTemplateSet((["Gym A", "Gym B", "Gym C"] as const).map((name, i) => ({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
  await saveTrainingProgramme(buildSequenceProgramme(gym.map((t) => t.id) as [string, string, string], gym, gym[1]!.id), null);
  return gym;
}

describe("HOME on TRAIN", () => {
  it("first use: SET UP HOME, one review, nothing links until USE THESE; then START AT HOME · B starts HOME B", async () => {
    const gym = await sequence();
    const screen = await render(<TrainScreen />);
    const setUp = screen.getByRole("button", { name: "SET UP HOME", exact: true });
    await expect.element(setUp).toBeVisible();
    const revision = (await getTrainingProgramme()).id;
    await setUp.click();
    const review = screen.getByRole("heading", { name: "A → HOME A, B → HOME B, C → HOME C. Use these?" });
    await expect.element(review).toBeVisible();
    await expect.poll(() => document.activeElement === review.element()).toBe(true);
    expect((await getTrainingProgramme()).id).toBe(revision); // nothing linked yet
    for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    expect((await axe.run(region()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    for (const b of region()!.querySelectorAll("button")) expect(Math.round(b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/review-${w}.png`, element: region()! }); }
    await page.viewport(360, 900);

    await screen.getByRole("button", { name: "USE THESE", exact: true }).click();
    const go = screen.getByRole("button", { name: "START AT HOME · B", exact: true });
    await expect.element(go).toBeVisible();
    // #745 review: focus lands on START AT HOME, not the page.
    await expect.poll(() => document.activeElement === go.element()).toBe(true);
    await expect.element(screen.getByText("Gym closed or short on time? Do B at home.")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/start-at-home-360.png`, element: region()! });
    await go.click();
    await expect.poll(() => db.workoutSessions.count()).toBe(1);
    const started = (await db.workoutSessions.toArray())[0]!;
    const homeB = (await db.customWorkoutTemplates.toArray()).find((t) => t.name === "Grayson HOME B")!;
    expect(started.templateId).toBe(homeB.id);
    expect(started.programmeContext).toMatchObject({ memberKey: "B", parentTemplateId: gym[1]!.id, form: "HOME" });
  });

  it("CHANGE lets him pick a different HOME routine per member before USE THESE", async () => {
    await sequence();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "SET UP HOME", exact: true }).click();
    await screen.getByRole("button", { name: "Change HOME routines", exact: true }).click();
    const a = screen.getByRole("combobox", { name: "HOME for A" });
    const c = screen.getByRole("combobox", { name: "HOME for C" });
    const ids = (await db.customWorkoutTemplates.toArray()).filter((t) => t.name.startsWith("Grayson HOME")).sort((x, y) => x.name.localeCompare(y.name)).map((t) => t.id);
    await a.selectOptions(ids[2]!);
    await expect.element(screen.getByText("Choose a different HOME routine for each.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "USE THESE", exact: true })).toBeDisabled();
    await c.selectOptions(ids[0]!);
    await screen.getByRole("button", { name: "USE THESE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "START AT HOME · B", exact: true })).toBeVisible();
    const programme = (await getTrainingProgramme()).programme as { members: { home?: { templateId: string } }[] };
    expect(programme.members.map((m) => m.home?.templateId)).toEqual([ids[2], ids[1], ids[0]]);
  });

  it("without a sequence: SET UP HOME, then HOME A, B and C start directly", async () => {
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "SET UP HOME", exact: true }).click();
    const b = screen.getByRole("button", { name: "Start HOME B at home", exact: true });
    await expect.element(b).toBeVisible();
    expect((await getTrainingProgramme()).programme).toBeNull();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/direct-360.png`, element: region()! });
    await b.click();
    await expect.poll(() => db.workoutSessions.count()).toBe(1);
    const homeB = (await db.customWorkoutTemplates.toArray()).find((t) => t.name === "Grayson HOME B")!;
    expect((await db.workoutSessions.toArray())[0]!.templateId).toBe(homeB.id);
  });
});
