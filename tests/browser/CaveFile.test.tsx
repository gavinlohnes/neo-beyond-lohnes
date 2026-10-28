import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S7: the cave's FILE — case file, calibration, whole run — with depth in Personal Understanding. Read-only. */
afterEach(async () => { await cleanup(); await page.viewport(1280, 800); });

it.each([320, 390])("is honest on a fresh install and hands depth to Personal Understanding at %ipx", async (width) => {
  await page.viewport(width, 820);
  await startDay();
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /^Comms: / }).click();
  await screen.getByRole("button", { name: "FILE", exact: true }).click();

  const cave = screen.getByRole("region", { name: "THE CAVE // FILE" });
  await expect.element(cave.getByText("CASE FILE", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("Nothing has met its evidence floor yet. Findings appear as runs and lessons build up.", { exact: true })).toBeVisible();
  // Every usual range starts THIN, said in words.
  await expect.poll(() => [...document.querySelectorAll(".file__firm")].map((e) => e.textContent)).toEqual(Array(12).fill("THIN"));
  await expect.element(cave.getByText("Caffeine: BEYOND doesn't record it.", { exact: true })).toBeVisible();
  // CAVE-DATA D3: the whole run is YOUR ROTATION itself, with Whole Picture one tap away.
  await expect.element(cave.getByRole("region", { name: "Your rotation" })).toBeVisible();
  await expect.element(cave.getByRole("button", { name: "OPEN WHOLE PICTURE", exact: true })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);

  await cave.getByRole("button", { name: "OPEN PERSONAL UNDERSTANDING", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "MORE // REVIEW", exact: true })).toBeVisible();
  await expect.element(screen.getByText("PERSONAL UNDERSTANDING", { exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});
