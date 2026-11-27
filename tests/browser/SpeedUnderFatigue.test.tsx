import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { logSet, startRest, startWorkout } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import { db } from "../../src/persistence/db";

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 15, 17)); await page.viewport(375, 850); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
async function workout() {
  const day = await startDay(); await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const session = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, session.id, "machine-chest-press", 1, 100, 8); await startRest(session.id, 120);
  return session;
}
it("TODAY opens the canonical note in one tap, focuses it, keeps a closed draft and saves only on CAPTURE", async () => {
  await startDay(); const screen = await render(<App />);
  const shortcut = screen.getByRole("button", { name: "Capture a note", exact: true });
  await shortcut.click();
  const sheet = screen.getByRole("dialog", { name: "NOTE", exact: true });
  const input = sheet.getByRole("textbox", { name: "Capture a thought", exact: true });
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Capture a thought");
  await input.fill("Remember the charger"); await userEvent.keyboard("{Enter}");
  expect(await db.captureItems.count()).toBe(0);
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Capture a note");
  await shortcut.click(); await expect.element(input).toHaveValue("Remember the charger\n");
  expect(await db.captureItems.count()).toBe(0);
  await sheet.getByRole("button", { name: "CAPTURE", exact: true }).click();
  await expect.poll(() => db.captureItems.count()).toBe(1);
  expect((await db.captureItems.toArray())[0]?.text).toBe("Remember the charger");
  expect(await db.workoutSessions.count()).toBe(0);
});
it("TODAY resume lands on the next working set with defaults/rest intact and no write", async () => {
  const session = await workout(); const before = await db.workoutSessions.get(session.id);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await screen.getByRole("button", { name: "RESUME WORKOUT", exact: true }).click();
  await expect.poll(() => document.activeElement?.textContent).toBe("Machine Chest Press");
  const heading = screen.getByRole("heading", { name: "Machine Chest Press", exact: true });
  await expect.poll(() => heading.element().getBoundingClientRect().top).toBeLessThan(window.innerHeight / 3);
  await expect.element(screen.getByRole("spinbutton", { name: "Set 2 weight in pounds" })).toHaveValue(100);
  await expect.element(screen.getByRole("spinbutton", { name: "Set 2 repetitions" })).toHaveValue(8);
  expect(await getPerformedSets(session.id)).toHaveLength(1);
  expect((await db.workoutSessions.get(session.id))?.activeRestEndsAt).toBe(before?.activeRestEndsAt);
  const log = screen.getByRole("button", { name: "LOG", exact: true }).element();
  await expect.poll(() => log.getBoundingClientRect().bottom).toBeLessThanOrEqual(document.querySelector(".shell-nav")!.getBoundingClientRect().top);
  const optional = screen.getByRole("group", { name: "Set type", exact: true }).element();
  expect(log.getBoundingClientRect().top).toBeLessThan(optional.getBoundingClientRect().top);
  expect(log.closest(".command-surface")?.querySelectorAll(".btn-primary")).toHaveLength(1);
  const repeat = screen.getByRole("button", { name: "SET 2: SAME AS LAST TIME — 100 lb x 8", exact: true });
  expect(repeat.element().classList.contains("btn-secondary")).toBe(true);
  await repeat.click();
  await expect.poll(async () => (await getPerformedSets(session.id)).length).toBe(2);
});
it("Gym's explicit LOG precedes optional set controls, while warm-up and effort remain available", async () => {
  const session = await workout(); const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "GYM MODE", exact: true }).click();
  const gym = screen.getByRole("dialog", { name: "Gym mode", exact: true });
  const log = gym.getByRole("button", { name: "LOG SET 2", exact: true }).element();
  // GRAYSON-SET-TYPES-001: the set type is four one-tap chips now (was a select).
  const options = gym.getByRole("group", { name: "Set type", exact: true });
  expect(log.getBoundingClientRect().top).toBeLessThan(options.element().getBoundingClientRect().top);
  await gym.getByRole("radio", { name: "Warm-up", exact: true }).click();
  await expect.element(gym.getByRole("button", { name: "LOG WARM-UP", exact: true })).toBeVisible();
  expect(await getPerformedSets(session.id)).toHaveLength(1);
  await gym.getByRole("radio", { name: "Working", exact: true }).click();
  await gym.getByRole("combobox", { name: "How many reps left? (optional)", exact: true }).selectOptions("0");
  await gym.getByRole("button", { name: "LOG SET 2", exact: true }).click();
  await expect.poll(async () => (await getPerformedSets(session.id)).find((s) => s.setNumber === 2)?.repsInReserve).toBe(0);
});
it.each([320, 375, 768])("Note shortcut fits %spx and keeps accessible labels and touch size", async (width) => {
  await page.viewport(width, 850); await startDay(); const screen = await render(<App />);
  const shortcut = screen.getByRole("button", { name: "Capture a note", exact: true });
  await expect.element(shortcut).toBeVisible();
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  expect(shortcut.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  await shortcut.click();
  const sheet = screen.getByRole("dialog", { name: "NOTE", exact: true });
  expect((await axe.run(sheet.element())).violations).toEqual([]);
});
