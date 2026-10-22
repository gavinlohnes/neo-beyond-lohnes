/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** UX-COHESION-001: one HEALTH HISTORY destination; Garmin lists are bounded but every day stays reachable. */
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now);
  await db.beyondDays.bulkAdd(days);
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
});
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

describe("UX-COHESION-001 — HEALTH HISTORY", () => {
  for (const width of [320, 390]) it(`opens days or Garmin from one place and pages a month of Garmin days ten at a time at ${width}px`, async () => {
    await page.viewport(width, 844);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    const history = screen.getByText("Health history", { exact: true });
    await expect.element(history).toBeVisible();
    expect(document.querySelectorAll("article[aria-label]").length).toBe(0); // closed: the archive adds nothing
    await history.click();
    await screen.getByRole("button", { name: "GARMIN", exact: true }).click();
    const measured = screen.getByRole("region", { name: "Measured steps and heart rate" });
    await expect.element(measured.getByRole("heading", { name: "MEASURED · GARMIN" })).toBeVisible();
    await expect.poll(() => measured.element().querySelectorAll("article").length).toBe(10);
    await measured.getByRole("button", { name: "SHOW MORE MEASURED DAYS", exact: true }).click();
    await expect.poll(() => measured.element().querySelectorAll("article").length).toBe(20);
    await measured.getByRole("button", { name: "SHOW MORE MEASURED DAYS", exact: true }).click();
    await expect.poll(() => measured.element().querySelectorAll("article").length).toBe(30);
    expect(measured.getByRole("button", { name: "SHOW MORE MEASURED DAYS" }).elements()).toHaveLength(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    for (const animation of document.getAnimations()) animation.finish();
    expect((await axe.run(document.querySelector(".health-history")!)).violations).toEqual([]);
    expect(await db.events.where("type").equals("SLEEP_LOGGED").count()).toBeGreaterThan(0); // nothing was removed
  });

  it("closing history returns BODY to today", async () => {
    await page.viewport(390, 844);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    await screen.getByText("Health history", { exact: true }).click();
    const yesterday = screen.getByRole("group", { name: "Seven lived days" }).getByRole("button").nth(5);
    await yesterday.click();
    await expect.element(screen.getByRole("region", { name: "Selected health day" })).toBeVisible();
    await screen.getByText("Health history", { exact: true }).click();
    await expect.poll(() => screen.getByRole("region", { name: "Selected health day" }).elements().length).toBe(0);
  });

  it("choosing GARMIN clears a selected past day", async () => {
    await page.viewport(390, 844);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    await screen.getByText("Health history", { exact: true }).click();
    await screen.getByRole("group", { name: "Seven lived days" }).getByRole("button").nth(5).click();
    await expect.element(screen.getByRole("region", { name: "Selected health day" })).toBeVisible();
    await screen.getByRole("button", { name: "GARMIN", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "MEASURED · GARMIN" })).toBeVisible();
    await screen.getByRole("button", { name: "DAYS", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "CURRENT DAY", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Selected health day" }).elements()).toHaveLength(0);
  });
});
