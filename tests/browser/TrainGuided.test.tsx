import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { db } from "../../src/persistence/db";
import { holdToConfirm } from "./helpers/hold";

/**
 * GRAYSON-TRAIN-GUIDED-001: Delta is quiet on a normal set, proposes once on clear evidence (he decides), stops a
 * movement on pain without diagnosing, and sums it up once at the end. Machine Chest Press: 3 × 8–12, 10 lb steps.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
afterEach(() => cleanup());

async function start(width: number) {
  await page.viewport(width, 900);
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "START WORKOUT" }).click();
  await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" })).toBeVisible();
  return screen;
}
async function log(screen: Awaited<ReturnType<typeof start>>, weight: string, reps: string) {
  await screen.getByPlaceholder("lb").first().fill(weight);
  await screen.getByPlaceholder("reps").first().fill(reps);
  await screen.getByRole("button", { name: "LOG" }).first().click();
}


it("a set past the range gets one proposal; USE fills only the next set's weight and writes nothing", async () => {
  const screen = await start(360);
  await log(screen, "135", "14");
  const delta = screen.getByRole("group", { name: "Delta's suggestion" });
  await expect.element(delta.getByText(/14 reps cleared the top of 8–12\. Set 2 at 145 lb\?/)).toBeVisible();
  expect([...delta.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
  expect((await axe.run(delta.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  await delta.getByRole("button", { name: "WHY?" }).click();
  await expect.element(delta.getByText("10 lb is this exercise's load step.")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-delta-proposal.png`, element: delta });
  const setsBefore = await db.performedSets.count();
  await delta.getByRole("button", { name: "USE 145 LB" }).click();
  await expect.element(screen.getByRole("spinbutton", { name: "Set 2 weight in pounds" })).toHaveValue(145);
  expect(await db.performedSets.count()).toBe(setsBefore);
  expect(screen.getByRole("group", { name: "Delta's suggestion" }).elements()).toHaveLength(0);
});

it("PAIN stops the movement, skips its remaining sets only when chosen, and the end review says so plainly", async () => {
  const screen = await start(360);
  await log(screen, "135", "10");
  await screen.getByRole("button", { name: "PAIN OR SOMETHING WRONG" }).click();
  const stop = screen.getByRole("group", { name: "Stop this movement" });
  await expect.element(stop.getByText(/Machine Chest Press is stopped\. No diagnosis here/)).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-delta-stop.png`, element: stop });
  await stop.getByRole("button", { name: "SKIP ITS REMAINING SETS" }).click();
  await expect.poll(async () => (await db.performedSets.toArray()).filter((s) => s.exerciseId === "machine-chest-press" && s.skipped).length).toBe(2);
});

for (const width of [320, 360, 412]) {
  it(`${width} px: a normal set stays quiet; the panels fit; the end review sums up once`, async () => {
    const screen = await start(width);
    await log(screen, "135", "10");
    await expect.element(screen.getByText("#1 — 135 lb x 10", { exact: true })).toBeVisible();
    expect(screen.getByRole("group", { name: "Delta's suggestion" }).elements()).toHaveLength(0);
    await log(screen, "135", "15");
    await expect.element(screen.getByRole("group", { name: "Delta's suggestion" })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.getByRole("button", { name: "KEEP 135 LB" }).click();
    await screen.getByRole("button", { name: "PAIN OR SOMETHING WRONG" }).click();
    await expect.element(screen.getByRole("group", { name: "Stop this movement" })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await screen.getByRole("button", { name: "JUST NOTE IT" }).click();
    await holdToConfirm(screen.getByRole("button", { name: "PARTIAL" }));
    const review = screen.getByRole("group", { name: "What Delta noticed" });
    await expect.element(review.getByText(/Machine Chest Press: 15 reps cleared the top of 8–12\. Set 3 at 145 lb\. You kept your weight\./)).toBeVisible();
    await expect.element(review.getByText(/Machine Chest Press: pain or a problem noted; its sets were left open\./)).toBeVisible();
    expect((await axe.run(review.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS && width === 360) await page.screenshot({ path: `${SHOTS}/360-delta-review.png`, element: review });
  });
}

it("UNDO of the set a proposal was based on removes the proposal (review on #627)", async () => {
  const screen = await start(360);
  await log(screen, "135", "14");
  await expect.element(screen.getByRole("group", { name: "Delta's suggestion" })).toBeVisible();
  await screen.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.poll(() => document.body.textContent?.includes("#1 — 135 lb x 14")).toBe(false);
  expect(screen.getByRole("group", { name: "Delta's suggestion" }).elements()).toHaveLength(0);
});

for (const width of [320, 412]) {
  it(`${width} px Gym mode: the same proposal and pain stop as the workout view (TRAIN finish 3)`, async () => {
    const screen = await start(width);
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    const gym = screen.getByRole("dialog", { name: "Gym mode" });
    await gym.getByRole("spinbutton", { name: "Weight", exact: true }).fill("135");
    await gym.getByRole("spinbutton", { name: "Reps", exact: true }).fill("14");
    await gym.getByRole("button", { name: "LOG SET 1" }).click();
    const delta = gym.getByRole("group", { name: "Delta's suggestion" });
    await expect.element(delta.getByText(/14 reps cleared the top of 8–12\. Set 2 at 145 lb\?/)).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(gym.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-gym-delta.png`, element: gym });
    await delta.getByRole("button", { name: "USE 145 LB" }).click();
    await expect.element(gym.getByRole("spinbutton", { name: "Weight", exact: true })).toHaveValue(145);
    await gym.getByRole("button", { name: "PAIN OR SOMETHING WRONG" }).click();
    await gym.getByRole("group", { name: "Stop this movement" }).getByRole("button", { name: "SKIP ITS REMAINING SETS" }).click();
    await expect.poll(async () => (await db.performedSets.toArray()).filter((s) => s.skipped).length).toBe(2);
  });
}

it("placements (Gavin: 'Move the Train my Program down'): mid-workout MY PROGRAMME sits below the live set; Gym-mode Delta sits above SET DETAILS", async () => {
  const screen = await start(320);
  const live = document.querySelector(".command-surface")!;
  const programme = screen.getByRole("region", { name: "My programme" });
  await expect.element(programme).toBeInTheDocument();
  expect(live.compareDocumentPosition(programme.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect.element(programme.getByRole("button", { name: "EDIT PROGRAMME", exact: true })).toBeVisible(); // still usable
  await screen.getByRole("button", { name: "GYM MODE" }).click();
  const gym = screen.getByRole("dialog", { name: "Gym mode" });
  await gym.getByRole("spinbutton", { name: "Weight", exact: true }).fill("135");
  await gym.getByRole("spinbutton", { name: "Reps", exact: true }).fill("14");
  await gym.getByRole("button", { name: "LOG SET 1" }).click();
  const delta = gym.getByRole("group", { name: "Delta's suggestion" });
  await expect.element(delta).toBeVisible();
  const details = gym.element().querySelector("details, .set-details, [aria-label='Set details']") ?? gym.getByText("SET DETAILS").element();
  expect(delta.element().compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
