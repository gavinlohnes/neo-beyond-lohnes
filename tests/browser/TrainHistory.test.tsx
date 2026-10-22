/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { abandonWorkout, completeWorkout, logSet, skipSet, startRest, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { getLiftRecentSessions } from "../../src/application/trainHistoryQueries";

// Spied, not replaced: the real reads run, and the call count shows when lift history reads.
vi.mock("../../src/application/trainHistoryQueries", { spy: true });

/**
 * ULTIMATE-FOUNDATION-002 (Training Record): TRAIN → HISTORY, a session's
 * record, and a lift's history during a workout — all read only, with focus
 * returned and an in-progress set left exactly as it was.
 */

let clock = new Date(2026, 9, 12, 18).getTime();
function tick() {
  clock += 60_000;
  vi.setSystemTime(clock);
}

beforeEach(async () => {
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 9, 12, 18).getTime();
  vi.setSystemTime(clock);
});
afterEach(async () => {
  await cleanup();
  vi.mocked(getLiftRecentSessions).mockClear();
  vi.useRealTimers();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
  window.scrollTo(0, 0);
});

/** Two finished chest-press sessions (the second sets a record) and one stopped session. */
async function seedHistory() {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const first = await startWorkout(day.id, "A", "STANDARD");
  tick();
  await logSet(day.id, first.id, "machine-chest-press", 1, 90, 10);
  tick();
  await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED");
  tick();
  const second = await startWorkout(day.id, "A", "STANDARD");
  tick();
  await logSet(day.id, second.id, "machine-chest-press", 1, 100, 10);
  tick();
  await skipSet(day.id, second.id, "machine-chest-press", 2);
  tick();
  await logSet(day.id, second.id, "pec-deck", 1, 50, 12, "Cable fly");
  tick();
  await completeWorkout(day.id, second.id, "STANDARD", "PARTIAL");
  tick();
  const stopped = await startWorkout(day.id, "B", "REDUCED");
  tick();
  await logSet(day.id, stopped.id, "lat-pulldown", 1, 120, 8);
  tick();
  await abandonWorkout(day.id, stopped.id, "REDUCED");
  tick();
  return { day, second };
}

const writes = async () => [await db.events.count(), await db.performedSets.count(), await db.workoutSessions.count()];

describe("TRAIN → HISTORY", () => {
  it("lists sessions with their values in each row's accessible name, opens a record, and returns focus", async () => {
    await seedHistory();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
    const before = await writes();

    const rows = screen.getByRole("list").getByRole("button");
    await expect.element(rows.first()).toBeVisible();
    expect(rows.elements().map((row) => row.getAttribute("aria-label"))).toEqual([
      "Template B · REDUCED, Mon, Oct 12, 2026. Abandoned · 2 min · 1 working set · 960 lb volume",
      "Template A, Mon, Oct 12, 2026. Partial · 4 min · 2 working sets · 1,600 lb volume · 1 record",
      "Template A, Mon, Oct 12, 2026. Completed · 2 min · 1 working set · 900 lb volume",
    ]);
    // What is read is what is shown: the name only adds separators between the visible title, date and facts.
    for (const row of rows.elements()) {
      expect(row.getAttribute("aria-label")!.replace(", ", "").replace(". ", "")).toBe(row.textContent);
    }

    await rows.nth(1).click();
    const heading = screen.getByRole("heading", { level: 2, name: /^Template A · / });
    await expect.element(heading).toHaveFocus();
    await expect.element(screen.getByText("Set 1 · 100 lb × 10", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("heaviest yet (100 lb)", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Set 2 · skipped", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Set 1 · 50 lb × 12 · as Cable fly", { exact: true })).toBeVisible();

    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    }
    expect((await axe.run(document.querySelector(".train-operator")!)).violations).toEqual([]);

    await screen.getByRole("button", { name: "BACK", exact: true }).click();
    await expect.poll(() => document.activeElement?.textContent).toMatch(/^Template A.*Partial/);
    expect(await writes()).toEqual(before);
  });

  it("shows calm empty history before any strength session", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
    await expect.element(screen.getByText("Finished and stopped strength sessions will appear here.")).toBeVisible();
  });

  it("an open session record survives a tab round trip in the retained TRAIN", async () => {
    await seedHistory();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
    await screen.getByRole("list").getByRole("button").nth(1).click();
    await expect.element(screen.getByText("Set 2 · skipped", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "BODY", exact: true }).click();
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.element(screen.getByText("Set 2 · skipped", { exact: true })).toBeVisible();
  });
});

