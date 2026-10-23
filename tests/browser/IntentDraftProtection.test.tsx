import { commandResult } from "./helpers/command";
/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { createMission, createObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

/**
 * DAILY-EXPERIENCE-001 review (PR #228, independent Codex BLOCK on 54aaf8ae):
 *   1. an unfinished Mission/Obligation edit survives opening another record
 *      and coming back (A → B → A), with no discard and no canonical write;
 *   2. every Intent draft — creation, record edit, and the Plan Today composer
 *      including date/Mission/repeat-only input — reaches the reload and
 *      app-update warnings, and clean or saved states do not warn.
 */

const update = vi.hoisted(() => ({ available: false, apply: vi.fn(async () => {}) }));
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [update.available, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: update.apply,
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
const tab = (screen: Screen, name: "TODAY" | "TRAIN" | "DATA" | "MORE") => screen.getByRole("button", { name, exact: true }).click();
const openPlan = async (screen: Screen) => {
  await (await commandResult(screen, "PLAN TODAY")).click();
};
const openIntent = async (screen: Screen) => {
  await tab(screen, "MORE");
  await (await commandResult(screen, "MISSIONS & OBLIGATIONS")).click();
};

/** What a page reload or tab close would do: a prevented beforeunload asks first. */
/** Draft registration settles through React effects; let them run before asserting "no warning". */
async function settled() {
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

function reloadWouldWarn(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(async () => {
  await page.viewport(360, 800);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 22));
  update.available = false;
  update.apply.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.scrollTo(0, 0);
});

describe("blocker 1 — unfinished record edits survive cross-record navigation", () => {
  it("Plan Today A → B → A keeps A's edited title, date and repeat, with no discard or write", async () => {
    await createObligation({ title: "Task A", plannedAt: "2026-10-13" });
    await createObligation({ title: "Task B", plannedAt: "2026-10-13" });
    const confirm = vi.spyOn(window, "confirm");
    const screen = await render(<App />);
    const eventsBefore = await db.events.count();

    await openPlan(screen);
    await screen.getByRole("button", { name: /Task A/ }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await screen.getByRole("textbox", { name: "Obligation title" }).fill("Unfinished renamed task");
    await screen.getByLabelText("Due", { exact: true }).fill("2026-10-20");
    await screen.getByRole("combobox", { name: "Repeats" }).selectOptions("WEEKLY");

    await openPlan(screen);
    await screen.getByRole("button", { name: /Task B/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Task B", exact: true })).toBeVisible();

    await openPlan(screen);
    await screen.getByRole("button", { name: /Task A/ }).click();
    await expect.element(screen.getByRole("textbox", { name: "Obligation title" })).toHaveValue("Unfinished renamed task");
    await expect.element(screen.getByLabelText("Due", { exact: true })).toHaveValue("2026-10-20");
    await expect.element(screen.getByRole("combobox", { name: "Repeats" })).toHaveValue("WEEKLY");
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.events.count()).toBe(eventsBefore);
    expect((await db.obligations.toArray()).map((o) => o.title).sort()).toEqual(["Task A", "Task B"]);

    // SAVE still writes exactly once, and the saved state no longer warns.
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Unfinished renamed task", exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("OBLIGATION_MODIFIED").count()).toBe(1);
    await expect.poll(reloadWouldWarn).toBe(false);
  });

  it("Missions list A → B → A keeps A's edited title; CANCEL is the explicit discard", async () => {
    await createMission({ title: "Mission A" });
    await createMission({ title: "Mission B" });
    const screen = await render(<App />);
    await openIntent(screen);
    await screen.getByRole("button", { name: "Open Mission A", exact: true }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await screen.getByRole("textbox", { name: "Mission title" }).fill("Mission A, unfinished");
    await screen.getByRole("button", { name: /^BACK TO (MISSIONS|OBLIGATIONS|DECISIONS)$/ }).click();
    await screen.getByRole("button", { name: "Open Mission B", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Mission B", exact: true })).toBeVisible();
    await screen.getByRole("button", { name: /^BACK TO (MISSIONS|OBLIGATIONS|DECISIONS)$/ }).click();
    await screen.getByRole("button", { name: "Open Mission A", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Mission title" })).toHaveValue("Mission A, unfinished");
    expect(await db.events.where("type").equals("MISSION_MODIFIED").count()).toBe(0);

    await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Mission A", exact: true })).toBeVisible();
    await expect.poll(reloadWouldWarn).toBe(false);
  });
});

describe("blocker 2 — Intent drafts reach reload and update protection", () => {
  const soleDrafts: Array<[string, (screen: Screen) => Promise<void>]> = [
    ["Mission creation title", async (screen) => {
      await openIntent(screen);
      await screen.getByText("CREATE MISSION", { exact: true }).click();
      await screen.getByRole("textbox", { name: "New mission title" }).fill("Unsaved direction");
    }],
    ["Obligation creation with only a due date", async (screen) => {
      await openIntent(screen);
      await screen.getByText("CREATE OBLIGATION", { exact: true }).first().click();
      await screen.getByLabelText("Due", { exact: true }).fill("2026-10-20");
    }],
    ["Obligation creation with only a repeat", async (screen) => {
      await openIntent(screen);
      await screen.getByText("CREATE OBLIGATION", { exact: true }).first().click();
      await screen.getByRole("combobox", { name: "Repeats" }).selectOptions("DAILY");
    }],
    ["Plan Today composer with only a due date", async (screen) => {
      await openPlan(screen);
      await screen.getByText("Date, Mission & repeat", { exact: true }).click();
      await screen.getByLabelText("Due date (optional)").fill("2026-10-20");
    }],
    ["Plan Today composer with only a Mission", async (screen) => {
      const mission = await createMission({ title: "Health" });
      await openPlan(screen);
      await screen.getByText("Date, Mission & repeat", { exact: true }).click();
      await screen.getByLabelText("Mission (optional)").selectOptions(mission.id);
    }],
    ["Plan Today composer with only a repeat", async (screen) => {
      await openPlan(screen);
      await screen.getByText("Date, Mission & repeat", { exact: true }).click();
      await screen.getByRole("combobox", { name: "Repeats" }).selectOptions("MONTHLY");
    }],
    ["an Obligation edit that only changes the planned date", async (screen) => {
      await createObligation({ title: "Existing task" });
      await openIntent(screen);
      await screen.getByRole("button", { name: "Open Existing task", exact: true }).click();
      await screen.getByRole("button", { name: "EDIT", exact: true }).click();
      await screen.getByLabelText("Planned", { exact: true }).fill("2026-10-21");
    }],
    ["a Mission edit", async (screen) => {
      await createMission({ title: "Existing direction" });
      await openIntent(screen);
      await screen.getByRole("button", { name: "Open Existing direction", exact: true }).click();
      await screen.getByRole("button", { name: "EDIT", exact: true }).click();
      await screen.getByRole("textbox", { name: "Mission description" }).fill("Now with a reason");
    }],
  ];

  for (const [name, makeDraft] of soleDrafts) {
    it(`reload warns when ${name} is the only unfinished input`, async () => {
      const screen = await render(<App />);
      await settled();
      expect(reloadWouldWarn()).toBe(false);
      await makeDraft(screen);
      await expect.poll(reloadWouldWarn).toBe(true);
    });
  }

  it("an opened but unchanged editor does not warn", async () => {
    await createObligation({ title: "Existing task", dueAt: "2026-10-20" });
    await createMission({ title: "Existing direction" });
    const screen = await render(<App />);
    await openIntent(screen);
    await screen.getByRole("button", { name: "Open Existing task", exact: true }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Obligation title" })).toHaveValue("Existing task");
    await settled();
    expect(reloadWouldWarn()).toBe(false);
    await screen.getByRole("button", { name: /^BACK TO (MISSIONS|OBLIGATIONS|DECISIONS)$/ }).click();
    await screen.getByRole("button", { name: "Open Existing direction", exact: true }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Mission title" })).toHaveValue("Existing direction");
    await settled();
    expect(reloadWouldWarn()).toBe(false);
  });

  it("a saved creation clears its warning", async () => {
    const screen = await render(<App />);
    await openIntent(screen);
    await screen.getByText("CREATE MISSION", { exact: true }).click();
    await screen.getByRole("textbox", { name: "New mission title" }).fill("Saved direction");
    await expect.poll(reloadWouldWarn).toBe(true);
    await screen.getByRole("button", { name: "CREATE", exact: true }).click();
    await expect.poll(() => db.missions.count()).toBe(1);
    await expect.poll(reloadWouldWarn).toBe(false);
  });

  it("UPDATE NOW asks first while an Intent edit is unfinished, and updates directly when clean", async () => {
    await createObligation({ title: "Existing task" });
    update.available = true;
    // The fixed update card sits above the bottom nav; a tall viewport keeps the record row clear of it.
    await page.viewport(360, 1600);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const screen = await render(<App />);
    await openIntent(screen);
    await screen.getByRole("button", { name: "Open Existing task", exact: true }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    await screen.getByRole("textbox", { name: "Obligation title" }).fill("Unsaved rename");

    await screen.getByRole("button", { name: "UPDATE NOW", exact: true }).click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(update.apply).not.toHaveBeenCalled();
    await expect.element(screen.getByRole("textbox", { name: "Obligation title" })).toHaveValue("Unsaved rename");

    await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
    await expect.poll(reloadWouldWarn).toBe(false);
    await screen.getByRole("button", { name: "UPDATE NOW", exact: true }).click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(update.apply).toHaveBeenCalledOnce();
  });
});
