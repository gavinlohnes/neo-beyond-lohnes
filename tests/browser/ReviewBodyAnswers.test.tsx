import { openDetailedReviews } from "./helpers/review";
import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { correctMeasurement, logMeasurement } from "../../src/application/measurementCommands";
import { getMeasurements } from "../../src/application/measurementQueries";
import { addProgressPhoto, hideProgressPhoto } from "../../src/application/progressPhotoCommands";
import { db } from "../../src/persistence/db";

/** REVIEW-001 Body questions (#9, #21, #20, #16): recorded measurements and photos, never a verdict. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });
function clock() { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 18, 20)); }
async function photoBlob(): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 30; canvas.height = 40;
  canvas.getContext("2d")!.fillRect(0, 0, 30, 40);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg"));
}
async function openMoreQuestions() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  await (await commandResult(screen, "REVIEW")).click();
  await openDetailedReviews(screen);
  await screen.getByText("More questions", { exact: true }).click();
  return screen;
}

for (const width of [320, 360, 412]) it(`answers the Body questions from recorded measurements and photos at ${width}px, writing nothing`, async () => {
  await page.viewport(width, 800);
  clock(); await startDay();
  await logMeasurement({ site: "WAIST", inches: 36.25, measuredOn: "2026-09-01" });
  await logMeasurement({ site: "WAIST", inches: 35.75, measuredOn: "2026-10-01" });
  await logMeasurement({ site: "WAIST", inches: 35.25, measuredOn: "2026-10-15" });
  await logMeasurement({ site: "CHEST", inches: 42, measuredOn: "2026-10-01" });
  const latestWaist = (await getMeasurements("WAIST")).at(-1)!;
  await correctMeasurement(latestWaist.headEventId, { inches: 35.5, measuredOn: "2026-10-15" });
  await addProgressPhoto(await photoBlob(), { pose: "FRONT", takenOn: "2026-09-01" }, "IMPORT");
  await addProgressPhoto(await photoBlob(), { pose: "FRONT", takenOn: "2026-10-15" }, "IMPORT");
  const hidden = await addProgressPhoto(await photoBlob(), { pose: "SIDE", takenOn: "2026-10-02" }, "IMPORT");
  await hideProgressPhoto(hidden.id);
  const before = await db.events.count();

  const screen = await openMoreQuestions();
  const waistAnswer = "35.5 in · -0.25 in since Oct 1, 2026 · -0.75 in since Sep 1, 2026";
  await expect.element(screen.getByText(waistAnswer, { exact: true }).first()).toBeVisible();
  await screen.getByText("Is my waist getting smaller?", { exact: true }).click();
  await screen.getByText("Every waist measurement (3)", { exact: true }).click();
  await expect.element(screen.getByText("35.5 · corrected 1×", { exact: true })).toBeVisible();

  await expect.element(screen.getByText("Chest: 42 in (1 reading)", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Front: 2 photos, Sep 1, 2026 → Oct 15, 2026", { exact: true }).first()).toBeVisible();

  await screen.getByText("Am I losing fat, not muscle?", { exact: true }).click();
  await expect.element(screen.getByText("No verdict · the changes BEYOND can see, side by side", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("BEYOND does not measure fat or muscle. Here is what it can see. You draw the conclusion.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("1 pose with 2+ photos to compare in BODY", { exact: true })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  const more = document.querySelector<HTMLElement>(".review-more")!;
  expect((await axe.run(more, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations).toEqual([]);
  expect(await db.events.count()).toBe(before);
});

it("says what is still needed when nothing is recorded, and never guesses", async () => {
  clock(); await startDay();
  const screen = await openMoreQuestions();
  await expect.element(screen.getByText("Is my waist getting smaller?", { exact: true })).toBeVisible();
  expect(screen.getByText("Not recorded", { exact: true }).elements().length).toBeGreaterThanOrEqual(2);
  await expect.element(screen.getByText("Building up · needs 2 photos in the same pose (0 visible)", { exact: true })).toBeVisible();
  await screen.getByText("Is my waist getting smaller?", { exact: true }).click();
  await expect.element(screen.getByText("Record one in BODY → Your progress → Measurements.", { exact: true })).toBeVisible();
});