describe("lift history during a workout", () => {
  it("opens in place without touching the unsaved set, the rest timer, or any record, and returns focus", async () => {
    const { day } = await seedHistory();
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    await logSet(day.id, session.id, "machine-chest-press", 1, 105, 10);
    await startRest(session.id, 90);
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    await screen.getByLabelText("Set 2 weight in pounds", { exact: true }).fill("110");
    await screen.getByLabelText("Set 2 repetitions", { exact: true }).fill("7");
    const before = await writes();

    await screen.getByRole("button", { name: "Machine Chest Press history" }).click();
    await expect.element(screen.getByRole("heading", { name: "Machine Chest Press history" })).toHaveFocus();
    await expect.element(screen.getByText("RECENT SESSIONS", { exact: true })).toBeVisible();
    // Newest first, the in-progress 105 lb set excluded, the stopped session excluded.
    const lines = [...document.querySelectorAll(".train-lift-history li")].map((li) => li.textContent);
    expect(lines).toEqual(["Oct 12: 100 lb × 10", "Oct 12: 90 lb × 10"]);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    expect((await axe.run(document.querySelector(".train-operator")!)).violations).toEqual([]);

    await screen.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Machine Chest Press history" })).toHaveFocus();
    await expect.element(screen.getByLabelText("Set 2 weight in pounds", { exact: true })).toHaveValue(110);
    await expect.element(screen.getByLabelText("Set 2 repetitions", { exact: true })).toHaveValue(7);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    expect(await writes()).toEqual(before);
  });

  it("reads once when opened, not after a set is logged with it open, and leaves Gym Mode's set as it was", async () => {
    Object.defineProperty(navigator, "wakeLock", { value: { request: vi.fn(async () => ({ release: vi.fn(async () => {}) })) }, configurable: true });
    const { day } = await seedHistory();
    const session = await startWorkout(day.id, "A", "STANDARD");
    tick();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Machine Chest Press history" }).click();
    await expect.element(screen.getByText("RECENT SESSIONS", { exact: true })).toBeVisible();
    expect(getLiftRecentSessions).toHaveBeenCalledTimes(1);

    await screen.getByLabelText("Set 1 weight in pounds", { exact: true }).fill("105");
    await screen.getByLabelText("Set 1 repetitions", { exact: true }).fill("10");
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(async () => (await db.performedSets.where("sessionId").equals(session.id).count())).toBe(1);
    await expect.element(screen.getByLabelText("Set 2 weight in pounds", { exact: true })).toBeVisible();
    // Still open, still the one read; the set just logged is not part of it.
    await expect.element(screen.getByText("RECENT SESSIONS", { exact: true })).toBeVisible();
    expect([...document.querySelectorAll(".train-lift-history li")].map((li) => li.textContent)).toEqual(["Oct 12: 100 lb × 10", "Oct 12: 90 lb × 10"]);
    expect(getLiftRecentSessions).toHaveBeenCalledTimes(1);

    await screen.getByLabelText("Set 2 weight in pounds", { exact: true }).fill("110");
    await screen.getByLabelText("Set 2 repetitions", { exact: true }).fill("7");
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    const gym = screen.getByRole("dialog", { name: "Gym mode" });
    await expect.element(gym.getByLabelText("Weight", { exact: true })).toHaveValue(110);
    await expect.element(gym.getByLabelText("Reps", { exact: true })).toHaveValue(7);
    await gym.getByRole("button", { name: "EXIT" }).click();
    await expect.element(screen.getByText("RECENT SESSIONS", { exact: true })).toBeVisible();
    expect(getLiftRecentSessions).toHaveBeenCalledTimes(1);
  });

  it("closes when the current exercise changes, and coming back neither reopens it nor moves focus", async () => {
    const { day } = await seedHistory();
    await startWorkout(day.id, "A", "STANDARD");
    tick();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Machine Chest Press history" }).click();
    await expect.element(screen.getByText("RECENT SESSIONS", { exact: true })).toBeVisible();

    const chips = [...document.querySelectorAll<HTMLButtonElement>(".train-exercise-picker button[aria-pressed]")];
    chips[1]!.click();
    await expect.poll(() => document.querySelector(".train-lift-history")).toBeNull();
    const chip = [...document.querySelectorAll<HTMLButtonElement>(".train-exercise-picker button[aria-pressed]")][0]!;
    chip.focus();
    chip.click();
    await expect.element(screen.getByRole("button", { name: "Machine Chest Press history" })).toBeVisible();
    expect(document.querySelector(".train-lift-history")).toBeNull();
    expect(document.activeElement).toBe(chip);
    expect(getLiftRecentSessions).toHaveBeenCalledTimes(1);
  });
});
