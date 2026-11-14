import { afterEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { logSet, startWorkout } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { holdToConfirm } from "./helpers/hold";

afterEach(() => vi.restoreAllMocks());

async function start() {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const session = await startWorkout(day.id, "A", "STANDARD");
  return { session, screen: await render(<TrainScreen />) };
}

it("normal and Gym share warm-up/effort drafts, survive remount, undo and finish honestly", async () => {
  const { session, screen } = await start();
  await screen.getByRole("combobox", { name: "Set type", exact: true }).selectOptions("WARMUP");
  await screen.getByLabelText("Set 1 weight in pounds").fill("45");
  await screen.getByLabelText("Set 1 repetitions").fill("10");
  await screen.getByRole("button", { name: "GYM MODE", exact: true }).click();
  const gym = screen.getByRole("dialog", { name: "Gym mode" });
  await expect.element(gym.getByRole("combobox", { name: "Set type", exact: true })).toHaveValue("WARMUP");
  await gym.getByRole("button", { name: "LOG WARM-UP", exact: true }).click();
  await expect.poll(async () => (await getPerformedSets(session.id)).length).toBe(1);
  await expect.element(gym.getByText("Set 1 of 3 · 8-12 reps", { exact: true })).toBeVisible();
  await gym.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.poll(async () => (await getPerformedSets(session.id)).length).toBe(0);
  await gym.getByRole("combobox", { name: "Set type", exact: true }).selectOptions("WORKING");
  await gym.getByRole("combobox", { name: "How many reps left? (optional)", exact: true }).selectOptions("0");
  await gym.getByLabelText("Weight", { exact: true }).fill("95");
  await gym.getByRole("button", { name: "EXIT", exact: true }).click();
  await expect.element(screen.getByLabelText("Set 1 weight in pounds")).toHaveValue(95);
  await cleanup();
  const resumed = await render(<TrainScreen />);
  await expect.element(resumed.getByLabelText("Set 1 weight in pounds")).toHaveValue(95);
  await expect.element(resumed.getByRole("combobox", { name: "How many reps left? (optional)", exact: true })).toHaveValue("0");
  await resumed.getByRole("button", { name: "LOG", exact: true }).click();
  await expect.poll(async () => (await getPerformedSets(session.id))[0]?.repsInReserve).toBe(0);
  await expect.element(resumed.getByRole("combobox", { name: "How many reps left? (optional)", exact: true })).toHaveValue("");
  await holdToConfirm(resumed.getByRole("button", { name: "PARTIAL", exact: true }));
  await expect.element(resumed.getByText("WORKOUT SAVED — PARTIAL", { exact: true })).toBeVisible();
  await expect.element(resumed.getByText("First saved session in this template and workout variant. Your baseline starts here.", { exact: true })).toBeVisible();
});

it.each([320, 375, 768, 1024])("optional controls fit %spx and keep accessible labels", async (width) => {
  await page.viewport(width, 850);
  const { screen } = await start();
  await expect.element(screen.getByRole("combobox", { name: "Set type", exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(getComputedStyle(screen.getByRole("combobox", { name: "Set type", exact: true }).element()).fontSize).toBe("16px");
  for (const animation of document.getAnimations()) animation.finish();
  const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
  expect(results.violations).toEqual([]);
  await screen.getByRole("button", { name: "GYM MODE", exact: true }).click();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  const gymResults = await axe.run(screen.getByRole("dialog", { name: "Gym mode" }).element(), { rules: { region: { enabled: false } } });
  expect(gymResults.violations).toEqual([]);
});


it("normal warm-up undo after remount follows logging order, not primary-key storage order", async () => {
  const { session } = await start();
  await cleanup();
  let serial = 999999999999;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `00000000-0000-4000-8000-${serial--}`);
  await logSet(session.beyondDayId, session.id, "machine-chest-press", 1, 100, 8);
  await logSet(session.beyondDayId, session.id, "machine-chest-press", 2, 45, 10, undefined, { setKind: "WARMUP" });
  expect((await getPerformedSets(session.id))[0]?.setKind).toBe("WARMUP");
  const resumed = await render(<TrainScreen />);
  await resumed.getByRole("button", { name: "UNDO WARM-UP", exact: true }).click();
  await expect.poll(async () => (await getPerformedSets(session.id)).length).toBe(1);
  expect((await getPerformedSets(session.id))[0]).toMatchObject({ weight: 100, setNumber: 1 });
});
