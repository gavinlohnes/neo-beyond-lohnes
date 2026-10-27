import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { JournalScreen } from "../../src/ui/screens/more/JournalScreen";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { startDay } from "../../src/application/commands";
import { startExperiment } from "../../src/application/tryExperiment";
import { db } from "../../src/persistence/db";

/** LOOP step 3 — TRY: start an experiment in the Journal, see it run, and see it quietly on TODAY. */
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });

for (const width of [320, 390]) it(`starts an experiment from the Journal and shows it running at ${width}px`, async () => {
  await page.viewport(width, 850);
  const screen = await render(<main><JournalScreen /></main>);
  await screen.getByText("TRY SOMETHING", { exact: true }).click();
  await screen.getByLabelText("What will you try?").fill("Nap 40 min before night 1");
  await screen.getByRole("button", { name: "7 days", exact: true }).click();
  await screen.getByLabelText("What do you expect? Optional.").fill("Better energy on shift 1");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
  await screen.getByRole("button", { name: "START EXPERIMENT" }).click();
  const card = screen.getByText("Nap 40 min before night 1", { exact: true }).first();
  await expect.element(card).toBeVisible();
  await expect.element(screen.getByText(/^Day 1 of 7 · /)).toBeVisible();
  await expect.element(screen.getByText("You expected: Better energy on shift 1")).toBeVisible();
  await expect.element(screen.getByText(/^Not enough recorded yet: this needs 3 recorded work days/)).toBeVisible();
  const [entry] = await db.decisionJournalEntries.toArray();
  expect(entry).toMatchObject({ title: "Try: Nap 40 min before night 1", status: "OPEN" });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("TODAY shows a running experiment as one quiet line under the mode, and nothing without one", async () => {
  await page.viewport(390, 850);
  await startDay();
  const plain = await render(<TodayScreen />);
  await expect.element(plain.getByRole("button", { name: /^Mode / })).toBeVisible();
  expect(document.querySelector("[data-try-active]")).toBeNull();
  await cleanup();
  await startExperiment({ what: "No caffeine after 02:00", days: 14, scope: "ALL" });
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByText("Trying: No caffeine after 02:00 · day 1 of 14")).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
});
