import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { db } from "../../src/persistence/db";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/** SHORTCUTS-001: START WORKOUT, +WATER, LOG MEAL open straight to their control; nothing is logged or started. */

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const originalUrl = window.location.href;

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", originalUrl);
});

function openWithShortcut(target: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("go", target);
  window.history.replaceState(null, "", url.toString());
}

describe("SHORTCUTS-001", () => {
  it("START WORKOUT opens TRAIN at the workout start and starts nothing", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    openWithShortcut("workout");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();
    expect(document.querySelector('[aria-current="page"]')!.textContent).toContain("TRAIN");
    expect(new URL(window.location.href).searchParams.has("go")).toBe(false);
    expect(await getActiveWorkoutSession()).toBeUndefined();
  });

  it("+WATER opens BODY at the water quick-add and logs nothing", async () => {
    const day = await startDay();
    openWithShortcut("water");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "+8 oz" })).toBeVisible();
    expect(await db.events.where("beyondDayId").equals(day.id).filter((e) => e.type === "WATER_LOGGED").count()).toBe(0);
  });

  it("LOG MEAL opens BODY with the meal entry already open", async () => {
    await startDay();
    openWithShortcut("meal");
    const screen = await render(<App />);
    await expect.element(screen.getByText("HIDE ADD MEAL")).toBeVisible();
  });
});
