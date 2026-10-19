import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { getActiveDay } from "../../src/application/queries";
import { setModePin } from "../../src/application/modePinQueries";
import { db } from "../../src/persistence/db";
import { openCaptureFromLog, searchCommand } from "./helpers/todayTools";

/**
 * COMMAND-CENTER-001 slice 4 — the emblem goes to TODAY's root; re-tapping an
 * active tab returns to its root; back keeps position, focus, query and drafts.
 */
type Screen = Awaited<ReturnType<typeof render>>;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  await startDay();
});
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

const current = () => document.querySelector('.shell-nav [aria-current="page"]')?.textContent ?? "";
const emblem = (screen: Screen, tab: string) => screen.getByRole("button", { name: "BEYOND emblem: go to TODAY" }).elements()
  .find((element) => element.closest(`#workspace-${tab}`) && element.getClientRects().length) as HTMLElement;

describe("direct shortcut suit", () => {
  it.each(["workout", "water"])("applies the stored pin before TODAY mounts for %s", async (shortcut) => {
    const day = await getActiveDay();
    setModePin(day!.id, "SCHEDULED_SHIFT");
    window.history.replaceState(null, "", `${window.location.pathname}?go=${shortcut}`);
    const screen = await render(<App />);
    await expect.poll(current).toContain(shortcut === "workout" ? "TRAIN" : "BODY");
    expect(document.getElementById("workspace-TODAY")).toBeNull();
    await expect.poll(() => document.documentElement.dataset.suitMode).toBe("SCHEDULED_SHIFT");
    expect(getComputedStyle(document.documentElement).getPropertyValue("--red").trim()).toBe("#b51219");
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: /Mode ON SHIFT, pinned/ })).toBeVisible();
    expect(document.documentElement.dataset.suitMode).toBe("SCHEDULED_SHIFT");
  });
});

describe("emblem", () => {
  it("goes to TODAY's root from every tab, at the top with its heading focused", async () => {
    const screen = await render(<App />);
    for (const tab of ["TRAIN", "BODY", "COMMAND", "TODAY"]) {
      await screen.getByRole("button", { name: tab, exact: true }).click();
      await expect.poll(current).toContain(tab);
      await expect.poll(() => !!emblem(screen, tab)).toBe(true);
      window.scrollTo(0, 400);
      emblem(screen, tab).click();
      await expect.poll(current).toContain("TODAY");
      await expect.poll(() => window.scrollY).toBe(0);
      await expect.poll(() => document.activeElement?.textContent).toBe("BEYOND // TODAY");
    }
    // A 44px target that doesn't grow the header.
    const box = emblem(screen, "TODAY").getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(emblem(screen, "TODAY").closest(".field-header")!.getBoundingClientRect().height).toBeLessThan(56);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
  });
});

describe("re-tap, back and retention", () => {
  it("re-tapping COMMAND inside a destination returns to its index with the query kept", async () => {
    const screen = await render(<App />);
    await searchCommand(screen, "history");
    await screen.getByRole("button", { name: /^HISTORY COMMAND · / }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // HISTORY" })).toBeVisible();
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND" })).toBeVisible();
    await expect.element(screen.getByRole("searchbox", { name: "Find a screen or action" })).toHaveValue("history");
  });

  it("keeps a Capture draft and COMMAND's query across the emblem, tabs and back", async () => {
    const screen = await render(<App />);
    await openCaptureFromLog(screen);
    await screen.getByRole("textbox", { name: "Capture a thought", exact: true }).fill("Half a thought");
    await searchCommand(screen, "schedule");
    await screen.getByRole("button", { name: /^WORK SCHEDULE / }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // WORK SCHEDULE" })).toBeVisible();
    emblem(screen, "COMMAND").click();
    await expect.poll(current).toContain("TODAY");
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought", exact: true })).toHaveValue("Half a thought");
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "COMMAND // WORK SCHEDULE" })).toBeVisible();
    await screen.getByRole("button", { name: "← BACK TO COMMAND" }).click();
    await expect.element(screen.getByRole("searchbox", { name: "Find a screen or action" })).toHaveValue("schedule");
    await expect.poll(() => document.activeElement?.textContent ?? "").toContain("WORK SCHEDULE");
    expect(await db.captureItems.count()).toBe(0);
  });

  it("keeps an unsaved settings draft through COMMAND search", async () => {
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await screen.getByRole("button", { name: "Open NUTRITION TARGETS", exact: true }).click();
    await screen.getByRole("spinbutton", { name: "Calorie target (kcal/day)" }).fill("1875");
    await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("history");
    await screen.getByRole("button", { name: "Clear search" }).click();
    await expect.element(screen.getByRole("spinbutton", { name: "Calorie target (kcal/day)" })).toHaveValue(1875);
  });

  it("returns to TODAY's place and focus after a LOG trip to BODY", async () => {
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log water" }).click();
    await screen.getByRole("button", { name: "More → BODY water" }).click();
    await expect.poll(current).toContain("BODY");
    await screen.getByRole("button", { name: "RETURN TO TODAY" }).click();
    await expect.poll(current).toContain("TODAY");
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Log water");
  });
});
