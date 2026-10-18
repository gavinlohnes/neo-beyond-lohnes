/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/**
 * PR #228 exact-head review (34a17e4):
 *   R1 — a retained TRAIN must not keep a suggested default after a check-in
 *        elsewhere changes capacity; only an explicit operator choice survives.
 *   R2 — a Capture return origin belongs to that Capture visit only.
 */

const YELLOW = { energy: 2, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 } as const;
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;

type Screen = Awaited<ReturnType<typeof render>>;
const tab = (screen: Screen, name: "TODAY" | "TRAIN" | "BODY" | "COMMAND") => screen.getByRole("button", { name, exact: true }).click();
const choice = (screen: Screen, text: string) => screen.getByText(text, { exact: true });

beforeEach(async () => {
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 22));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.scrollTo(0, 0);
});

describe("R1 — retained TRAIN follows the current suggestion", () => {
  it("no check-in → TRAIN shows the default; a YELLOW check-in elsewhere → TRAIN suggests REDUCED", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await tab(screen, "TRAIN");
    await expect.element(screen.getByText("DEFAULT WORKOUT", { exact: true })).toBeVisible();
    await expect.element(choice(screen, "Template A · STANDARD")).toBeVisible();

    await tab(screen, "TODAY");
    await submitCheckIn(day.id, YELLOW);
    await tab(screen, "TRAIN");
    await expect.element(screen.getByText("SUGGESTED WORKOUT", { exact: true })).toBeVisible();
    await expect.element(choice(screen, "Template A · REDUCED")).toBeVisible();
    expect(await db.workoutSessions.count()).toBe(0);
  });

  it("the reverse: REDUCED at YELLOW becomes STANDARD after a GREEN check-in", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, YELLOW);
    const screen = await render(<App />);
    await tab(screen, "TRAIN");
    await expect.element(choice(screen, "Template A · REDUCED")).toBeVisible();
    await tab(screen, "BODY");
    await submitCheckIn(day.id, GREEN);
    await tab(screen, "TRAIN");
    await expect.element(choice(screen, "Template A · STANDARD")).toBeVisible();
  });

  it("an explicit variant and template choice survives a tab round trip and a new check-in", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, YELLOW);
    const screen = await render(<App />);
    await tab(screen, "TRAIN");
    await expect.element(choice(screen, "Template A · REDUCED")).toBeVisible();
    await screen.getByRole("button", { name: "CHANGE", exact: true }).click();
    await screen.getByRole("button", { name: "B", exact: true }).click();
    await screen.getByRole("button", { name: "STANDARD", exact: true }).click();
    await expect.element(choice(screen, "Template B · STANDARD")).toBeVisible();

    await tab(screen, "TODAY");
    await submitCheckIn(day.id, GREEN);
    await submitCheckIn(day.id, YELLOW);
    await tab(screen, "TRAIN");
    await expect.element(choice(screen, "Template B · STANDARD")).toBeVisible();
  });
});

describe("R2 — a Capture return does not outlive its visit", () => {
  it("MORE → CAPTURE, then leaving by primary nav: DONE on TODAY stays on TODAY", async () => {
    const screen = await render(<App />);
    await tab(screen, "COMMAND");
    await screen.getByRole("button", { name: "CAPTURE", exact: true }).first().click();
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought", exact: true })).toBeVisible();

    await tab(screen, "BODY");
    await tab(screen, "TODAY");
    await screen.getByRole("button", { name: "DONE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
    expect(document.getElementById("workspace-TODAY")?.hidden).toBe(false);
    expect(document.getElementById("workspace-COMMAND")?.hidden ?? true).toBe(true);
  });

  it("MORE → CAPTURE → DONE still returns to MORE", async () => {
    const screen = await render(<App />);
    await tab(screen, "COMMAND");
    await screen.getByRole("button", { name: "CAPTURE", exact: true }).first().click();
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "DONE", exact: true }).click();
    await expect.poll(() => document.getElementById("workspace-COMMAND")?.hidden).toBe(false);
  });
});
